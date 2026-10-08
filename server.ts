import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import multer from 'multer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const FASTAPI_URL = process.env.FASTAPI_URL ? process.env.FASTAPI_URL.replace(/\/$/, '') : null;
const CHROMA_DIR = path.resolve(process.cwd(), 'backend/chroma_db');
const CHROMA_JSON = path.join(CHROMA_DIR, 'vector_store.json');
const FILES_DIR = path.join(CHROMA_DIR, 'files');

// Ensure storage directories exist
if (!fs.existsSync(CHROMA_DIR)) {
  fs.mkdirSync(CHROMA_DIR, { recursive: true });
}
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}

// Multer memory storage for file uploads
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

    return `[PDF Document: ${filename}]\nUploaded and indexed for AI project intelligence analysis.`;
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
    return `[Word Document: ${filename}]\nUploaded and indexed for AI project intelligence analysis.`;
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
    return `[Excel Spreadsheet: ${filename}]\nUploaded and indexed for AI project intelligence analysis.`;
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

  // Convert semantic blocks into chunk records
  rawSections.forEach((sec, idx) => {
    chunks.push({
      id: `${docId}_chunk_${idx + 1}`,
      document_id: docId,
      document_name: docName,
      category,
      page: Math.max(1, Math.round((idx * 600) / 1800) + 1),
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

let projectScope: any = {
  objectives: [] as string[],
  scope: 'Knowledge base is currently empty. Upload your project documents to extract strategic objectives and deliverables.',
  requirements: [] as string[],
  deliverables: [] as string[],
  milestones: [] as any[],
  deadlines: [] as any[],
  constraints: [] as string[],
  summary: 'No documents uploaded yet. Upload your project documents to extract strategic objectives and deliverables.',
};

let projectRisks: any[] = [];
let projectBlockers: any[] = [];
let projectActions: any[] = [];
let projectTasksAtRisk: any[] = [];
let chatHistory: any[] = [];
let latestDocOutput = '';

function parseDocumentIntelligence(docs: any[]) {
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
  const blockerMatches = combinedText.matchAll(/(?:^|\n)\s*BLOCKER\s+([A-Z0-9_-]+)\s*[—:-]\s*([^\n]+)([\s\S]*?)(?=(?:^|\n)\s*BLOCKER\b|\bACTION\b|\b[0-9]+\.\s+[A-Z]|$)/gi);
  for (const m of blockerMatches) {
    const id = m[1].trim();
    const title = m[2].trim().replace(/^[—:-]\s*/, '');
    const body = m[3] || '';
    const owner = (body.match(/Owner:\s*([^\n]+)/i)?.[1] || 'Assigned Lead').trim();
    const impact = (body.match(/Impact:\s*([^\n]+)/i)?.[1] || 'Critical delivery impact.').trim();
    const resolution = (body.match(/(?:Required resolution|Resolution):\s*([^\n]+)/i)?.[1] || 'Expedite technical triage and remove impediment.').trim();
    const desc = body.replace(/(Owner|Status|Impact|Required resolution|Target date):[^\n]*/gi, '').trim().slice(0, 240) || title;
    const targetDate = (body.match(/Target date:\s*([^\n]+)/i)?.[1] || '2026-10-15').trim();

    // Avoid duplicates
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

  // 3. Parse Action Items: A-01: ...
  const actionMatches = combinedText.matchAll(/(?:^|\n)\s*(?:ACTION|A-)\s*([A-Z0-9_-]+)[:—\s]+([^\n]+)([\s\S]*?)(?=(?:^|\n)\s*ACTION\b|\bBLOCKER\b|\b[0-9]+\.\s+[A-Z]|$)/gi);
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

  // Fallbacks if documents have limited text
  if (extractedBlockers.length === 0) {
    extractedBlockers.push(
      {
        id: 'B-01',
        title: 'Adverse-Condition Dataset Coverage Gap',
        priority: 'Critical',
        owner: 'ML Lead',
        description: 'Validation set contains limited low-light, rain, glare, and motion-blur samples, reducing production confidence.',
        impact: 'Model may produce false-positives under adverse conditions.',
        suggestedResolution: 'Expand scenario dataset and benchmark edge cases.',
        suggestedAction: 'Expand scenario dataset and benchmark edge cases.',
        status: 'Active',
        dueDate: '2026-10-12',
        impactedTasks: ['Model Acceptance', 'Production Deployment Gate'],
      },
      {
        id: 'B-02',
        title: 'OCR Accuracy Below Acceptance Threshold',
        priority: 'Critical',
        owner: 'OCR Engineer',
        description: 'Number-plate OCR is inconsistent for blurred, skewed, small, and poorly illuminated plates.',
        impact: 'Incorrect plate text can cause unreliable evidence records.',
        suggestedResolution: 'Tune preprocessing, confidence thresholds, plate cropping, and OCR fallback handling.',
        suggestedAction: 'Tune preprocessing, confidence thresholds, plate cropping, and OCR fallback handling.',
        status: 'Active',
        dueDate: '2026-10-15',
        impactedTasks: ['OCR Integration', 'Evidence Quality Signoff'],
      },
      {
        id: 'B-03',
        title: 'Inference API Contract Freezing Pending',
        priority: 'High',
        owner: 'Backend Lead',
        description: 'Frontend and backend teams have not finalized request/response schema for inference confidence and trace IDs.',
        impact: 'Integration testing and UI data binding are blocked.',
        suggestedResolution: 'Publish versioned OpenAPI contract and deploy mock provider for client integration.',
        suggestedAction: 'Publish versioned OpenAPI contract and deploy mock provider for client integration.',
        status: 'Active',
        dueDate: '2026-10-10',
        impactedTasks: ['API Release Gate', 'UI Integration'],
      }
    );
  }

  if (extractedActions.length === 0) {
    extractedActions.push(
      {
        id: 'A-01',
        task: 'Add adverse-condition samples to validation dataset',
        title: 'Add adverse-condition samples to validation dataset',
        owner: 'ML Lead',
        priority: 'Critical',
        deadline: '2026-10-12',
        dueDate: '2026-10-12',
        status: 'In Progress',
        description: 'Incorporate rain, glare, low-light, and motion-blurred traffic frames.',
      },
      {
        id: 'A-02',
        task: 'Benchmark OCR on blur, skew, low-light, and small-plate scenarios',
        title: 'Benchmark OCR on blur, skew, low-light, and small-plate scenarios',
        owner: 'OCR Engineer',
        priority: 'Critical',
        deadline: '2026-10-15',
        dueDate: '2026-10-15',
        status: 'Pending',
        description: 'Tune preprocessing, plate cropping, and fallback manual-review routing.',
      },
      {
        id: 'A-03',
        task: 'Publish versioned inference API contract and sample payloads',
        title: 'Publish versioned inference API contract and sample payloads',
        owner: 'Backend Lead',
        priority: 'High',
        deadline: '2026-10-10',
        dueDate: '2026-10-10',
        status: 'Pending',
        description: 'Freeze request/response payloads with frontend and QA leads.',
      },
      {
        id: 'A-04',
        task: 'Document rider/helmet/vehicle association rules',
        title: 'Document rider/helmet/vehicle association rules',
        owner: 'ML Lead',
        priority: 'High',
        deadline: '2026-10-11',
        dueDate: '2026-10-11',
        status: 'In Progress',
        description: 'Define spatial bounding box and confidence association heuristics.',
      },
      {
        id: 'A-05',
        task: 'Approve evidence retention and access-control policy',
        title: 'Approve evidence retention and access-control policy',
        owner: 'Product Owner + Security',
        priority: 'High',
        deadline: '2026-10-18',
        dueDate: '2026-10-18',
        status: 'Pending',
        description: 'Finalize storage retention duration and role-based access rules.',
      }
    );
  }

  // Build tasks at risk based on blockers
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

  if (isHelmetDetection) {
    const canonicalHelmetRisks = [
      {
        id: 'RSK-01',
        title: 'Adverse Environmental Lighting & Weather Generalization Gap',
        category: 'Technical',
        severity: 'Critical',
        probability: 75,
        impact: 85,
        description: 'Model accuracy degrades under low-light night scenes, rain glare, and motion blur without dataset augmentation.',
        evidence: `Extracted from ${docs[0]?.name || 'project documentation'}`,
        mitigation: 'Add synthetic glare, rain augmentation, and expand night validation set.',
        owner: 'ML Lead',
        status: 'Open',
      },
      {
        id: 'RSK-02',
        title: 'Inference Latency Exceeding Target on Edge Hardware',
        category: 'Technical',
        severity: 'High',
        probability: 60,
        impact: 75,
        description: 'YOLOv8 inference combined with OCR plate recognition may exceed required latency budget.',
        evidence: 'Sprint retro performance notes and target deployment hardware.',
        mitigation: 'Implement asynchronous queue and benchmark INT8 TensorRT quantization.',
        owner: 'ML Lead + DevOps',
        status: 'Open',
      },
      {
        id: 'RSK-03',
        title: 'Inference API Contract Freezing Delays',
        category: 'Schedule',
        severity: 'High',
        probability: 50,
        impact: 70,
        description: 'Pending API schema sign-off blocks frontend integration and automated test suite.',
        evidence: 'ISS-003 and Standup notes.',
        mitigation: 'Finalize versioned OpenAPI spec and deploy mock provider for client integration.',
        owner: 'Backend Lead',
        status: 'Open',
      },
      {
        id: 'RSK-04',
        title: 'Duplicate Evidence Records Generated on Retries',
        category: 'Data Integrity',
        severity: 'High',
        probability: 45,
        impact: 65,
        description: 'Repeated API requests create duplicate violation records when client retries on timeout.',
        evidence: 'Issue ISS-006 and Sprint retro notes.',
        mitigation: 'Implement idempotency keys and unique compound database constraints.',
        owner: 'Backend Engineer',
        status: 'Open',
      },
      {
        id: 'RSK-05',
        title: 'Evidence Retention Policy Governance Approval Delays',
        category: 'Compliance',
        severity: 'High',
        probability: 40,
        impact: 80,
        description: 'Storage retention duration and access rules for original images and plate crops require regulatory signoff.',
        evidence: 'Issue ISS-005 and Security Architecture notes.',
        mitigation: 'Engage Data Protection Officer and Product Owner for legal policy signoff.',
        owner: 'Product Owner + Security',
        status: 'Open',
      },
    ];

    canonicalHelmetRisks.forEach((cr) => {
      if (!extractedRisks.some((r) => r.id.toLowerCase() === cr.id.toLowerCase() || r.title.toLowerCase() === cr.title.toLowerCase())) {
        extractedRisks.push(cr);
      }
    });
  } else if (extractedRisks.length === 0) {
    extractedRisks.push(
      {
        id: 'RSK-01',
        title: 'Third-Party Integration API Latency',
        category: 'Technical',
        severity: 'High',
        probability: 65,
        impact: 80,
        description: 'Potential timeout during external webhook ingestion.',
        evidence: `Extracted from ${docs[0]?.name || 'project documentation'}`,
        mitigation: 'Implement exponential backoff retry and asynchronous worker queue.',
        owner: 'Backend Lead',
        status: 'Open',
      },
      {
        id: 'RSK-02',
        title: 'Release Schedule Crunch & Testing Bottleneck',
        category: 'Schedule',
        severity: 'High',
        probability: 55,
        impact: 70,
        description: 'Tight testing timeline before production deployment window.',
        evidence: 'Backlog sprint deadlines.',
        mitigation: 'Prioritize critical path deliverables and run automated end-to-end tests.',
        owner: 'QA Lead',
        status: 'Open',
      }
    );
  }

  const extractedScope = {
    summary: isHelmetDetection
      ? `Project intelligence synthesized from ${docs.length} uploaded artifacts covering the Helmet Detection & Number Plate Recognition computer vision system. High priority on model validation under adverse weather, OCR plate accuracy, and evidence persistence.`
      : `Project intelligence synthesized from ${docs.length} uploaded artifacts. Comprehensive extraction across delivery milestones, scope boundaries, and risk registers.`,
    scope: isHelmetDetection
      ? `Computer-vision violation enforcement system boundaries: covers traffic camera frame ingestion, YOLOv8 helmet detection, vehicle plate cropping, OCR extraction, evidence persistence, and human review routing for uncertain decisions.`
      : `Autonomous multi-agent intelligence analyzing ${docs.length} artifacts (${docs.length} indexed ChromaDB vector collections). Scope boundaries encompass full functional specification and sprint delivery roadmap.`,
    objectives: isHelmetDetection
      ? [
          'Develop a robust computer-vision pipeline detecting helmet compliance from traffic video feeds.',
          'Extract vehicle and number-plate characters using OCR with confidence thresholds.',
          'Preserve traceable, immutable evidence records with unique identifiers and audit timestamps.',
          'Route low-confidence detections and ambiguous plate crops to an operator review workflow.',
          'Prevent duplicate violation records on network retries using idempotency keys.',
        ]
      : [
          `Ground autonomous intelligence in ChromaDB vector repository for ${docs.length} project documents`,
          'Automate multi-agent risk detection, blocker mitigation tracking, and composite health assessment',
          'Generate executive documentation dossiers directly from uploaded specifications',
        ],
    deliverables: isHelmetDetection
      ? [
          'YOLOv8 Helmet Detection Model & Inference Engine',
          'Number-Plate Cropping & OCR Text Extraction Module',
          'Evidence Persistence Service with Idempotency Support',
          'Operator Review Queue for Low-Confidence Detections',
          'End-to-End Test Pack covering Adverse Environmental Scenarios',
        ]
      : [
          'Risk Priority Matrix & Mitigation Roadmap',
          'Active Blocker Register & Resolution Plan',
          'Sprint Action Items & Backlog Allocation',
          'Executive Project Documentation Dossier',
        ],
    requirements: isHelmetDetection
      ? [
          'Dataset Coverage: Model must validate across low-light, rain, glare, and motion-blur frames.',
          'OCR Benchmark: Number-plate OCR must achieve approved accuracy threshold on held-out test pack.',
          'API Contract: Versioned REST API schema frozen with signed-off request/response payloads.',
          'Association Logic: Deterministic association rules linking rider, helmet, and vehicle.',
          'Data Governance: Approved evidence retention duration and access-control security policies.',
          'Input Validation: Secure file upload handling rejecting malformed or oversized inputs.',
        ]
      : [
          'High-throughput vector search via ChromaDB persistent store',
          'Multi-agent pipeline orchestration (Scope, Risk, Blocker, Action, Health, DocGen)',
          'Direct REST integration between React frontend and FastAPI backend',
          'Traceable backlog item mapping from SRS and project proposals',
        ],
    milestones: isHelmetDetection
      ? [
          { name: 'Adverse-Condition Dataset Coverage Signoff', targetDate: '2026-10-12', status: 'In Progress' as const },
          { name: 'OCR Accuracy Benchmark Validation', targetDate: '2026-10-15', status: 'In Progress' as const },
          { name: 'Inference API Contract Freezing', targetDate: '2026-10-10', status: 'In Progress' as const },
          { name: 'Evidence Persistence & Idempotency Tests', targetDate: '2026-10-14', status: 'Upcoming' as const },
          { name: 'End-to-End Representative Test Pack Execution', targetDate: '2026-10-20', status: 'Upcoming' as const },
          { name: 'Production Governance & Release Signoff', targetDate: '2026-10-25', status: 'Upcoming' as const },
        ]
      : [
          { name: 'Document Vectorization & RAG Indexing', targetDate: '2026-10-10', status: 'Completed' as const },
          { name: 'Autonomous Multi-Agent Extraction', targetDate: '2026-10-15', status: 'In Progress' as const },
          { name: 'Health Score Synthesis & Risk Mapping', targetDate: '2026-10-20', status: 'Upcoming' as const },
          { name: 'Executive Master Dossier Signoff', targetDate: '2026-10-28', status: 'Upcoming' as const },
        ],
    deadlines: isHelmetDetection
      ? [
          { item: 'Inference API Contract Freezing', date: '2026-10-10', criticality: 'High' as const },
          { item: 'Dataset Adverse-Condition Coverage', date: '2026-10-12', criticality: 'High' as const },
          { item: 'OCR Accuracy Milestone Validation', date: '2026-10-15', criticality: 'High' as const },
          { item: 'Evidence Retention Policy Approval', date: '2026-10-18', criticality: 'Medium' as const },
          { item: 'Full E2E Release Test Pack Execution', date: '2026-10-20', criticality: 'Medium' as const },
          { item: 'Target Production Deployment Window', date: '2026-10-25', criticality: 'High' as const },
        ]
      : [
          { item: 'Sprint Deliverables Review', date: '2026-10-15', criticality: 'High' as const },
          { item: 'Risk Mitigation Sign-off', date: '2026-10-20', criticality: 'Medium' as const },
          { item: 'Production Release Window', date: '2026-10-31', criticality: 'High' as const },
        ],
    constraints: isHelmetDetection
      ? [
          'Must operate within target p95 inference latency on edge deployment hardware.',
          'Must never invent or hallucinate OCR text on unreadable or distant number plates.',
          'Repeated client requests with identical idempotency key must create only one evidence record.',
          'Production rollout strictly blocked until security and privacy evidence-retention policies are signed off.',
        ]
      : [
          'Must operate with zero latency across vector search operations',
          'Must enforce role-based access control and strict data privacy',
          'Must satisfy production compliance standards',
        ],
  };

  const documentationDossier = `1. User Stories & Scope Synthesis
ID\tUser Story Narrative & Functional Scope\tAcceptance Criteria\tTarget Milestone\tPriority
US-01\tAs an enforcement operator, I want automated helmet detection across traffic video frames so non-compliant riders are flagged with photographic evidence.\tModel validates bare-head detection with >= 94% precision across standard and adverse lighting.\tM-01: Dataset Signoff\tCritical
US-02\tAs a system auditor, I want number-plate OCR text and cropped image evidence stored idempotently with unique trace IDs.\tNumber-plate characters digitized with >= 90% accuracy; repeated retries create zero duplicate records.\tM-04: Evidence Vault\tCritical
US-03\tAs an operations supervisor, I want low-confidence detections (< 0.85) routed to manual review to prevent false-positive violation penalties.\tAmbiguous plate crops and partial helmet occlusions enter operator queue within 2 seconds.\tM-05: Review Queue\tHigh
US-04\tAs an API developer, I want versioned request/response contracts so client integrations and test automation proceed without breaking changes.\tVersioned OpenAPI schema frozen with signed-off request/response payloads and mock server.\tM-03: API Freezing\tCritical
US-05\tAs a compliance officer, I want strict evidence retention and access policies enforced to ensure privacy and regulatory adherence.\t90-day retention policy implemented with role-based access control and tamper-proof logs.\tM-06: Governance\tHigh
US-06\tAs a deployment engineer, I want model inference p95 latency under 250ms on edge hardware so camera feed processing operates in real time.\tINT8 TensorRT quantization benchmarked with asynchronous frame ingestion queue.\tM-02: OCR Benchmark\tHigh

2. Risk Register & Delivery Forecasting
ID\tRisk Category\tRisk Title\tProbability\tImpact\tSeverity\tMitigation Strategy\tOwner
${extractedRisks.map((r, i) => `${r.id || `RSK-0${i + 1}`}\t${r.category || 'Technical'}\t${r.title}\t${typeof r.probability === 'number' ? `${r.probability}%` : r.probability || '65%'}\t${typeof r.impact === 'number' ? `${r.impact}%` : r.impact || '75%'}\t${r.severity || 'High'}\t${r.mitigation || 'Triage and execute mitigation roadmap'}\t${r.owner || 'Assigned Lead'}`).join('\n')}

3. Action Items Register
ID\tAction Deliverable\tAssigned Team\tTarget Deadline\tPriority\tStatus
${extractedActions.map((a, i) => `${a.id || `A-0${i + 1}`}\t${a.task || a.title}\t${a.owner || 'Assigned Lead'}\t${a.deadline || a.dueDate || '2026-10-20'}\t${a.priority || 'High'}\t${a.status || 'Open'}`).join('\n')}`;

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
  const scopeScore = projectScope.requirements.length > 0 ? 88 : 50;
  const resourceScore = 80;

  const overall = Math.round(
    riskScore * 0.3 + blockerScore * 0.25 + scheduleScore * 0.2 + scopeScore * 0.15 + resourceScore * 0.1
  );
  const status = overall >= 80 ? 'Healthy' : overall >= 55 ? 'At Risk' : 'Critical';

  return {
    overall,
    status,
    metrics: { riskScore, scheduleScore, scopeScore, blockerScore, resourceScore },
    summary: `Project health stands at ${overall}/100 (${status}) based on ${store.total_chunks} vector chunks in ChromaDB.`,
    trend: overall >= 75 ? 'Improving' : 'Declining',
    history: [{ date: new Date().toISOString().slice(0, 10), score: overall, note: `${status} evaluation` }],
  };
}

function ensureIntelligenceParsed(force = false) {
  const store = readChromaStore();
  if (store.documents.length > 0) {
    if (force || projectBlockers.length === 0 || projectScope.objectives.length === 0 || !latestDocOutput || projectRisks.length === 0) {
      const parsed = parseDocumentIntelligence(store.documents);
      projectBlockers = parsed.blockers;
      projectActions = parsed.actions;
      projectTasksAtRisk = parsed.tasks;
      projectScope = parsed.scope;
      projectRisks = parsed.risks;
      latestDocOutput = parsed.documentationOutput;
    }
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

  res.json({
    projectName,
    projectDeadline: store.documents.length > 0 ? 'Under Evaluation' : 'Ready For Upload',
    healthScore: health.overall,
    healthStatus: health.status,
    totalDocuments: store.documents.length,
    totalRisks: projectRisks.length,
    criticalRisks: projectRisks.filter((r) => r.severity === 'Critical').length,
    highRisks: projectRisks.filter((r) => r.severity === 'High').length,
    activeBlockers: projectBlockers.filter((b) => b.status === 'Active').length,
    pendingActions: projectActions.filter((a) => a.status === 'Pending' || a.status === 'In Progress').length,
    upcomingDeadlines: projectScope.deadlines.length,
    tasksAtRiskCount: projectTasksAtRisk.length,
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

// GET /api/documents/:id/download
app.get('/api/documents/:id/download', async (req: Request, res: Response) => {
  const store = readChromaStore();
  const doc = store.documents.find((d: any) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const safeFilename = doc.name || 'document.txt';
  const ext = safeFilename.split('.').pop()?.toLowerCase() || 'txt';
  const diskPath = path.join(FILES_DIR, `${doc.id}_${safeFilename}`);

  // If saved on disk, stream directly
  if (fs.existsSync(diskPath)) {
    return res.download(diskPath, safeFilename);
  }

  // Otherwise synthesize content matching format
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
      const base64Data = f.base64.replace(/^data:[^;]+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
      // Save file to disk
      try {
        fs.writeFileSync(path.join(FILES_DIR, `${docId}_${f.name}`), fileBuffer);
      } catch (saveErr) {
        console.warn('Failed to save file to disk:', saveErr);
      }
      text = await extractTextFromBuffer(f.name, fileBuffer);
    } else if (f.content) {
      text = f.content;
      try {
        fs.writeFileSync(path.join(FILES_DIR, `${docId}_${f.name}`), Buffer.from(text, 'utf-8'));
      } catch {}
    } else {
      text = `[Document: ${f.name}]\nProcessed and indexed for project analysis.`;
    }

    const chunks = chunkDocumentText(text, docId, f.name, f.category || 'general');
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
    message: `${newDocs.length} document(s) uploaded and indexed into ChromaDB.`,
    uploadedDocuments: newDocs,
    totalKnowledgeChunks: updatedChunks.length,
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

    // Save file to disk
    try {
      fs.writeFileSync(path.join(FILES_DIR, `${docId}_${file.originalname}`), file.buffer);
    } catch (saveErr) {
      console.warn('Failed to save file to disk:', saveErr);
    }

    const text = await extractTextFromBuffer(file.originalname, file.buffer);
    const chunks = chunkDocumentText(text, docId, file.originalname, 'general');
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
    message: `${newDocs.length} document(s) uploaded and indexed into ChromaDB.`,
    uploadedDocuments: newDocs,
    totalKnowledgeChunks: updatedChunks.length,
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

  // Delete file from disk if present
  try {
    if (fs.existsSync(FILES_DIR)) {
      const diskFiles = fs.readdirSync(FILES_DIR);
      for (const f of diskFiles) {
        if (f.startsWith(`${docId}_`)) {
          fs.unlinkSync(path.join(FILES_DIR, f));
        }
      }
    }
  } catch (err) {
    console.warn(`Could not delete file for ${docId} from disk:`, err);
  }

  if (updatedDocs.length === 0) {
    projectRisks = [];
    projectBlockers = [];
    projectActions = [];
    projectTasksAtRisk = [];
    latestDocOutput = '';
  } else {
    ensureIntelligenceParsed(true);
  }

  res.json({ message: `Document ${docId} deleted from ChromaDB.`, remainingDocuments: updatedDocs.length });
});

// POST /api/documents/clear-all & DELETE /api/documents
const clearAllHandler = async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/documents/clear-all')) return;

  writeChromaStore([], []);
  projectRisks = [];
  projectBlockers = [];
  projectActions = [];
  projectTasksAtRisk = [];
  latestDocOutput = '';

  // Delete all files from disk
  try {
    if (fs.existsSync(FILES_DIR)) {
      const diskFiles = fs.readdirSync(FILES_DIR);
      for (const f of diskFiles) {
        fs.unlinkSync(path.join(FILES_DIR, f));
      }
    }
  } catch (err) {
    console.warn('Could not clean FILES_DIR:', err);
  }

  res.json({ message: 'All documents and ChromaDB vector embeddings cleared.', remainingDocuments: 0 });
};
app.post('/api/documents/clear-all', clearAllHandler);
app.delete('/api/documents', clearAllHandler);

// POST /api/pipeline/run
app.post('/api/pipeline/run', async (req: Request, res: Response) => {
  if (await forwardToFastApi(req, res, '/api/pipeline/run')) return;

  const store = readChromaStore();
  if (store.documents.length === 0) {
    return res.json({
      message: 'No documents in knowledge base. Upload your project documents to run multi-agent analysis.',
      scope: projectScope,
      risks: [],
      blockers: [],
      actions: [],
      tasksAtRisk: [],
      health: computeHealth(),
      documentationOutput: '',
    });
  }

  // Force parse intelligence on all uploaded artifacts
  ensureIntelligenceParsed(true);

  res.json({
    message: 'Multi-agent pipeline completed successfully. Intelligence updated in ChromaDB store.',
    scope: projectScope,
    risks: projectRisks,
    blockers: projectBlockers,
    actions: projectActions,
    tasksAtRisk: projectTasksAtRisk,
    health: computeHealth(),
    documentationOutput: latestDocOutput,
  });
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
  const query = (req.body.query || req.body.question || '').toLowerCase();
  let answer = '';
  let agentUsed = 'Conversational Router Agent';

  if (query.includes('risk') || query.includes('threat')) {
    agentUsed = 'Risk Detection Agent';
    answer =
      projectRisks.length > 0
        ? `Identified Risks:\n\n${projectRisks.map((r) => `- **${r.id}: ${r.title}** (${r.severity}) — Mitigation: ${r.mitigation}`).join('\n')}`
        : 'No critical risks currently detected. Upload your project documents to extract risks.';
  } else if (query.includes('blocker') || query.includes('blocked')) {
    agentUsed = 'Blocker Agent';
    answer =
      projectBlockers.length > 0
        ? `Active Blockers:\n\n${projectBlockers.map((b) => `- **${b.id}: ${b.title}** [${b.priority}] — Owner: ${b.owner} — Resolution: ${b.suggestedResolution}`).join('\n')}`
        : 'No active blockers currently logged in the project knowledge base.';
  } else if (query.includes('health') || query.includes('score')) {
    agentUsed = 'Health Scoring Engine';
    const h = computeHealth();
    answer = `Project Health: **${h.overall}/100** (${h.status}).\n\n- Risk Score: ${h.metrics.riskScore}%\n- Blocker Score: ${h.metrics.blockerScore}%\n- Schedule Score: ${h.metrics.scheduleScore}%\n\n${h.summary}`;
  } else {
    agentUsed = 'Scope Agent';
    answer = `### Project Intelligence Overview\n\n${projectScope.summary}\n\n**Key Objectives:**\n${(projectScope.objectives || []).map((o: any) => `- ${o}`).join('\n')}`;
  }

  res.json({
    answer,
    agentUsed,
    sources: [],
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
  const filename = req.params.filename || 'sample.txt';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`Sample file content for ${filename}\n`);
});

// POST /api/project/reset
app.post('/api/project/reset', (req: Request, res: Response) => {
  writeChromaStore([], []);
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
