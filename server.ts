import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import mammoth from 'mammoth';
import * as pdfParseModule from 'pdf-parse';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';

const pdfParse = ((pdfParseModule as any).default || (pdfParseModule as any).PDFParse || pdfParseModule) as (buffer: Buffer) => Promise<{ text: string }>;
import { projectStore, GeneratedReport } from './server/store.js';
import { routeQuery } from './server/agents/routerAgent.js';
import { extractProjectScope } from './server/agents/scopeAgent.js';
import { detectProjectRisks } from './server/agents/riskAgent.js';
import { extractBlockersAndActions } from './server/agents/blockerActionAgent.js';
import { computeHealthScore, detectTasksAtRisk } from './server/agents/healthEngine.js';
import { generateDocumentReport } from './server/agents/docGenAgent.js';
import { ai, GEMINI_MODEL } from './server/geminiClient.js';
import { ProjectDocument } from './server/sampleData.js';
import {
  generateProjectOverviewDocx,
  generateRequirementsDocx,
  generateProjectTimelineXlsx,
  generateRiskRegisterXlsx,
  generateWeeklyProgressDocx,
} from './server/sampleProjectDocs.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup multer memory storage for file uploads (up to 50 MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// Helper: Extract plain text from file buffer with full PDF, DOCX, XLSX, CSV, Markdown, and TXT support
async function extractTextFromBuffer(buffer: Buffer, originalName: string): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();

  // 1. Plain text, Markdown, CSV, TSV, JSON, RTF, Log, YAML
  if (['.csv', '.txt', '.text', '.md', '.markdown', '.json', '.tsv', '.rtf', '.log', '.yaml', '.yml'].includes(ext) || !ext) {
    try {
      const text = buffer.toString('utf-8');
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (txtErr) {
      console.warn(`[Text Parser] UTF-8 reading warning for ${originalName}:`, txtErr);
    }
  }

  // 2. Real Microsoft Word DOCX / DOC
  if (ext === '.docx' || ext === '.doc') {
    try {
      const res = await mammoth.extractRawText({ buffer });
      if (res.value && res.value.trim().length > 0) {
        return res.value.trim();
      }
    } catch (docxErr) {
      console.warn(`[DOCX Parser] Mammoth extraction fallback for ${originalName}:`, docxErr);
    }
  }

  // 3. Real Microsoft Excel XLSX / XLS
  if (ext === '.xlsx' || ext === '.xls') {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const rows: string[] = [];
      workbook.eachSheet((worksheet) => {
        rows.push(`\n[Worksheet: ${worksheet.name}]`);
        worksheet.eachRow((row) => {
          const values = Array.isArray(row.values)
            ? row.values.slice(1).map((v) => (v !== null && v !== undefined ? String(v) : ''))
            : [];
          if (values.length > 0) {
            rows.push(values.join('\t'));
          }
        });
      });
      if (rows.length > 0) {
        return rows.join('\n');
      }
    } catch (xlsxErr) {
      console.warn(`[XLSX Parser] ExcelJS extraction fallback for ${originalName}:`, xlsxErr);
    }
  }

  // 4. Real Adobe PDF
  if (ext === '.pdf') {
    try {
      const data = await pdfParse(buffer);
      if (data && data.text && data.text.trim().length > 0) {
        return data.text.trim();
      }
    } catch (pdfErr) {
      console.warn(`[PDF Parser] PDF-parse fallback for ${originalName}:`, pdfErr);
    }
  }

  // 5. UTF-8 printable string fallback
  try {
    const utf8Str = buffer.toString('utf-8');
    const printableMatches = utf8Str.match(/[\x20-\x7E\t\r\n\u00A0-\uFFFF]{3,}/g);
    if (printableMatches && printableMatches.join(' ').length > 30) {
      return printableMatches.join(' ').trim();
    }
  } catch (err) {}

  // 6. Latin-1 printable character stream extraction
  const rawString = buffer.toString('latin1');
  const extractedLines: string[] = [];
  const matches = rawString.match(/[\x20-\x7E\t\r\n]{4,}/g);
  if (matches) {
    for (const match of matches) {
      if (!match.startsWith('obj') && !match.startsWith('endobj') && !match.includes('/Font')) {
        extractedLines.push(match.trim());
      }
    }
  }

  if (extractedLines.length > 5) {
    return `[Extracted Document: ${originalName}]\n` + extractedLines.join('\n');
  }

  return `[Uploaded Document: ${originalName}]\nIngested project artifact. Ready for AI multi-agent analysis.`;
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// GET /api/project/summary
app.get('/api/project/summary', (req: Request, res: Response) => {
  const activeBlockers = projectStore.blockers.filter((b) => b.status === 'Active').length;
  const pendingActions = projectStore.actions.filter((a) => a.status === 'Pending' || a.status === 'In Progress').length;
  const criticalRisks = projectStore.risks.filter((r) => r.severity === 'Critical').length;
  const highRisks = projectStore.risks.filter((r) => r.severity === 'High').length;

  const projectName = projectStore.documents.length > 0
    ? projectStore.documents[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    : "Project Workspace";

  const projectDeadline = projectStore.scope.deadlines.length > 0
    ? projectStore.scope.deadlines[0].date
    : (projectStore.documents.length > 0 ? "Under Evaluation" : "Ready For Upload");

  res.json({
    projectName,
    projectDeadline,
    healthScore: projectStore.health.overall,
    healthStatus: projectStore.health.status,
    totalDocuments: projectStore.documents.length,
    totalRisks: projectStore.risks.length,
    criticalRisks,
    highRisks,
    activeBlockers,
    pendingActions,
    upcomingDeadlines: projectStore.scope.deadlines.length,
    tasksAtRiskCount: projectStore.tasksAtRisk.length,
  });
});

// GET /api/documents
app.get('/api/documents', (req: Request, res: Response) => {
  res.json({
    documents: projectStore.documents.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      size: d.size,
      uploadDate: d.uploadDate,
      status: d.status,
      chunkCount: d.chunkCount,
      category: d.category,
      content: d.content ? d.content.slice(0, 1200) : '',
    })),
    totalChunks: projectStore.rag.getAllChunks().length,
  });
});

