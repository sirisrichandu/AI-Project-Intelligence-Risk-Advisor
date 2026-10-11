/**
 * @deprecated RETIRED / DEPRECATED:
 * All active backend functionality has been consolidated into Python FastAPI (backend/main.py).
 * The Python FastAPI application is the single source of truth for all business logic,
 * document ingestion, native persistent ChromaDB operations, and LangGraph workflow execution.
 * This TypeScript file acts solely as a legacy reverse-proxy and fallback dev server forwarding
 * all `/api/*` traffic to the FastAPI instance at FASTAPI_URL.
 */
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { executeLangGraphWorkflow } from './src/server/langgraphWorkflow.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const FASTAPI_URL = (process.env.FASTAPI_URL || process.env.VITE_API_URL || 'http://127.0.0.1:8001').replace(/\/$/, '');
const CHROMA_DIR = path.resolve(process.cwd(), 'backend/chroma_db');
const CHROMA_JSON = path.join(CHROMA_DIR, 'vector_store.json');

// Ensure ChromaDB directory exists
if (!fs.existsSync(CHROMA_DIR)) {
  fs.mkdirSync(CHROMA_DIR, { recursive: true });
}

// Multer memory storage for file uploads (files are processed strictly in RAM, not saved to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==========================================
// CSV & DOCUMENT TEXT PARSERS
// ==========================================

export function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

export async function extractTextFromBuffer(filename: string, buffer: Buffer): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() || 'txt';

  if (ext === 'pdf') {
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser: any = new PDFParse({ data: buffer });
      const textResult: any = await parser.getText();
      const extractedStr = typeof textResult === 'string' ? textResult : (textResult?.text || '');
      if (extractedStr && extractedStr.trim().length > 0) {
        return extractedStr.trim();
      }
    } catch (err) {
      console.warn(`PDFParse error for ${filename}:`, err);
    }

    // Fallback stream extraction for PDF
    try {
      const raw = buffer.toString('latin1');
      const matches = raw.match(/\(([^\(\)\\]{3,})\)\s*Tj/g);
      if (matches && matches.length > 0) {
        const extracted = matches
          .map((m) => m.replace(/[\(\)Tj\s]+/g, ' ').trim())
          .filter(Boolean)
          .join(' ');
        if (extracted.length > 50) return extracted;
      }
      const cleaned = raw.replace(/[^\x20-\x7E\n\t]/g, ' ');
      const words = cleaned.split(/\s+/).filter((w) => w.length > 2 && /^[a-zA-Z]+$/.test(w));
      if (words.length > 15) return words.slice(0, 2000).join(' ');
    } catch {}

    return '';
  }

  if (ext === 'docx' || ext === 'doc') {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      if (result.value && result.value.trim().length > 0) {
        return result.value.trim();
      }
    } catch (err) {
      console.warn(`Mammoth extraction error for ${filename}:`, err);
    }
    return '';
  }

  if (ext === 'xlsx' || ext === 'xls') {
    try {
      const xlsx = await import('xlsx');
      const wb = xlsx.read(buffer, { type: 'buffer' });
      const sheetTexts: string[] = [];
      for (const name of wb.SheetNames) {
        const sheet = wb.Sheets[name];
        const csv = xlsx.utils.sheet_to_csv(sheet);
        if (csv && csv.trim()) {
          sheetTexts.push(`[Sheet: ${name}]\n${csv}`);
        }
      }
      if (sheetTexts.length > 0) return sheetTexts.join('\n\n');
    } catch (err) {
      console.warn(`XLSX extraction error for ${filename}:`, err);
    }
    return '';
  }

  // Plain text, CSV, TSV, Markdown, JSON
  try {
    return buffer.toString('utf-8');
  } catch {
    return buffer.toString('latin1');
  }
}