// POST /api/upload
app.post(
  '/api/upload',
  (req, res, next) => {
    upload.array('files', 25)(req, res, (err: any) => {
      if (err) {
        console.error('[Upload Middleware Error]:', err);
        return res.status(400).json({
          error: err.message || 'File upload error. Please ensure file is under 50 MB.',
        });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files received. Please select project documents.' });
      }

      const processedDocs: ProjectDocument[] = [];

      for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '').toUpperCase();
        let type: ProjectDocument['type'] = 'TXT';
        if (ext === 'PDF') type = 'PDF';
        else if (ext === 'DOCX' || ext === 'DOC') type = 'DOCX';
        else if (ext === 'CSV' || ext === 'TSV') type = 'CSV';
        else if (ext === 'XLSX' || ext === 'XLS') type = 'XLSX';

        // Categorize based on filename
        const lower = file.originalname.toLowerCase();
        let category: ProjectDocument['category'] = 'general';
        if (lower.includes('srs') || lower.includes('req') || lower.includes('spec')) category = 'requirements';
        else if (lower.includes('arch') || lower.includes('design') || lower.includes('system')) category = 'architecture';
        else if (lower.includes('meet') || lower.includes('note') || lower.includes('retro') || lower.includes('standup')) category = 'meetings';
        else if (lower.includes('task') || lower.includes('track') || lower.includes('sprint') || lower.includes('backlog') || lower.includes('jira')) category = 'tasks';

        let content = '';
        try {
          content = await extractTextFromBuffer(file.buffer, file.originalname);
        } catch (err: any) {
          console.warn(`Text extraction warning for ${file.originalname}:`, err);
          content = `[File: ${file.originalname}]\nIngested document content. Ready for analysis.`;
        }

        const sizeKB = file.size / 1024;
        const sizeStr = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeKB))} KB`;

        const newDoc: ProjectDocument = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.originalname,
          type,
          size: sizeStr,
          uploadDate: new Date().toISOString().slice(0, 10),
          status: 'COMPLETED',
          chunkCount: 0,
          category,
          content,
        };

        projectStore.addDocument(newDoc);
        processedDocs.push(newDoc);
      }

      // Automatically trigger health recalculation
      projectStore.health = computeHealthScore(
        projectStore.risks,
        projectStore.blockers,
        projectStore.actions,
        projectStore.health.history
      );

      res.json({
        message: `${processedDocs.length} document(s) uploaded and indexed successfully into RAG knowledge base.`,
        uploadedDocuments: processedDocs,
        totalKnowledgeChunks: projectStore.rag.getAllChunks().length,
      });
    } catch (error: any) {
      console.error('Upload processing error:', error);
      res.status(500).json({ error: error.message || 'Failed to process document upload' });
    }
  }
);

// POST /api/upload-json (Direct JSON upload with Base64 / raw text for reliable proxy and iframe compatibility)
app.post('/api/upload-json', async (req: Request, res: Response) => {
  try {
    const { files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files received in request payload.' });
    }

    const processedDocs: ProjectDocument[] = [];

    for (const file of files) {
      const originalName = file.name || 'document.txt';
      const ext = path.extname(originalName).toLowerCase().replace('.', '').toUpperCase();
      let type: ProjectDocument['type'] = 'TXT';
      if (ext === 'PDF') type = 'PDF';
      else if (ext === 'DOCX' || ext === 'DOC') type = 'DOCX';
      else if (ext === 'CSV' || ext === 'TSV') type = 'CSV';
      else if (ext === 'XLSX' || ext === 'XLS') type = 'XLSX';

      const lower = originalName.toLowerCase();
      let category: ProjectDocument['category'] = 'general';
      if (lower.includes('srs') || lower.includes('req') || lower.includes('spec')) category = 'requirements';
      else if (lower.includes('arch') || lower.includes('design') || lower.includes('system')) category = 'architecture';
      else if (lower.includes('meet') || lower.includes('note') || lower.includes('retro') || lower.includes('standup')) category = 'meetings';
      else if (lower.includes('task') || lower.includes('track') || lower.includes('sprint') || lower.includes('backlog') || lower.includes('jira')) category = 'tasks';

      let content = file.content || '';

      // If base64 binary is provided (for PDF, DOCX, XLSX)
      if (file.base64 && file.base64.length > 0) {
        try {
          const rawBase64 = file.base64.includes(',') ? file.base64.split(',')[1] : file.base64;
          const buffer = Buffer.from(rawBase64, 'base64');
          content = await extractTextFromBuffer(buffer, originalName);
        } catch (b64Err: any) {
          console.warn(`Base64 extraction warning for ${originalName}:`, b64Err);
          if (!content) content = `[File: ${originalName}]\nIngested document content.`;
        }
      }

      if (!content || content.trim().length === 0) {
        content = `[File: ${originalName}]\nProject document artifact processed for intelligence analysis.`;
      }

      const newDoc: ProjectDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: originalName,
        type,
        size: file.size || '12 KB',
        uploadDate: new Date().toISOString().slice(0, 10),
        status: 'COMPLETED',
        chunkCount: 0,
        category,
        content,
      };

      projectStore.addDocument(newDoc);
      processedDocs.push(newDoc);
    }

    // Automatically trigger health recalculation
    projectStore.health = computeHealthScore(
      projectStore.risks,
      projectStore.blockers,
      projectStore.actions,
      projectStore.health.history
    );

    res.json({
      message: `${processedDocs.length} document(s) uploaded and indexed successfully into RAG knowledge base.`,
      uploadedDocuments: processedDocs,
      totalKnowledgeChunks: projectStore.rag.getAllChunks().length,
    });
  } catch (error: any) {
    console.error('JSON upload processing error:', error);
    res.status(500).json({ error: error.message || 'Failed to process document upload' });
  }
});

// GET /api/documents/:id/download
app.get('/api/documents/:id/download', (req: Request, res: Response) => {
  const doc = projectStore.documents.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const safeFilename = doc.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(doc.content);
});

// GET /api/sample-files/download/:filename (Real DOCX and XLSX documents)
app.get('/api/sample-files/download/:filename', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename.toLowerCase();

    if (filename === 'project_overview.docx') {
      const buffer = await generateProjectOverviewDocx();
      res.setHeader('Content-Disposition', 'attachment; filename="project_overview.docx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }

    if (filename === 'requirements.docx') {
      const buffer = await generateRequirementsDocx();
      res.setHeader('Content-Disposition', 'attachment; filename="requirements.docx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }

    if (filename === 'project_timeline.xlsx') {
      const buffer = await generateProjectTimelineXlsx();
      res.setHeader('Content-Disposition', 'attachment; filename="project_timeline.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }

    if (filename === 'risk_register.xlsx') {
      const buffer = await generateRiskRegisterXlsx();
      res.setHeader('Content-Disposition', 'attachment; filename="risk_register.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }

    if (filename === 'weekly_progress.docx') {
      const buffer = await generateWeeklyProgressDocx();
      res.setHeader('Content-Disposition', 'attachment; filename="weekly_progress.docx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }

    return res.status(404).json({ error: `File ${filename} not supported` });
  } catch (err: any) {
    console.error('Error generating sample document:', err);
    res.status(500).json({ error: 'Failed to generate sample document' });
  }
});

// GET /api/sample-files/:format (Download real-life sample project files: docx, pdf, txt, csv)
app.get('/api/sample-files/:format', (req: Request, res: Response) => {
  const format = req.params.format.toLowerCase();
  const matchedDoc = projectStore.documents.find((d) => d.type.toLowerCase() === format);

  if (!matchedDoc) {
    return res.status(404).json({ error: `Sample document for format ${format} not found` });
  }

  const safeFilename = matchedDoc.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('Content-Type', format === 'csv' ? 'text/csv; charset=utf-8' : 'text/plain; charset=utf-8');
  res.send(matchedDoc.content);
});

// DELETE /api/documents/:id
app.delete('/api/documents/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const removed = projectStore.removeDocument(id);
  if (!removed) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.json({ message: 'Document removed from knowledge base', remainingDocuments: projectStore.documents.length });
});

// POST /api/documents/clear-all (Clear all sample/existing documents)
app.post('/api/documents/clear-all', (req: Request, res: Response) => {
  projectStore.clearAllDocuments();
  res.json({ message: 'All documents cleared from knowledge base', remainingDocuments: 0 });
});

// DELETE /api/documents (Bulk delete all)
app.delete('/api/documents', (req: Request, res: Response) => {
  projectStore.clearAllDocuments();
  res.json({ message: 'All documents cleared from knowledge base', remainingDocuments: 0 });
});

// POST /api/risks/clear
app.post('/api/risks/clear', (req: Request, res: Response) => {
  projectStore.risks = [];
  projectStore.tasksAtRisk = [];
  res.json({ message: 'Risks cleared', remainingRisks: 0 });
});

// Helper to build synthesized tabular documentation output matching the Documentation Agent specifications
function buildSynthesizedDocOutput(
  scope: any,
  risks: any[],
  actions: any[]
): string {
  // If no project documents have been uploaded, strictly return empty documentation
  if (!projectStore.documents || projectStore.documents.length === 0) {
    return '';
  }

  // 1. User Stories
  const rawObjectives = (scope?.objectives && scope.objectives.length > 0)
    ? scope.objectives
    : [];

  if (rawObjectives.length === 0 && (!risks || risks.length === 0) && (!actions || actions.length === 0)) {
    return '';
  }

  const userStories = rawObjectives.map((obj: string, i: number) => {
    const id = `US-0${i + 1}`;
    const cleanObj = obj.replace(/^[-*•\d.]+\s*/, '').trim();
    return `${id}\tAs a Project Member, I want to ${cleanObj.replace(/^to\s+/i, '')}, so that project delivery milestones are achieved on schedule.`;
  });

  // 2. Risk Register
  const riskRows = (risks && risks.length > 0 ? risks : []).map((r: any, i: number) => {
    const id = r.id || `R-0${i + 1}`;
    const p = r.probability ? `${r.probability}%` : '50%';
    const imp = r.impact ? `${r.impact}%` : '50%';
    const cleanTitle = (r.title || 'Identified project constraint').replace(/[\t\n]/g, ' ');
    const cleanMitigation = (r.mitigation || 'Continuous monitoring and assigned sprint follow-up').replace(/[\t\n]/g, ' ');
    return `${id}\t${cleanTitle}\t${r.category || 'Technical'}\t${p}\t${imp}\t${cleanMitigation}`;
  });

  if (riskRows.length === 0) {
    riskRows.push('R-01\tNo critical risks detected in current documents\tGeneral\t—\t—\tContinue continuous monitoring');
  }

  // 3. Action Items
  const actionRows = (actions && actions.length > 0 ? actions : []).map((a: any, i: number) => {
    const id = a.id || `A-0${i + 1}`;
    const cleanTask = (a.task || 'Review project status').replace(/[\t\n]/g, ' ');
    const owner = a.owner || 'Project Lead';
    const deadline = a.deadline || 'Upcoming';
    const priority = a.priority || 'High';
    const status = a.status || 'Pending';
    return `${id}\t${cleanTask}\t${owner}\t${deadline}\t${priority}\t${status}`;
  });

  if (actionRows.length === 0) {
    actionRows.push('A-01\tReview and verify uploaded project documentation\tProject Lead\tImmediate\tHigh\tPending');
  }

  return [
    '1. User Stories',
    'ID\tUser Story',
    ...userStories,
    '',
    '2. Risk Register',
    'ID\tRisk\tType\tProbability\tImpact\tMitigation',
    ...riskRows,
    '',
    '3. Action Items',
    'ID\tAction\tResponsible Team\tDue Date\tPriority\tStatus',
    ...actionRows
  ].join('\n');
}

// POST /api/pipeline/run
app.post('/api/pipeline/run', async (req: Request, res: Response) => {
  try {
    if (projectStore.documents.length === 0) {
      projectStore.clearAllDocuments();
      return res.json({
        message: 'No documents in knowledge base. Upload your project documents to extract real risks.',
        scope: projectStore.scope,
        risks: [],
        blockers: [],
        actions: [],
        tasksAtRisk: [],
        health: projectStore.health,
        documentationOutput: '',
        masterReport: null,
      });
    }

    const combinedContent = projectStore.documents.map((d) => `=== DOCUMENT: ${d.name} (${d.category}) ===\n${d.content}`).join('\n\n');

    // 1. Run Scope Extraction Agent
    const extractedScope = await extractProjectScope(combinedContent);
    projectStore.scope = extractedScope;

    // 2. Run Risk Detection Agent
    const detectedRisks = await detectProjectRisks(combinedContent);
    projectStore.risks = detectedRisks;

    // 3. Run Blocker & Action Item Agent
    const { blockers, actions } = await extractBlockersAndActions(combinedContent);
    projectStore.blockers = blockers;
    projectStore.actions = actions;

    // 4. Run Task Risk Detection
    projectStore.tasksAtRisk = await detectTasksAtRisk(combinedContent, projectStore.risks);

    // Reset conflicts to empty unless new cross-document conflicts are found
    projectStore.conflicts = [];

    // 5. Run Health Scoring Engine
    projectStore.health = computeHealthScore(
      projectStore.risks,
      projectStore.blockers,
      projectStore.actions,
      projectStore.health.history
    );

    // 6. Run Documentation Generation Agent (User Stories, Risk Register, Action Items)
    projectStore.latestDocGenerationOutput = buildSynthesizedDocOutput(
      projectStore.scope,
      projectStore.risks,
      projectStore.actions
    );

    const docGenResult = await generateDocumentReport(
      'complete_intelligence',
      projectStore.scope,
      projectStore.risks,
      projectStore.blockers,
      projectStore.actions,
      projectStore.health
    );

    // Save as latest generated documentation
    const masterReport: GeneratedReport = {
      id: `rep-master-${Date.now()}`,
      type: 'complete_intelligence',
      title: 'Project Intelligence & Risk Master Dossier',
      createdAt: new Date().toISOString(),
      format: 'PDF',
      content: projectStore.latestDocGenerationOutput + '\n\n' + docGenResult.content,
      metadata: {
        healthScore: projectStore.health.overall,
        riskCount: projectStore.risks.length,
        blockerCount: projectStore.blockers.length,
        documentsAnalyzed: projectStore.documents.length,
      },
    };
    projectStore.reports.unshift(masterReport);

    res.json({
      message: 'Automatic Multi-Agent Pipeline completed successfully.',
      scope: projectStore.scope,
      risks: projectStore.risks,
      blockers: projectStore.blockers,
      actions: projectStore.actions,
      tasksAtRisk: projectStore.tasksAtRisk,
      health: projectStore.health,
      documentationOutput: projectStore.latestDocGenerationOutput,
      masterReport,
    });
  } catch (error: any) {
    console.error('Pipeline execution error:', error);
    res.status(500).json({ error: error.message || 'Pipeline execution failed' });
  }
});

// POST /api/ask (Conversational AI Assistant with Routing & RAG)
app.post('/api/ask', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    if (projectStore.documents.length === 0) {
      return res.json({
        answer: "I am your dedicated **AI Project Intelligence & Risk Advisor**.\n\nNo project documents are currently uploaded to the knowledge base. Please upload your project artifacts (proposals, SRS documents, meeting notes, sprint retros, or task trackers) in the **Documents** tab and run the analysis pipeline so I can analyze risks, blockers, deadlines, and deliverables for your project.",
        agentUsed: "Project Intelligence Advisor",
        sources: [],
      });
    }

    // 1. Intent Detection via Routing Agent
    const { agent, reason } = await routeQuery(query);

    let agentName = "RAG Project Knowledge Assistant";
    if (agent === 'scope') agentName = "Scope Extraction Agent";
    else if (agent === 'risk') agentName = "Risk Detection Agent";
    else if (agent === 'blocker_action') agentName = "Blocker & Action Item Agent";
    else if (agent === 'health') agentName = "Health Scoring Engine";

    // 2. Retrieve Relevant Context via RAG
    const searchResults = projectStore.rag.search(query, 5);
    const { contextText, sources } = projectStore.rag.buildContext(searchResults);

    // If no documents exist in the knowledge base
    if (projectStore.documents.length === 0) {
      return res.json({
        answer: "No project documents have been uploaded to the knowledge base yet.\n\nI am your dedicated **AI Project Intelligence & Risk Advisor**. Please upload your project artifacts (proposals, SRS documents, meeting notes, sprint retros, or task trackers) in the **Documents** tab and run the analysis pipeline so I can answer questions grounded in your project deliverables.",
        agentUsed: "Project Intelligence Advisor",
        sources: [],
      });
    }

    // Off-topic / Unnecessary Question Guardrail
    const qLower = query.toLowerCase().trim();
    const offTopicKeywords = [
      'weather', 'recipe', 'cook', 'bake', 'joke', 'movie', 'song', 'celebrity', 
      'horoscope', 'football', 'basketball', 'cricket', 'president', 'capital of', 
      'translate to', 'write a poem', 'who are you', 'how are you', 'what is the meaning of life'
    ];
    const isUnrelated = offTopicKeywords.some((k) => qLower.includes(k)) && !contextText;

    if (isUnrelated) {
      return res.json({
        answer: "I am your dedicated **AI Project Intelligence & Risk Advisor**.\n\nI can only assist with questions regarding your **project documents, scope, architecture, delivery risks, active blockers, and milestone deliverables**.\n\n**Suggested Project Questions:**\n- *'What are the highest priority delivery risks?'*\n- *'What blockers are currently delaying the project?'*\n- *'Summarize our project scope and upcoming milestones'*\n- *'What are the assigned action items and deadlines?'*",
        agentUsed: "Guardrail Safety Filter",
        sources: [],
      });
    }

    // 3. Generate answer using Gemini if API key is present
    let answerText = "";

    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are the ${agentName} inside the "AI Project Intelligence & Risk Advisor" platform.
Answer the user's question accurately, professionally, and authoritatively, relying PRIMARILY on the provided project context retrieved from the uploaded documents.

IMPORTANT GUARDRAIL RULES:
1. Ground your response STRICTLY in the provided document excerpts and project data.
2. If the user asks an off-topic or unnecessary question (e.g., jokes, general trivia, weather, cooking, entertainment, or questions unrelated to software project management and the uploaded artifacts), politely decline:
"I am your dedicated **AI Project Intelligence & Risk Advisor**. I can only assist with questions grounded in your project documents, scope, architecture, risks, blockers, and milestone deliverables."
3. If the user asks about something absent from the project documents, state clearly: "I could not find sufficient information in the uploaded project documents to answer this question."
4. Format with clean bullet points, bold headers, and structured tables where helpful.
5. Keep the tone enterprise, clear, and proactive.

User Question: "${query}"

Retrieved Context from Uploaded Project Documents:
${contextText || 'No direct text match found in documents.'}

Current Project Intelligence Summary:
- Project Name: ${projectStore.documents[0]?.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Active Project Workspace'}
- Project Health Score: ${projectStore.health.overall}/100 (${projectStore.health.status})
- Deadlines: ${JSON.stringify(projectStore.scope.deadlines)}
- Critical Risks: ${projectStore.risks.filter(r => r.severity === 'Critical').map(r => r.title).join(', ') || 'None identified'}
- Active Blockers: ${projectStore.blockers.filter(b => b.status === 'Active').map(b => b.title).join(', ') || 'None identified'}`;

        const geminiRes = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
        });

        answerText = geminiRes.text || "";
      } catch (err) {
        console.warn('Gemini chat error, fallback to deterministic synthesis:', err);
      }
    }

    // Deterministic grounded response fallback if Gemini is offline
    if (!answerText) {
      const topDocName = projectStore.documents[0]?.name || 'uploaded artifacts';
      if (qLower.includes('deadline') || qLower.includes('when')) {
        const deadlines = projectStore.scope.deadlines;
        if (deadlines.length > 0) {
          answerText = `Based on the uploaded **${topDocName}** and milestone schedule:\n` +
            deadlines.map(d => `- **${d.item}:** **${d.date}** (${d.criticality} Priority)`).join('\n');
        } else {
          answerText = `Based on your uploaded documents, milestone deadlines are currently being indexed or have not been explicitly specified in the text.`;
        }
      } else if (qLower.includes('risk')) {
        const topRisks = projectStore.risks.slice(0, 3);
        if (topRisks.length > 0) {
          answerText = `Based on the project documents, there are **${projectStore.risks.length} identified risks**, with the highest priority being:\n` +
            topRisks.map((r, i) => `${i + 1}. **${r.title}** (${r.severity} Severity, ${r.probability} Probability) - *${r.description}*`).join('\n') +
            `\n\n**Key Mitigation:** ${topRisks[0]?.mitigation}`;
        } else {
          answerText = `No critical project risks detected in the current knowledge base.`;
        }
      } else if (qLower.includes('blocker') || qLower.includes('blocked')) {
        const activeBlockers = projectStore.blockers.filter(b => b.status === 'Active');
        if (activeBlockers.length > 0) {
          answerText = `There are currently **${activeBlockers.length} active blockers** recorded:\n` +
            activeBlockers.map((b, i) => `${i + 1}. **${b.title}** (Priority: ${b.priority}): ${b.impact}`).join('\n') +
            `\n\n**Suggested Resolution:** ${activeBlockers[0]?.suggestedResolution}`;
        } else {
          answerText = `There are zero active blockers recorded in the current project knowledge base.`;
        }
      } else if (qLower.includes('scope') || qLower.includes('objective')) {
        answerText = `### Project Scope Summary:
${projectStore.scope.scope || 'Scope synthesis in progress.'}

**Primary Objectives:**
${projectStore.scope.objectives.length > 0 ? projectStore.scope.objectives.map(o => `- ${o}`).join('\n') : '- Awaiting specific objectives'}

**Key Deliverables:**
${projectStore.scope.deliverables.length > 0 ? projectStore.scope.deliverables.map(d => `- ${d}`).join('\n') : '- Awaiting specific deliverables'}`;
      } else if (qLower.includes('health') || qLower.includes('score')) {
        answerText = `The current Project Health Score is **${projectStore.health.overall} / 100** (**${projectStore.health.status}**).
- **Risk Stability:** ${projectStore.health.metrics.riskScore}/100
- **Schedule Adherence:** ${projectStore.health.metrics.scheduleScore}/100
- **Scope Clarity:** ${projectStore.health.metrics.scopeScore}/100
- **Blocker Resolution:** ${projectStore.health.metrics.blockerScore}/100
- **Resource Capacity:** ${projectStore.health.metrics.resourceScore}/100

${projectStore.health.summary}`;
      } else if (contextText) {
        answerText = `Based on your uploaded project documentation (**${topDocName}**):\n\n${contextText.slice(0, 450)}...\n\nLet me know if you would like deeper details on specific tasks, mitigations, or milestones.`;
      } else {
        answerText = `I am your dedicated **AI Project Intelligence & Risk Advisor**. I can only answer questions related to your project documents, scope, architecture, risks, blockers, and milestone deliverables.\n\nPlease ask about project risks, deliverables, blockers, or health status.`;
      }
    }

    const uniqueSources = sources.length > 0 ? sources : projectStore.documents.map((d) => d.name);

    // Save to chat history
    projectStore.chatHistory.push(
      {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: new Date().toISOString(),
      },
      {
        id: `ai-${Date.now() + 1}`,
        role: 'assistant',
        content: answerText,
        timestamp: new Date().toISOString(),
        agentUsed: agentName,
        sources: uniqueSources,
      }
    );

    res.json({
      answer: answerText,
      agentUsed: agentName,
      sources: uniqueSources,
      routingReason: reason,
    });
  } catch (error: any) {
    console.error('Chat ask error:', error);
    res.status(500).json({ error: error.message || 'Unable to connect to the project intelligence service.' });
  }
});

// GET /api/scope
app.get('/api/scope', (req: Request, res: Response) => {
  res.json(projectStore.scope);
});

// GET /api/risks
app.get('/api/risks', (req: Request, res: Response) => {
  res.json({
    risks: projectStore.risks,
    tasksAtRisk: projectStore.tasksAtRisk,
    riskMatrix: projectStore.risks.map((r) => ({
      id: r.id,
      x: r.probability,
      y: r.impact,
      label: r.title,
      severity: r.severity,
      category: r.category,
      mitigation: r.mitigation,
    })),
  });
});

// GET /api/blockers
app.get('/api/blockers', (req: Request, res: Response) => {
  res.json({
    blockers: projectStore.blockers,
  });
});

// GET /api/actions
app.get('/api/actions', (req: Request, res: Response) => {
  res.json({
    actions: projectStore.actions,
    tasksAtRisk: projectStore.tasksAtRisk,
  });
});

// GET /api/conflicts
app.get('/api/conflicts', (req: Request, res: Response) => {
  res.json({
    conflicts: projectStore.conflicts,
  });
});

// GET /api/health
app.get('/api/health', (req: Request, res: Response) => {
  res.json(projectStore.health);
});

// GET /api/health/history
app.get('/api/health/history', (req: Request, res: Response) => {
  res.json({
    current: projectStore.health.overall,
    trend: projectStore.health.trend,
    history: projectStore.health.history,
  });
});