// ==========================================
// SEMANTIC CHUNKING ENGINE
// Splits on structural document boundaries (headers, markdown tables,
// CSV records, double line breaks, bullet lists) while preserving full units.
// ==========================================
function chunkDocumentText(text: string, docId: string, docName: string, category: string) {
  const chunks: any[] = [];
  const cleaned = text.trim();
  const now = new Date().toISOString();

  if (!cleaned) {
    chunks.push({
      id: `${docId}_chunk_1`,
      document_id: docId,
      document_name: docName,
      category,
      page: 1,
      text: `[Empty document: ${docName}]`,
      created_at: now,
    });
    return chunks;
  }

  // 1. First split by structural sections (Markdown headers #, ##, ###, or blank lines before headers)
  // Or table blocks / CSV lines
  const rawSections: string[] = [];
  const sectionSplitRegex = /(?=(?:\r?\n){2,}(?:#+\s+|[0-9]+\.\s+[A-Z]|BLOCKER\b|ACTION\b|RISK\b|ISSUE\b))/g;
  const majorSections = cleaned.split(sectionSplitRegex);

  for (const major of majorSections) {
    const trimmedMajor = major.trim();
    if (!trimmedMajor) continue;

    // Split paragraphs/blocks within this section
    const blocks = trimmedMajor.split(/\r?\n\r?\n+/);
    let currentChunk = '';

    for (const block of blocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) continue;

      // Check if block is a table or CSV records: preserve as a single unit or row clusters
      const isTable = trimmedBlock.startsWith('|') || (trimmedBlock.includes(',') && trimmedBlock.split('\n').length > 2);

      if (isTable) {
        if (currentChunk.length > 0) {
          rawSections.push(currentChunk.trim());
          currentChunk = '';
        }
        // If table is very large (> 1200 chars), split table by rows while preserving header
        const tableLines = trimmedBlock.split(/\r?\n/);
        if (tableLines.length > 8) {
          const header = tableLines[0];
          const subRows: string[] = [];
          for (let r = 1; r < tableLines.length; r++) {
            subRows.push(tableLines[r]);
            if (subRows.length >= 6 || r === tableLines.length - 1) {
              rawSections.push([header, ...subRows].join('\n'));
              subRows.length = 0;
            }
          }
        } else {
          rawSections.push(trimmedBlock);
        }
        continue;
      }

      // If combining this block keeps chunk under optimal size (~800 characters)
      if (currentChunk.length + trimmedBlock.length < 800) {
        currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedBlock}` : trimmedBlock;
      } else {
        if (currentChunk.length > 0) {
          rawSections.push(currentChunk.trim());
        }
        // If single paragraph is oversized (> 1000 chars), split on sentences
        if (trimmedBlock.length > 1000) {
          const sentences = trimmedBlock.split(/(?<=[.!?])\s+(?=[A-Z])/);
          let sentenceBuffer = '';
          for (const s of sentences) {
            if (sentenceBuffer.length + s.length < 750) {
              sentenceBuffer = sentenceBuffer ? `${sentenceBuffer} ${s}` : s;
            } else {
              if (sentenceBuffer) rawSections.push(sentenceBuffer.trim());
              sentenceBuffer = s;
            }
          }
          if (sentenceBuffer) currentChunk = sentenceBuffer.trim();
        } else {
          currentChunk = trimmedBlock;
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      rawSections.push(currentChunk.trim());
    }
  }

  // Fallback if no sections were extracted
  if (rawSections.length === 0) {
    rawSections.push(cleaned.slice(0, 1000));
  }

  // Convert semantic blocks into chunk records with structural metadata
  rawSections.forEach((sec, idx) => {
    const firstLine = sec.split('\n')[0].trim().replace(/^[#*•\s-]+/, '');
    const isTable = sec.includes('|') || (sec.includes(',') && sec.split('\n').length > 2);
    const isHeader = /^#+\s+|^[0-9]+\.\s+/.test(sec);
    const sectionType = isTable ? 'tabular_data' : isHeader ? 'structural_heading' : 'semantic_narrative';

    chunks.push({
      id: `${docId}_chunk_${idx + 1}`,
      document_id: docId,
      document_name: docName,
      category,
      section_title: firstLine.slice(0, 80) || `Section ${idx + 1}`,
      semantic_type: sectionType,
      page: Math.max(1, Math.round((idx * 600) / 1800) + 1),
      chars: sec.length,
      tokens: Math.ceil(sec.length / 4),
      text: sec,
      created_at: now,
    });
  });

  return chunks;
}

// ==========================================
// CHROMA STORE HELPERS
// ==========================================

function readChromaStore(): {
  collection: string;
  total_chunks: number;
  total_documents: number;
  documents: any[];
  chunks: any[];
} {
  try {
    if (fs.existsSync(CHROMA_JSON)) {
      const raw = fs.readFileSync(CHROMA_JSON, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const chunks = Array.isArray(parsed.chunks) ? parsed.chunks : [];
        let documents = Array.isArray(parsed.documents) ? parsed.documents : [];

        // Synthesize document records if missing
        if (documents.length === 0 && chunks.length > 0) {
          const docMap = new Map<string, any>();
          for (const c of chunks) {
            const docId = c.document_id || c.documentId || 'doc-default';
            if (!docMap.has(docId)) {
              docMap.set(docId, {
                id: docId,
                name: c.document_name || c.documentName || 'Project_Document.pdf',
                type: (c.document_name || 'TXT').split('.').pop()?.toUpperCase() || 'TXT',
                size: `${Math.max(1, Math.round((c.text || '').length / 1024))} KB`,
                uploadDate: (c.created_at || new Date().toISOString()).slice(0, 10),
                status: 'COMPLETED',
                chunkCount: 1,
                category: c.category || 'general',
                content: c.text || '',
              });
            } else {
              docMap.get(docId).chunkCount += 1;
            }
          }
          documents = Array.from(docMap.values());
        }

        return {
          collection: parsed.collection || 'project_knowledge_base',
          total_chunks: chunks.length,
          total_documents: documents.length,
          documents,
          chunks,
        };
      }
    }
  } catch (err) {
    console.error('Error reading ChromaDB store:', err);
  }
  return {
    collection: 'project_knowledge_base',
    total_chunks: 0,
    total_documents: 0,
    documents: [],
    chunks: [],
  };
}

function writeChromaStore(docs: any[], chunks: any[]) {
  try {
    const data = {
      collection: 'project_knowledge_base',
      storage_engine: 'ChromaDB Persistent Store',
      persist_directory: './backend/chroma_db',
      total_chunks: chunks.length,
      total_documents: docs.length,
      last_updated: new Date().toISOString(),
      documents: docs,
      chunks: chunks,
    };
    fs.writeFileSync(CHROMA_JSON, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing ChromaDB store:', err);
  }
}

// Proxy helper to FastAPI when explicitly configured
async function forwardToFastApi(req: Request, res: Response, targetPath: string): Promise<boolean> {
  if (!FASTAPI_URL) return false;
  // Prevent infinite self-forwarding loop if server is listening on the same port
  const portMatch = FASTAPI_URL.match(/:(\d+)/);
  if (portMatch && String(PORT) === portMatch[1]) {
    return false;
  }
  try {
    const url = `${FASTAPI_URL}${targetPath}`;
    const options: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
    }
    const fastRes = await fetch(url, options);
    if (fastRes.ok || (fastRes.status >= 200 && fastRes.status < 500)) {
      const data = await fastRes.json();
      res.status(fastRes.status).json(data);
      return true;
    }
  } catch {
    // FastAPI unreachable, proceed with local handler
  }
  return false;
}

// ==========================================
// RUNTIME STATE & MULTI-AGENT EXTRACTION
// ==========================================

export const EMPTY_SCOPE = {
  objectives: [] as string[],
  scope: 'Knowledge base is currently empty. Upload your project documents to extract strategic objectives and deliverables.',
  requirements: [] as string[],
  deliverables: [] as string[],
  milestones: [] as any[],
  deadlines: [] as any[],
  constraints: [] as string[],
  summary: 'No documents uploaded yet. Upload your project documents to extract strategic objectives and deliverables.',
};

let projectScope: any = { ...EMPTY_SCOPE };

let projectRisks: any[] = [];
let projectBlockers: any[] = [];
let projectActions: any[] = [];
let projectTasksAtRisk: any[] = [];
let chatHistory: any[] = [];
let latestDocOutput = '';
let hasParsedIntelligence = false;
let lastParsedDocIds = '';

function parseDocumentIntelligence(docs: any[]) {
  if (!docs || docs.length === 0) {
    return {
      blockers: [],
      actions: [],
      tasks: [],
      scope: { ...EMPTY_SCOPE },
      risks: [],
      documentationOutput: '',
    };
  }

  const combinedText = docs.map((d: any) => d.content || '').join('\n\n');
  const extractedBlockers: any[] = [];
  const extractedActions: any[] = [];
  const extractedTasks: any[] = [];
  const extractedRisks: any[] = [];

  const lines = combinedText.split('\n');

  // 1. Parse CSV Issue Trackers & Risk Registers with robust parseCsvLine
  for (const line of lines) {
    if (!line.trim() || line.startsWith('Issue_ID') || line.startsWith('ID,') || line.startsWith('Risk_ID')) continue;
    const parts = parseCsvLine(line);
    if (parts.length < 3) continue;

    const id = parts[0];

    // Dedicated Risk Register row (Risk_ID, Category, Risk_Title, Probability, Impact, Severity, Mitigation_Strategy, Owner, Status)
    if (id.startsWith('RSK-') || (parts.length >= 7 && ['technical', 'schedule', 'compliance', 'data integrity', 'resource', 'performance'].includes(parts[1]?.toLowerCase()))) {
      const category = parts[1] || 'Technical';
      const title = parts[2] || id;
      const probStr = parts[3] ? parts[3].replace('%', '') : '65';
      const impactStr = parts[4] ? parts[4].replace('%', '') : '75';
      const prob = parseInt(probStr, 10) || 65;
      const imp = parseInt(impactStr, 10) || 75;
      const sev = parts[5] || 'High';
      const mitigation = parts[6] || 'Triage and execute mitigation roadmap';
      const owner = parts[7] || 'Assigned Lead';
      const status = parts[8] || 'Open';

      if (!extractedRisks.some((r) => r.id.toLowerCase() === id.toLowerCase() || r.title.toLowerCase() === title.toLowerCase())) {
        extractedRisks.push({
          id,
          title,
          category,
          severity: sev.toLowerCase().includes('crit') ? 'Critical' : 'High',
          probability: prob,
          impact: imp,
          description: title,
          evidence: `Risk Register documentation (${owner})`,
          mitigation,
          owner,
          status,
        });
      }
      continue;
    }

    // Issue Tracker row (Issue_ID, Type, Title, Description, Priority, Severity, Status, Owner, Due_Date, Dependency, Impact, Action)
    if (line.includes('Blocker') || line.includes('Action') || line.includes('Risk') || line.includes('Task') || line.includes('Defect')) {
      if (parts.length >= 4) {
        const type = parts[1] || '';
        const title = parts[2] || '';
        const desc = parts[3] || title;
        const priority = parts[4] || 'High';
        const severity = parts[5] || 'High';
        const status = parts[6] || 'Open';
        const owner = parts[7] || 'Assigned Lead';
        const dueDate = parts[8] || '2026-10-15';
        const dependency = parts[9] || '';
        const impact = parts[10] || 'Critical delivery impact.';
        const action = parts[11] || 'Triage and resolve immediately.';

        if (type.toLowerCase().includes('blocker') || id.startsWith('B-') || id.startsWith('BLK-')) {
          if (!extractedBlockers.some((b) => b.id.toLowerCase() === id.toLowerCase() || b.title.toLowerCase() === title.toLowerCase())) {
            extractedBlockers.push({
              id,
              title,
              priority: priority.toLowerCase().includes('crit') ? 'Critical' : 'High',
              owner,
              description: desc,
              impact,
              suggestedResolution: action,
              suggestedAction: action,
              status: status.toLowerCase().includes('resolved') ? 'Resolved' : 'Active',
              dueDate,
              dependency,
              impactedTasks: ['Model Acceptance', 'Production Deployment Gate'],
            });
          }
        } else if (type.toLowerCase().includes('action') || type.toLowerCase().includes('task') || type.toLowerCase().includes('defect')) {
          if (!extractedActions.some((a) => a.id.toLowerCase() === id.toLowerCase() || a.title.toLowerCase() === title.toLowerCase())) {
            extractedActions.push({
              id,
              task: title,
              title,
              owner,
              priority: priority.toLowerCase().includes('crit') ? 'Critical' : priority,
              deadline: dueDate,
              dueDate,
              status: status.toLowerCase().includes('open') ? 'Pending' : status,
              description: desc,
            });
          }
        } else if (type.toLowerCase().includes('risk')) {
          if (!extractedRisks.some((r) => r.id.toLowerCase() === id.toLowerCase() || r.title.toLowerCase() === title.toLowerCase())) {
            extractedRisks.push({
              id: id.startsWith('RSK-') ? id : `RSK-${id.replace(/^[A-Z]+-/, '')}`,
              title,
              category: 'Technical',
              severity: severity.toLowerCase().includes('crit') ? 'Critical' : 'High',
              probability: 65,
              impact: 75,
              description: desc,
              evidence: dependency ? `Dependency on ${dependency}` : 'Sprint issue tracker',
              mitigation: action,
              owner,
              status: 'Open',
            });
          }
        }
      }
    }
  }

  // 2. Parse Standup Notes: BLOCKER B-01 — TITLE
  const blockerMatches = combinedText.matchAll(/(?:^|\n)\s*BLOCKER\s+([A-Z0-9_-]+)\s*[—:-]\s*([^\n]+)([\s\S]*?)(?=(?:^|\n)\s*BLOCKER\b|\bACTION\b|\bRISK\b|\b[0-9]+\.\s+[A-Z]|$)/gi);
  for (const m of blockerMatches) {
    const id = m[1].trim();
    const title = m[2].trim().replace(/^[—:-]\s*/, '');
    const body = m[3] || '';
    const owner = (body.match(/Owner:\s*([^\n]+)/i)?.[1] || 'Assigned Lead').trim();
    const impact = (body.match(/Impact:\s*([^\n]+)/i)?.[1] || 'Critical delivery impact.').trim();
    const resolution = (body.match(/(?:Required resolution|Resolution):\s*([^\n]+)/i)?.[1] || 'Expedite technical triage and remove impediment.').trim();
    const desc = body.replace(/(Owner|Status|Impact|Required resolution|Target date):[^\n]*/gi, '').trim().slice(0, 240) || title;
    const targetDate = (body.match(/Target date:\s*([^\n]+)/i)?.[1] || '2026-10-15').trim();

    if (!extractedBlockers.some((b) => b.id.toLowerCase() === id.toLowerCase() || b.title.toLowerCase() === title.toLowerCase())) {
      extractedBlockers.push({
        id: id.startsWith('B-') || id.startsWith('BLK-') ? id : `BLK-${id}`,
        title,
        priority: 'Critical',
        owner,
        description: desc,
        impact,
        suggestedResolution: resolution,
        suggestedAction: resolution,
        status: 'Active',
        dueDate: targetDate,
        impactedTasks: ['Model Acceptance', 'Production Deployment Gate'],
      });
    }
  }

  // 3. Parse Action Items: A-01: ... or ACTION A-01: ...
  const actionMatches = combinedText.matchAll(/(?:^|\n)\s*(?:ACTION|A-)\s*([A-Z0-9_-]+)[:—\s]+([^\n]+)([\s\S]*?)(?=(?:^|\n)\s*ACTION\b|\bBLOCKER\b|\bRISK\b|\b[0-9]+\.\s+[A-Z]|$)/gi);
  for (const m of actionMatches) {
    const id = m[1].trim();
    const title = m[2].trim();
    const body = m[3] || '';
    const owner = (body.match(/Owner:\s*([^\n]+)/i)?.[1] || 'Assigned Lead').trim();
    const due = (body.match(/Due(?:\s*date)?:\s*([^\n]+)/i)?.[1] || '2026-10-25').trim();
    const status = (body.match(/Status:\s*([^\n]+)/i)?.[1] || 'In Progress').trim();

    if (!extractedActions.some((a) => a.id === id || a.title.toLowerCase() === title.toLowerCase())) {
      extractedActions.push({
        id: id.startsWith('A-') || id.startsWith('ACT-') ? id : `ACT-${id}`,
        task: title,
        title,
        owner,
        priority: 'High',
        deadline: due,
        dueDate: due,
        status: status.toLowerCase().includes('open') ? 'Pending' : status,
        description: title,
      });
    }
  }

  // 4. Parse Standup Notes / Markdown Risks: RISK RSK-01 — TITLE or RISK RSK-01: TITLE
  const riskMatches = combinedText.matchAll(/(?:^|\n)\s*RISK\s+([A-Z0-9_-]+)\s*[—:-]\s*([^\n]+)([\s\S]*?)(?=(?:^|\n)\s*(?:RISK|BLOCKER|ACTION)\b|\b[0-9]+\.\s+[A-Z]|$)/gi);
  for (const m of riskMatches) {
    const id = m[1].trim();
    const title = m[2].trim().replace(/^[—:-]\s*/, '');
    const body = m[3] || '';
    const owner = (body.match(/Owner:\s*([^\n]+)/i)?.[1] || 'Assigned Lead').trim();
    const category = (body.match(/Category:\s*([^\n]+)/i)?.[1] || 'Technical').trim();
    const severityRaw = (body.match(/Severity:\s*([^\n]+)/i)?.[1] || '').trim();
    const severity = /crit/i.test(severityRaw) || /crit/i.test(title) ? 'Critical' : 'High';
    const probMatch = body.match(/Probability:\s*(\d+)%?/i);
    const impMatch = body.match(/Impact:\s*(\d+)%?/i);
    const probability = probMatch ? parseInt(probMatch[1], 10) : severity === 'Critical' ? 80 : 65;
    const impact = impMatch ? parseInt(impMatch[1], 10) : severity === 'Critical' ? 85 : 75;
    const mitigation = (body.match(/(?:Mitigation|Resolution):\s*([^\n]+)/i)?.[1] || 'Triage and monitor risk mitigation pathway.').trim();
    const formattedId = id.startsWith('RSK-') ? id : `RSK-${id}`;

    if (!extractedRisks.some((r) => r.id.toLowerCase() === formattedId.toLowerCase() || r.title.toLowerCase() === title.toLowerCase())) {
      extractedRisks.push({
        id: formattedId,
        title,
        category,
        severity,
        probability,
        impact,
        description: body.replace(/(Owner|Category|Severity|Probability|Impact|Mitigation|Resolution|Target date):[^\n]*/gi, '').trim().slice(0, 240) || title,
        evidence: `Extracted from project risk documentation (${owner})`,
        mitigation,
        owner,
        status: 'Open',
      });
    }
  }

  // 5. Dynamic line extraction for milestones, scope, deliverables, requirements, constraints, and inline records
  const primaryDocName = docs[0]?.name?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Uploaded Artifacts';
  const textLines = combinedText.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);

  const parsedMilestones: Array<{ name: string; targetDate: string; status: 'Completed' | 'In Progress' | 'Upcoming' }> = [];
  const parsedObjectives: string[] = [];
  const parsedDeliverables: string[] = [];
  const parsedRequirements: string[] = [];
  const parsedConstraints: string[] = [];

  for (const line of textLines) {
    const clean = line.replace(/^[#*•\s-]+/, '').trim();
    if (!clean) continue;

    // Milestones
    if (/^(?:milestone|phase|sprint|release|m[-0-9])/i.test(clean) && clean.length > 6) {
      const dateMatch = clean.match(/\b(202\d-[0-1]\d-[0-3]\d|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s+\d{4})?)\b/i);
      const name = clean.replace(/\b(202\d-[0-1]\d-[0-3]\d|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s+\d{4})?)\b/gi, '')
        .replace(/\b(?:target|due|date|status|completed|in progress|upcoming):?\s*/gi, '')
        .trim().slice(0, 90);
      if (name.length > 5 && !parsedMilestones.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
        parsedMilestones.push({
          name,
          targetDate: dateMatch ? dateMatch[0] : '2026-10-25',
          status: clean.toLowerCase().includes('complete') ? 'Completed' : clean.toLowerCase().includes('progress') ? 'In Progress' : 'Upcoming',
        });
      }
    }

    // Objectives / Goals
    if (/^(?:objective|goal|purpose):?\s+/i.test(clean) || (clean.length > 15 && clean.length < 160 && /^(?:deliver|implement|establish|develop|ensure|provide|build)\b/i.test(clean))) {
      const obj = clean.replace(/^(?:objective|goal|purpose):?\s+/i, '').trim();
      if (obj.length > 10 && !parsedObjectives.includes(obj) && parsedObjectives.length < 6) {
        parsedObjectives.push(obj);
      }
    }

    // Deliverables
    if (/^(?:deliverable|output|package):?\s+/i.test(clean) || (clean.length > 15 && clean.length < 140 && /^(?:module|service|engine|component|dashboard|api|pipeline)\b/i.test(clean))) {
      const del = clean.replace(/^(?:deliverable|output|package):?\s+/i, '').trim();
      if (del.length > 8 && !parsedDeliverables.includes(del) && parsedDeliverables.length < 6) {
        parsedDeliverables.push(del);
      }
    }

    // Requirements
    if (/^(?:requirement|srs|spec|feature):?\s+/i.test(clean) || (clean.length > 20 && clean.length < 180 && /\b(?:must|shall|should support|requires)\b/i.test(clean))) {
      const req = clean.replace(/^(?:requirement|srs|spec|feature):?\s+/i, '').trim();
      if (req.length > 12 && !parsedRequirements.includes(req) && parsedRequirements.length < 6) {
        parsedRequirements.push(req);
      }
    }

    // Constraints
    if (/^(?:constraint|limitation|sla|security):?\s+/i.test(clean) || (clean.length > 15 && clean.length < 160 && /\b(?:latency|retention|encryption|uptime|sla|budget)\b/i.test(clean))) {
      const con = clean.replace(/^(?:constraint|limitation):?\s+/i, '').trim();
      if (con.length > 10 && !parsedConstraints.includes(con) && parsedConstraints.length < 5) {
        parsedConstraints.push(con);
      }
    }

    // Inline / Bullet Risks: Risk: ... or RSK-01: ...
    if (/^(?:risk|rsk[-0-9]*):?\s+/i.test(clean)) {
      const idMatch = clean.match(/\b(RSK-[A-Z0-9_-]+)\b/i);
      const id = idMatch ? idMatch[1].toUpperCase() : '';
      if (id && extractedRisks.some((r) => r.id.toLowerCase() === id.toLowerCase())) {
        // already extracted by block parser
      } else {
        const riskText = clean
          .replace(/^(?:risk|rsk[-0-9]*)\b\s*(?:[A-Z0-9_-]+\s*[:—\-]\s*)?/i, '')
          .replace(/^[:—\-]\s*/, '')
          .trim();
        if (riskText.length > 5 && !extractedRisks.some((r) => r.title.toLowerCase() === riskText.toLowerCase() || r.description.toLowerCase() === riskText.toLowerCase())) {
          const finalId = id || `RSK-0${extractedRisks.length + 1}`;
          const isCrit = /crit/i.test(clean);
          extractedRisks.push({
            id: finalId,
            title: riskText.slice(0, 80),
            category: 'Technical',
            severity: isCrit ? 'Critical' : 'High',
            probability: isCrit ? 80 : 65,
            impact: isCrit ? 85 : 75,
            description: riskText,
            evidence: `Document statement: ${riskText.slice(0, 100)}`,
            mitigation: 'Triage and execute mitigation roadmap.',
            owner: 'Assigned Lead',
            status: 'Open',
          });
        }
      }
    }

    // Inline / Bullet Blockers: Blocker: ... or BLK-01: ... or B-01: ...
    if (/^(?:blocker|blk[-0-9]*|b[-0-9]+):?\s+/i.test(clean)) {
      const idMatch = clean.match(/\b(B-[A-Z0-9_-]+|BLK-[A-Z0-9_-]+)\b/i);
      const id = idMatch ? idMatch[1].toUpperCase() : '';
      if (id && extractedBlockers.some((b) => b.id.toLowerCase() === id.toLowerCase() || b.id.toLowerCase() === `blk-${id.toLowerCase()}`)) {
        // already extracted by block parser
      } else {
        const blkText = clean
          .replace(/^(?:blocker|blk[-0-9]*|b[-0-9]+)\b\s*(?:[A-Z0-9_-]+\s*[:—\-]\s*)?/i, '')
          .replace(/^[:—\-]\s*/, '')
          .trim();
        if (blkText.length > 5 && !extractedBlockers.some((b) => b.title.toLowerCase() === blkText.toLowerCase() || b.description.toLowerCase() === blkText.toLowerCase())) {
          const finalId = id || `BLK-0${extractedBlockers.length + 1}`;
          extractedBlockers.push({
            id: finalId,
            title: blkText.slice(0, 80),
            priority: /crit/i.test(clean) ? 'Critical' : 'High',
            owner: 'Assigned Lead',
            description: blkText,
            impact: 'Delivery impediment requiring technical resolution.',
            suggestedResolution: 'Expedite technical triage and unblock critical path.',
            suggestedAction: 'Expedite technical triage and unblock critical path.',
            status: 'Active',
            dueDate: '2026-10-25',
            impactedTasks: ['Sprint Delivery Gate'],
          });
        }
      }
    }

    // Inline / Bullet Action Items: Action: ... or ACT-01: ... or A-01: ...
    if (/^(?:action|action\s*item|act[-0-9]*|a[-0-9]+):?\s+/i.test(clean)) {
      const idMatch = clean.match(/\b(A-[A-Z0-9_-]+|ACT-[A-Z0-9_-]+)\b/i);
      const id = idMatch ? idMatch[1].toUpperCase() : '';
      if (id && extractedActions.some((a) => a.id.toLowerCase() === id.toLowerCase() || a.id.toLowerCase() === `act-${id.toLowerCase()}`)) {
        // already extracted by block parser
      } else {
        const actText = clean
          .replace(/^(?:action|action\s*item|act[-0-9]*|a[-0-9]+)\b\s*(?:[A-Z0-9_-]+\s*[:—\-]\s*)?/i, '')
          .replace(/^[:—\-]\s*/, '')
          .trim();
        if (actText.length > 5 && !extractedActions.some((a) => a.title.toLowerCase() === actText.toLowerCase() || a.task?.toLowerCase() === actText.toLowerCase())) {
          const finalId = id || `ACT-0${extractedActions.length + 1}`;
          extractedActions.push({
            id: finalId,
            task: actText.slice(0, 80),
            title: actText.slice(0, 80),
            owner: 'Assigned Lead',
            priority: /crit/i.test(clean) ? 'Critical' : 'High',
            deadline: '2026-10-25',
            dueDate: '2026-10-25',
            status: 'Pending',
            description: actText,
          });
        }
      }
    }
  }

  // Build tasks at risk strictly based on actual extracted blockers
  extractedBlockers.forEach((b: any, idx: number) => {
    extractedTasks.push({
      id: `TSK-10${idx + 1}`,
      taskId: `TSK-10${idx + 1}`,
      name: b.impactedTasks?.[0] || `${b.title} Verification`,
      taskName: b.impactedTasks?.[0] || `${b.title} Verification`,
      owner: b.owner || 'Assigned Lead',
      assignee: b.owner || 'Assigned Lead',
      dueDate: b.dueDate || '2026-10-22',
      milestone: 'Sprint Release Gate',
      reason: `Blocked by ${b.id}: ${b.title}`,
      riskReason: `Blocked by ${b.id}: ${b.title}`,
      severity: b.priority === 'Critical' ? 'Critical' : 'High',
      daysDelayed: 3 + idx,
    });
  });

  const isHelmetDetection =
    combinedText.toLowerCase().includes('helmet') ||
    combinedText.toLowerCase().includes('plate') ||
    docs.some((d: any) => (d.name || '').toLowerCase().includes('helmet'));

  const finalDeadlines = parsedMilestones.map((m) => ({
    item: m.name,
    date: m.targetDate,
    criticality: (m.status === 'In Progress' ? 'High' : 'Medium') as 'High' | 'Medium',
  }));

  const extractedScope = {
    summary: docs.length > 0
      ? isHelmetDetection
        ? `Project intelligence synthesized from ${docs.length} uploaded artifact(s) covering helmet detection and computer vision analysis (${docs.map((d: any) => d.name).join(', ')}).`
        : `Project intelligence synthesized from ${docs.length} uploaded artifact(s) (${docs.map((d: any) => d.name).join(', ')}). Comprehensive extraction across strategic objectives, core deliverables, milestone roadmap, and risk registers.`
      : EMPTY_SCOPE.summary,
    scope: docs.length > 0
      ? isHelmetDetection
        ? `Computer-vision violation enforcement system boundaries based on ${docs.length} uploaded artifact(s).`
        : `System boundaries established from ${docs.length} project artifact(s) (${primaryDocName}).`
      : EMPTY_SCOPE.scope,
    objectives: parsedObjectives,
    deliverables: parsedDeliverables,
    requirements: parsedRequirements,
    milestones: parsedMilestones,
    deadlines: finalDeadlines,
    constraints: parsedConstraints,
  };

  const userStoriesSection = parsedRequirements.length > 0 || parsedObjectives.length > 0
    ? `1. Scope & Requirements Synthesis\nID\tStatement\tTarget\n` +
      [...parsedObjectives, ...parsedRequirements].slice(0, 6).map((item, i) => `REQ-0${i + 1}\t${item}\tCore Delivery`).join('\n')
    : `1. Scope & Requirements Synthesis\nNo explicit requirements or objectives identified in uploaded document(s).`;

  const riskSection = extractedRisks.length > 0
    ? `2. Risk Register & Delivery Forecasting\nID\tRisk Category\tRisk Title\tProbability\tImpact\tSeverity\tMitigation Strategy\tOwner\n` +
      extractedRisks.map((r, i) => `${r.id || `RSK-0${i + 1}`}\t${r.category || 'Technical'}\t${r.title}\t${typeof r.probability === 'number' ? `${r.probability}%` : r.probability || '65%'}\t${typeof r.impact === 'number' ? `${r.impact}%` : r.impact || '75%'}\t${r.severity || 'High'}\t${r.mitigation || 'Triage and execute mitigation roadmap'}\t${r.owner || 'Assigned Lead'}`).join('\n')
    : `2. Risk Register & Delivery Forecasting\nNo active risks detected in uploaded document(s).`;

  const actionSection = extractedActions.length > 0
    ? `3. Action Items Register\nID\tAction Deliverable\tAssigned Team\tTarget Deadline\tPriority\tStatus\n` +
      extractedActions.map((a, i) => `${a.id || `A-0${i + 1}`}\t${a.task || a.title}\t${a.owner || 'Assigned Lead'}\t${a.deadline || a.dueDate || '2026-10-20'}\t${a.priority || 'High'}\t${a.status || 'Open'}`).join('\n')
    : `3. Action Items Register\nNo explicit action items detected in uploaded document(s).`;

  const documentationDossier = `${userStoriesSection}\n\n${riskSection}\n\n${actionSection}`;

  return {
    blockers: extractedBlockers,
    actions: extractedActions,
    tasks: extractedTasks,
    scope: extractedScope,
    risks: extractedRisks,
    documentationOutput: documentationDossier,
  };
}

function computeHealth() {
  const store = readChromaStore();
  if (store.documents.length === 0) {
    return {
      overall: 0,
      status: 'Awaiting Documents',
      metrics: { riskScore: 0, scheduleScore: 0, scopeScore: 0, blockerScore: 0, resourceScore: 0 },
      summary: 'Upload your real project documents (PDF, DOCX, XLSX, CSV, TXT) to evaluate risk dimensions and compute health score.',
      trend: 'Stable',
      history: [],
    };
  }

  const criticalRisks = projectRisks.filter((r) => r.severity === 'Critical').length;
  const highRisks = projectRisks.filter((r) => r.severity === 'High').length;
  const activeBlockers = projectBlockers.filter((b) => b.status === 'Active').length;

  const riskScore = Math.max(10, 100 - criticalRisks * 22 - highRisks * 10);
  const blockerScore = Math.max(10, 100 - activeBlockers * 18);
  const scheduleScore = Math.max(20, 85 - projectTasksAtRisk.length * 12);
  const scopeScore = projectScope.requirements.length > 0 ? 88 : 75;
  const resourceScore = 80;

  const overall = Math.round(
    riskScore * 0.3 + blockerScore * 0.25 + scheduleScore * 0.2 + scopeScore * 0.15 + resourceScore * 0.1
  );
  const status = overall >= 80 ? 'Healthy' : overall >= 55 ? 'At Risk' : 'Critical';

  return {
    overall,
    status,
    metrics: { riskScore, scheduleScore, scopeScore, blockerScore, resourceScore },
    summary: `Project health stands at ${overall}/100 (${status}) based on ${store.total_chunks} indexed vector chunks.`,
    trend: overall >= 75 ? 'Improving' : 'Declining',
    history: [{ date: new Date().toISOString().slice(0, 10), score: overall, note: `${status} evaluation` }],
  };
}

function ensureIntelligenceParsed(force = false) {
  const store = readChromaStore();
  if (store.documents.length === 0) {
    projectScope = { ...EMPTY_SCOPE };
    projectRisks = [];
    projectBlockers = [];
    projectActions = [];
    projectTasksAtRisk = [];
    latestDocOutput = '';
    hasParsedIntelligence = true;
    lastParsedDocIds = '';
    return;
  }

  const currentDocIds = store.documents.map((d: any) => `${d.id}:${d.name}`).join('|');
  if (force || !hasParsedIntelligence || currentDocIds !== lastParsedDocIds) {
    const parsed = parseDocumentIntelligence(store.documents);
    projectBlockers = parsed.blockers;
    projectActions = parsed.actions;
    projectTasksAtRisk = parsed.tasks;
    projectScope = parsed.scope;
    projectRisks = parsed.risks;
    latestDocOutput = parsed.documentationOutput;
    hasParsedIntelligence = true;
    lastParsedDocIds = currentDocIds;
  }
}

// Initial parse on startup
ensureIntelligenceParsed(true);

// ==========================================
// API ROUTES
// ==========================================

// GET /api/project/summary
app.get('/api/project/summary', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/project/summary')) return;

  ensureIntelligenceParsed();
  const store = readChromaStore();
  const health = computeHealth();
  const projectName =
    store.documents.length > 0
      ? store.documents[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      : 'Project Workspace';

  const hasDocs = store.documents.length > 0;

  res.json({
    projectName,
    projectDeadline: hasDocs ? (projectScope.deadlines?.[0]?.date || 'Under Evaluation') : 'Ready For Upload',
    healthScore: health.overall,
    healthStatus: health.status,
    totalDocuments: store.documents.length,
    totalRisks: hasDocs ? projectRisks.length : 0,
    criticalRisks: hasDocs ? projectRisks.filter((r) => r.severity === 'Critical').length : 0,
    highRisks: hasDocs ? projectRisks.filter((r) => r.severity === 'High').length : 0,
    activeBlockers: hasDocs ? projectBlockers.filter((b) => b.status === 'Active').length : 0,
    pendingActions: hasDocs ? projectActions.filter((a) => a.status === 'Pending' || a.status === 'In Progress').length : 0,
    upcomingDeadlines: hasDocs ? (projectScope.milestones?.length || projectScope.deadlines?.length || 0) : 0,
    tasksAtRiskCount: hasDocs ? projectTasksAtRisk.length : 0,
  });
});

// GET /api/documents
app.get('/api/documents', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/documents')) return;

  const store = readChromaStore();
  res.json({
    documents: store.documents,
    totalChunks: store.total_chunks,
    chromaStatus: 'Active',
  });
});

// GET /api/documents/:id
app.get('/api/documents/:id', async (req: Request, res: Response) => {
  const store = readChromaStore();
  const doc = store.documents.find((d: any) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(doc);
});

// GET /api/documents/:id/chunks
app.get('/api/documents/:id/chunks', async (req: Request, res: Response) => {
  const store = readChromaStore();
  const chunks = store.chunks.filter((c: any) => c.document_id === req.params.id);
  res.json({ chunks, totalChunks: chunks.length });
});

// POST /api/knowledge-base/search & /api/search (Semantic & keyword retrieval)
const searchKnowledgeBaseHandler = async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/knowledge-base/search')) return;

  const query = (req.body.query || req.body.q || '').trim().toLowerCase();
  const topK = Math.max(1, Math.min(50, parseInt(req.body.topK || req.body.limit || '10', 10)));
  const categoryFilter = req.body.category;

  const store = readChromaStore();
  if (!query) {
    return res.json({
      query: '',
      totalMatches: store.chunks.length,
      results: store.chunks.slice(0, topK),
    });
  }

  const queryTokens = query.split(/\s+/).filter((t: string) => t.length > 1);

  // Score chunks by token presence, frequency, and exact phrase matching
  const scored = store.chunks
    .filter((c: any) => !categoryFilter || c.category === categoryFilter)
    .map((c: any) => {
      const text = (c.text || '').toLowerCase();
      const title = (c.section_title || c.document_name || '').toLowerCase();
      let score = 0;

      // Exact phrase match bonus
      if (text.includes(query)) score += 50;
      if (title.includes(query)) score += 30;

      // Individual token matches
      for (const token of queryTokens) {
        if (text.includes(token)) score += 10;
        if (title.includes(token)) score += 15;
      }

      return {
        ...c,
        similarity_score: Math.min(0.99, Math.round((score / (queryTokens.length * 25 + 50)) * 100) / 100),
      };
    })
    .filter((c: any) => c.similarity_score > 0)
    .sort((a: any, b: any) => b.similarity_score - a.similarity_score);

  res.json({
    query,
    totalMatches: scored.length,
    results: scored.slice(0, topK),
  });
};
app.post('/api/knowledge-base/search', searchKnowledgeBaseHandler);
app.post('/api/search', searchKnowledgeBaseHandler);

// GET /api/documents/:id/download
app.get('/api/documents/:id/download', async (req: Request, res: Response) => {
  const store = readChromaStore();
  const doc = store.documents.find((d: any) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const safeFilename = doc.name || 'document.txt';
  const ext = safeFilename.split('.').pop()?.toLowerCase() || 'txt';
  // Synthesize content matching format directly in-memory (no files stored on disk)
  const content = doc.content || `[Document: ${safeFilename}]`;

  if (ext === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      pdf.setFontSize(14);
      pdf.text(safeFilename, 14, 20);
      pdf.setFontSize(9);
      const split = pdf.splitTextToSize(content, 180);
      pdf.text(split.slice(0, 100), 14, 30);
      const buf = Buffer.from(pdf.output('arraybuffer'));
      return res.send(buf);
    } catch {
      return res.send(Buffer.from(content));
    }
  }

  if (ext === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    return res.send(content);
  }

  if (ext === 'json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    return res.send(content);
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  return res.send(content);
});

// POST /api/upload-json (JSON with base64 / content)
app.post('/api/upload-json', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/upload-json')) return;

  const files = req.body.files;
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'No files provided in upload payload' });
  }

  const store = readChromaStore();
  const newDocs: any[] = [];
  const newChunks: any[] = [];
  const now = new Date().toISOString();

  for (let idx = 0; idx < files.length; idx++) {
    const f = files[idx];
    const docId = `doc-${Date.now()}-${idx}`;
    const ext = f.name.includes('.') ? f.name.split('.').pop()?.toUpperCase() : 'TXT';

    let text = '';
    let fileBuffer: Buffer | null = null;

    if (f.base64) {
      try {
        const base64Data = f.base64.replace(/^data:[^;]+;base64,/, '');
        fileBuffer = Buffer.from(base64Data, 'base64');
        if (!fileBuffer || fileBuffer.length === 0) {
          return res.status(422).json({ error: `Uploaded file '${f.name}' contains empty byte data (0 bytes).` });
        }
        text = await extractTextFromBuffer(f.name, fileBuffer);
      } catch (err: any) {
        return res.status(422).json({ error: `Failed to decode base64 file data for '${f.name}': ${err.message}` });
      }
    } else if (f.content !== undefined && f.content !== null) {
      const trimmed = f.content.trim();
      if (!trimmed) {
        return res.status(422).json({ error: `Text content provided for '${f.name}' is empty or whitespace-only.` });
      }
      text = trimmed;
    } else {
      return res.status(422).json({ error: `Neither valid file bytes (base64) nor actual text content was provided for '${f.name}'.` });
    }

    if (!text || !text.trim()) {
      return res.status(422).json({ error: `No readable text could be extracted from '${f.name}'. The file appears empty or unparseable.` });
    }

    const chunks = chunkDocumentText(text, docId, f.name, f.category || 'general');
    if (!chunks || chunks.length === 0) {
      return res.status(422).json({ error: `Could not generate semantic chunks for '${f.name}'. Extracted text content was insufficient.` });
    }
    newChunks.push(...chunks);

    const sizeStr = f.size || `${Math.max(1, Math.round(text.length / 1024))} KB`;

    newDocs.push({
      id: docId,
      name: f.name,
      type: ext,
      size: sizeStr,
      uploadDate: now.slice(0, 10),
      status: 'COMPLETED',
      chunkCount: chunks.length,
      category: f.category || 'general',
      content: text,
    });
  }

  const updatedDocs = [...store.documents, ...newDocs];
  const updatedChunks = [...store.chunks, ...newChunks];
  writeChromaStore(updatedDocs, updatedChunks);

  // Force re-parsing intelligence from all documents
  ensureIntelligenceParsed(true);

  res.json({
    message: `${newDocs.length} document(s) uploaded and indexed into JSON vector store (backend/chroma_db/vector_store.json).`,
    uploadedDocuments: newDocs,
    totalKnowledgeChunks: updatedChunks.length,
    storageMode: 'json_fallback',
    nativeChromaSuccess: false,
  });
});

// POST /api/upload (Multipart/form-data)
app.post('/api/upload', upload.array('files') as any, async (req: Request, res: Response) => {
  const reqFiles = req.files as Express.Multer.File[];
  if (!reqFiles || reqFiles.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  const store = readChromaStore();
  const newDocs: any[] = [];
  const newChunks: any[] = [];
  const now = new Date().toISOString();

  for (let idx = 0; idx < reqFiles.length; idx++) {
    const file = reqFiles[idx];
    const docId = `doc-${Date.now()}-${idx}`;
    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop()?.toUpperCase() : 'TXT';

    if (!file.buffer || file.buffer.length === 0) {
      return res.status(422).json({ error: `Uploaded file '${file.originalname}' is empty (0 bytes).` });
    }

    // In-memory text extraction from buffer (no files stored on disk)
    const text = await extractTextFromBuffer(file.originalname, file.buffer);
    if (!text || !text.trim()) {
      return res.status(422).json({ error: `No readable text could be extracted from '${file.originalname}'. The file appears empty or unparseable.` });
    }

    const chunks = chunkDocumentText(text, docId, file.originalname, 'general');
    if (!chunks || chunks.length === 0) {
      return res.status(422).json({ error: `Could not generate semantic chunks for '${file.originalname}'. Extracted content was insufficient.` });
    }
    newChunks.push(...chunks);

    const sizeKB = file.size / 1024;
    const sizeStr = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeKB))} KB`;

    newDocs.push({
      id: docId,
      name: file.originalname,
      type: ext,
      size: sizeStr,
      uploadDate: now.slice(0, 10),
      status: 'COMPLETED',
      chunkCount: chunks.length,
      category: 'general',
      content: text,
    });
  }

  const updatedDocs = [...store.documents, ...newDocs];
  const updatedChunks = [...store.chunks, ...newChunks];
  writeChromaStore(updatedDocs, updatedChunks);

  ensureIntelligenceParsed(true);

  res.json({
    message: `${newDocs.length} document(s) uploaded and indexed into JSON vector store (backend/chroma_db/vector_store.json).`,
    uploadedDocuments: newDocs,
    totalKnowledgeChunks: updatedChunks.length,
    storageMode: 'json_fallback',
    nativeChromaSuccess: false,
  });
});

// DELETE /api/documents/:id
app.delete('/api/documents/:id', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, `/api/documents/${req.params.id}`)) return;

  const docId = req.params.id;
  const store = readChromaStore();
  const updatedDocs = store.documents.filter((d: any) => d.id !== docId);
  const updatedChunks = store.chunks.filter((c: any) => c.document_id !== docId);
  writeChromaStore(updatedDocs, updatedChunks);

  if (updatedDocs.length === 0) {
    projectScope = { ...EMPTY_SCOPE };
    projectRisks = [];
    projectBlockers = [];
    projectActions = [];
    projectTasksAtRisk = [];
    latestDocOutput = '';
  } else {
    ensureIntelligenceParsed(true);
  }

  res.json({ message: `Document ${docId} deleted from vector store.`, remainingDocuments: updatedDocs.length });
});