// GET /api/documentation/latest
app.get('/api/documentation/latest', (req: Request, res: Response) => {
  // If no project documents are uploaded, return strictly empty documentation
  if (!projectStore.documents || projectStore.documents.length === 0) {
    projectStore.latestDocGenerationOutput = '';
    return res.json({
      documentationOutput: '',
      hasDocuments: false,
    });
  }

  if (!projectStore.latestDocGenerationOutput || projectStore.latestDocGenerationOutput.trim() === '') {
    projectStore.latestDocGenerationOutput = buildSynthesizedDocOutput(
      projectStore.scope,
      projectStore.risks,
      projectStore.actions
    );
  }

  res.json({
    documentationOutput: projectStore.latestDocGenerationOutput,
    hasDocuments: true,
  });
});

// POST /api/reports/generate
app.post('/api/reports/generate', async (req: Request, res: Response) => {
  try {
    const { type = 'executive_summary' } = req.body;
    const reportData = await generateDocumentReport(
      type,
      projectStore.scope,
      projectStore.risks,
      projectStore.blockers,
      projectStore.actions,
      projectStore.health
    );

    const newReport: GeneratedReport = {
      id: `rep-${Date.now()}`,
      type,
      title: reportData.title,
      createdAt: new Date().toISOString(),
      format: reportData.format,
      content: reportData.content,
      metadata: {
        healthScore: projectStore.health.overall,
        riskCount: projectStore.risks.length,
        blockerCount: projectStore.blockers.length,
        documentsAnalyzed: projectStore.documents.length,
      },
    };

    projectStore.reports.unshift(newReport);
    res.json(newReport);
  } catch (error: any) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: error.message || 'Report generation failed' });
  }
});