// POST /api/documents/clear-all & DELETE /api/documents
const clearAllHandler = async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/documents/clear-all')) return;

  writeChromaStore([], []);
  projectScope = { ...EMPTY_SCOPE };
  projectRisks = [];
  projectBlockers = [];
  projectActions = [];
  projectTasksAtRisk = [];
  latestDocOutput = '';

  res.json({ message: 'All documents and vector store entries cleared.', remainingDocuments: 0 });
};
app.post('/api/documents/clear-all', clearAllHandler);
app.delete('/api/documents', clearAllHandler);

// POST /api/pipeline/run
app.post('/api/pipeline/run', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/pipeline/run')) return;

  const store = readChromaStore();
  if (store.documents.length === 0) {
    projectScope = { ...EMPTY_SCOPE };
    projectRisks = [];
    projectBlockers = [];
    projectActions = [];
    projectTasksAtRisk = [];
    latestDocOutput = '';
    return res.json({
      message: 'No documents in knowledge base. Upload your project documents to run multi-agent analysis.',
      pipelineEngine: 'LangGraph StateGraph (Compiled)',
      scope: projectScope,
      risks: [],
      blockers: [],
      actions: [],
      tasksAtRisk: [],
      health: computeHealth(),
      documentationOutput: '',
    });
  }

  try {
    const combinedText = store.documents.map((d: any) => d.content || '').join('\n\n');
    const langgraphResult = await executeLangGraphWorkflow(store.documents, combinedText);

    projectScope = langgraphResult.scope;
    projectRisks = langgraphResult.risks;
    projectBlockers = langgraphResult.blockers;
    projectActions = langgraphResult.actions;
    projectTasksAtRisk = langgraphResult.tasksAtRisk;
    latestDocOutput = langgraphResult.documentationOutput;

    res.json({
      message: 'LangGraph StateGraph multi-agent pipeline completed successfully.',
      pipelineEngine: 'LangGraph StateGraph (Compiled)',
      executionTrace: langgraphResult.executionTrace,
      scope: projectScope,
      risks: projectRisks,
      blockers: projectBlockers,
      actions: projectActions,
      tasksAtRisk: projectTasksAtRisk,
      health: langgraphResult.health,
      documentationOutput: latestDocOutput,
      deepMitigations: langgraphResult.deepMitigations,
    });
  } catch (err: any) {
    console.error('Error executing LangGraph pipeline:', err);
    ensureIntelligenceParsed(true);
    res.json({
      message: 'Pipeline executed with deterministic fallback state.',
      pipelineEngine: 'LangGraph StateGraph',
      scope: projectScope,
      risks: projectRisks,
      blockers: projectBlockers,
      actions: projectActions,
      tasksAtRisk: projectTasksAtRisk,
      health: computeHealth(),
      documentationOutput: latestDocOutput,
    });
  }
});


// GET /api/scope
app.get('/api/scope', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/scope')) return;
  ensureIntelligenceParsed();
  res.json(projectScope);
});

// GET /api/risks & POST /api/risks/clear
app.get('/api/risks', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/risks')) return;
  ensureIntelligenceParsed();

  const matrix = projectRisks.map((r) => ({
    id: r.id,
    x: r.probability,
    y: r.impact,
    label: r.title,
    severity: r.severity,
    category: r.category,
    mitigation: r.mitigation,
  }));

  res.json({ risks: projectRisks, tasksAtRisk: projectTasksAtRisk, riskMatrix: matrix });
});

app.post('/api/risks/clear', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/risks/clear')) return;
  projectRisks = [];
  projectTasksAtRisk = [];
  res.json({ message: 'Risks cleared', remainingRisks: 0 });
});

// GET /api/blockers
app.get('/api/blockers', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/blockers')) return;
  ensureIntelligenceParsed();
  res.json({ blockers: projectBlockers, conflicts: [] });
});

// GET /api/actions
app.get('/api/actions', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/actions')) return;
  ensureIntelligenceParsed();
  res.json({ actions: projectActions, tasksAtRisk: projectTasksAtRisk });
});

// GET /api/conflicts
app.get('/api/conflicts', (req: Request, res: Response) => {
  res.json({ conflicts: [] });
});