// GET /api/reports
app.get('/api/reports', (req: Request, res: Response) => {
  res.json({ reports: projectStore.reports });
});

// GET /api/reports/:id
app.get('/api/reports/:id', (req: Request, res: Response) => {
  const report = projectStore.reports.find((r) => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
});

// DELETE /api/reports/:id
app.delete('/api/reports/:id', (req: Request, res: Response) => {
  const idx = projectStore.reports.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Report not found' });
  projectStore.reports.splice(idx, 1);
  res.json({ message: 'Report deleted' });
});

// POST /api/project/reset
app.post('/api/project/reset', (req: Request, res: Response) => {
  projectStore.resetToDefaults();
  res.json({ message: 'Project intelligence reset to benchmark defaults.', health: projectStore.health });
});

// GET /api/chat/history
app.get('/api/chat/history', (req: Request, res: Response) => {
  res.json({ messages: projectStore.chatHistory });
});

// POST /api/chat/clear
app.post('/api/chat/clear', (req: Request, res: Response) => {
  projectStore.chatHistory = [];
  res.json({ message: 'Conversation history cleared' });
});

// ----------------------------------------------------
// VITE MIDDLEWARE SETUP FOR FULL-STACK
// ----------------------------------------------------
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
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`AI Project Intelligence Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