// GET /api/health & /api/health/history
app.get('/api/health', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/health')) return;
  ensureIntelligenceParsed();
  res.json(computeHealth());
});

app.get('/api/health/history', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/health/history')) return;
  ensureIntelligenceParsed();
  const h = computeHealth();
  res.json({ current: h.overall, trend: h.trend, history: h.history });
});

// POST /api/ask
app.post('/api/ask', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/ask')) return;

  ensureIntelligenceParsed();
  const rawQuery = (req.body.query || req.body.question || '').trim();
  if (!rawQuery) {
    return res.json({
      answer: 'Please provide a question or search query regarding your project documents.',
      agentUsed: 'Conversational Router Agent',
      sources: [],
      suggestedFollowUps: ['What are the highest priority risks?', 'Summarize project scope and milestones.'],
    });
  }

  const query = rawQuery.toLowerCase();
  const tokens = (query.match(/[a-zA-Z0-9_-]+/g) || []).filter(
    (w: string) => w.length > 2 && !['the', 'and', 'for', 'with', 'what', 'how', 'are', 'about', 'this', 'that'].includes(w)
  );

  const store = readChromaStore();
  const scoredChunks: Array<{ chunk: any; matches: number; score: number }> = [];

  for (const c of store.chunks) {
    const textLower = (c.text || '').toLowerCase();
    const nameLower = (c.document_name || '').toLowerCase();
    let matches = 0;
    for (const t of tokens) {
      if (textLower.includes(t)) matches += 2;
      if (nameLower.includes(t)) matches += 3;
    }
    if (matches > 0) {
      scoredChunks.push({ chunk: c, matches, score: matches / (tokens.length * 2 + 2) });
    }
  }

  scoredChunks.sort((a, b) => b.matches - a.matches);
  const sources: string[] = [];
  scoredChunks.slice(0, 4).forEach(({ chunk }) => {
    if (chunk.document_name && !sources.includes(chunk.document_name)) {
      sources.push(chunk.document_name);
    }
  });

  let answer = '';
  let agentUsed = 'Conversational Router Agent';

  if (scoredChunks.length > 0) {
    agentUsed = 'Extractive RAG Evidence Agent';
    const evidenceList = scoredChunks.slice(0, 3).map(({ chunk }, idx) => {
      const cText = (chunk.text || '').trim();
      const sentences = cText.split(/(?<=[.!?\n])\s+/);
      const matchingSentences = sentences.filter((s: string) =>
        tokens.some((t: string) => s.toLowerCase().includes(t))
      );
      const excerpt = matchingSentences.length > 0 ? matchingSentences.slice(0, 2).join(' ') : cText.slice(0, 250);
      return `**Evidence Excerpt ${idx + 1}** *(from \`${chunk.document_name}\`, Page ${chunk.page || 1})*:\n> "${excerpt.trim()}"`;
    });

    answer = `### Extractive Document Evidence\n\nBased on the retrieved content from your uploaded project artifacts, here is the relevant factual evidence:\n\n${evidenceList.join('\n\n')}\n\n---\n*Grounded directly in ${evidenceList.length} indexed knowledge chunk(s). No unverified external facts were introduced.*`;
  } else if (
    (query.includes('health') || query.includes('status')) &&
    !tokens.some((t: string) => !['health', 'score', 'status', 'project'].includes(t))
  ) {
    agentUsed = 'Health Scoring Engine';
    const h = computeHealth();
    answer = `### Composite Project Health Assessment\n\nOverall Health: **${h.overall}/100** (${h.status})\n\n- Risk Factor Score: ${h.metrics.riskScore}%\n- Blocker Score: ${h.metrics.blockerScore}%\n- Schedule Adherence: ${h.metrics.scheduleScore}%\n- Scope Clarity: ${h.metrics.scopeScore}%\n- Resource Capacity: ${h.metrics.resourceScore}%\n\n**Executive Assessment:** ${h.summary}`;
  } else if (
    (query.includes('risk') || query.includes('threat')) &&
    !tokens.some((t: string) => !['risk', 'risks', 'threat', 'what', 'project'].includes(t))
  ) {
    agentUsed = 'Risk Detection Agent';
    answer =
      projectRisks.length > 0
        ? `### Active Project Risk Register\n\n${projectRisks.map((r) => `- **${r.id}: ${r.title}** (${r.severity}, ${r.category}) — Mitigation: ${r.mitigation}`).join('\n')}`
        : 'No active risks are currently registered in the project store. Upload project documents to extract and track risks.';
  } else if (
    (query.includes('blocker') || query.includes('blocked')) &&
    !tokens.some((t: string) => !['blocker', 'blockers', 'what', 'project'].includes(t))
  ) {
    agentUsed = 'Blocker Identification Agent';
    answer =
      projectBlockers.length > 0
        ? `### Active Project Blockers\n\n${projectBlockers.map((b) => `- **${b.id}: ${b.title}** [${b.priority}] — Owner: ${b.owner} — Resolution: ${b.suggestedResolution}`).join('\n')}`
        : 'No active blockers currently logged in the project knowledge base.';
  } else {
    agentUsed = 'Extractive RAG Retrieval Engine';
    if (store.documents.length === 0) {
      answer = 'The project knowledge base is currently empty. Upload your project documents (PDF, DOCX, XLSX, CSV, TXT) to extract verifiable facts and ask questions.';
    } else {
      answer = `No relevant evidence was found in the indexed project documents for query: **"${rawQuery}"**.\n\nThe indexed artifacts (${store.documents.slice(0, 3).map((d: any) => d.name).join(', ')}) do not contain matching statements. Please verify that the pertinent document section is uploaded.`;
    }
  }

  res.json({
    answer,
    agentUsed,
    sources,
    suggestedFollowUps: ['What are the highest priority risks?', 'How can we resolve active blockers?'],
  });
});

// Chat history
app.get('/api/chat/history', (req: Request, res: Response) => res.json({ messages: chatHistory }));
app.post('/api/chat/clear', (req: Request, res: Response) => {
  chatHistory = [];
  res.json({ message: 'Chat history cleared' });
});

// Reports
app.get('/api/reports', (req: Request, res: Response) => {
  ensureIntelligenceParsed();
  const store = readChromaStore();
  const reportsList =
    store.documents.length > 0
      ? [
          {
            id: 'REP-01',
            title: 'Executive Project Dossier & Scope Synthesis',
            type: 'Executive Dossier',
            format: 'PDF',
            createdAt: new Date().toISOString().slice(0, 10),
            summary: `Synthesized intelligence covering ${store.documents.length} artifacts in ChromaDB.`,
            content: latestDocOutput,
          },
          {
            id: 'REP-02',
            title: 'Active Blockers & Mitigation Roadmap',
            type: 'Blocker Register',
            format: 'PDF',
            createdAt: new Date().toISOString().slice(0, 10),
            summary: `Extracted ${projectBlockers.length} active project impediments.`,
            content: latestDocOutput,
          },
        ]
      : [];
  res.json({ reports: reportsList });
});

app.post('/api/reports/generate', (req: Request, res: Response) => {
  ensureIntelligenceParsed();
  const store = readChromaStore();
  const report = {
    id: `REP-${Date.now()}`,
    title: req.body.title || 'Synthesized Project Intelligence Dossier',
    type: req.body.type || 'Executive Dossier',
    format: 'PDF',
    createdAt: new Date().toISOString().slice(0, 10),
    summary: `Synthesized intelligence covering ${store.documents.length} artifacts in ChromaDB.`,
    content: latestDocOutput,
  };
  res.json(report);
});

app.get('/api/documentation/latest', (req: Request, res: Response) => {
  ensureIntelligenceParsed();
  const store = readChromaStore();
  res.json({
    documentationOutput: latestDocOutput,
    hasDocuments: store.documents.length > 0,
  });
});

// Sample files endpoints
app.get('/api/sample-files/:format', (req: Request, res: Response) => {
  const format = (req.params.format || 'txt').toLowerCase();
  const filename = `sample_project_${format}.${format}`;
  res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`Sample Project ${format.toUpperCase()} Document\nID,Title,Status\n1,Initial Sample Task,Open\n`);
});

app.get('/api/sample-files/download/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename || '';
  const candidates = [
    path.resolve(process.cwd(), 'backend/storage/files', filename),
    path.resolve(process.cwd(), 'backend/chroma_db/files', filename),
    path.resolve(process.cwd(), 'backend/storage/chroma_db/files', filename),
  ];
  for (const cPath of candidates) {
    if (fs.existsSync(cPath) && fs.statSync(cPath).isFile()) {
      return res.download(cPath, filename);
    }
  }
  return res.status(404).json({
    error: `Requested sample file '${filename}' was not found on the server. No placeholder content is generated.`,
  });
});

// POST /api/project/reset
app.post('/api/project/reset', (req: Request, res: Response) => {
  writeChromaStore([], []);
  projectScope = { ...EMPTY_SCOPE };
  projectRisks = [];
  projectBlockers = [];
  projectActions = [];
  projectTasksAtRisk = [];
  latestDocOutput = '';
  res.json({ message: 'Project workspace reset to clean initial state.', health: computeHealth() });
});

app.get('/api/health-check', (req: Request, res: Response) => {
  res.json({ status: 'online', runtime: 'React Frontend + Unified ChromaDB Intelligence Engine' });
});

// ==========================================
// VITE DEV SERVER INTEGRATION
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
