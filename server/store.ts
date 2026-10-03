import {
  ProjectDocument,
  ProjectScopeData,
  RiskItem,
  BlockerItem,
  ActionItem,
  TaskAtRisk,
  DocumentConflict,
  HealthBreakdown,
  SAMPLE_DOCUMENTS,
  INITIAL_SCOPE,
  INITIAL_RISKS,
  INITIAL_BLOCKERS,
  INITIAL_ACTIONS,
  INITIAL_TASKS_AT_RISK,
  INITIAL_CONFLICTS,
  INITIAL_HEALTH,
} from './sampleData.js';
import { RAGPipeline } from './ragEngine.js';

export interface GeneratedReport {
  id: string;
  type: 'project_report' | 'executive_summary' | 'risk_assessment' | 'blocker_action' | 'user_stories' | 'complete_intelligence';
  title: string;
  createdAt: string;
  format: 'PDF' | 'DOCX' | 'MARKDOWN' | 'JSON';
  content: string;
  metadata: {
    healthScore: number;
    riskCount: number;
    blockerCount: number;
    documentsAnalyzed: number;
  };
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agentUsed?: string;
  sources?: string[];
}

export const DEFAULT_DOCUMENTATION_GENERATION_OUTPUT = '';

export class ProjectStore {
  public documents: ProjectDocument[] = [];
  public scope: ProjectScopeData = INITIAL_SCOPE;
  public risks: RiskItem[] = INITIAL_RISKS;
  public blockers: BlockerItem[] = INITIAL_BLOCKERS;
  public actions: ActionItem[] = INITIAL_ACTIONS;
  public tasksAtRisk: TaskAtRisk[] = INITIAL_TASKS_AT_RISK;
  public conflicts: DocumentConflict[] = INITIAL_CONFLICTS;
  public health: HealthBreakdown = INITIAL_HEALTH;
  public reports: GeneratedReport[] = [];
  public chatHistory: ChatMessageItem[] = [];
  public latestDocGenerationOutput: string = '';
  public rag: RAGPipeline;

  constructor() {
    this.rag = new RAGPipeline();
    this.clearAllDocuments();
  }

  public resetToDefaults() {
    this.latestDocGenerationOutput = DEFAULT_DOCUMENTATION_GENERATION_OUTPUT;
    this.documents = JSON.parse(JSON.stringify(SAMPLE_DOCUMENTS));
    this.scope = JSON.parse(JSON.stringify(INITIAL_SCOPE));
    this.risks = JSON.parse(JSON.stringify(INITIAL_RISKS));
    this.blockers = JSON.parse(JSON.stringify(INITIAL_BLOCKERS));
    this.actions = JSON.parse(JSON.stringify(INITIAL_ACTIONS));
    this.tasksAtRisk = JSON.parse(JSON.stringify(INITIAL_TASKS_AT_RISK));
    this.conflicts = JSON.parse(JSON.stringify(INITIAL_CONFLICTS));
    this.health = JSON.parse(JSON.stringify(INITIAL_HEALTH));
    this.reports = [
      {
        id: "rep-01",
        type: "executive_summary",
        title: "HealthPulse Executive Intelligence Summary",
        createdAt: "2026-09-30T14:22:00Z",
        format: "MARKDOWN",
        content: `# Executive Project Intelligence Summary
**Project:** HealthPulse Enterprise Clinical Platform
**Target Release:** December 15, 2026
**Overall Health Score:** 82 / 100 (Healthy)

### 1. Strategic Scope & Objectives
HealthPulse aims to unify clinical decision support with HIPAA-compliant telemetry and automated billing authorization. Core deliverables are 65% complete.

### 2. High Priority Risks & Blockers
- **Critical Dependency:** Third-party clearinghouse sandbox credentials are delayed 12 days.
- **Resource Bottleneck:** Lead Database Architect Sarah Jenkins will be on leave during legacy schema migration.
- **Scope Dispute:** Client requested an unscheduled PDF clinical report generator for the December release.

### 3. Recommendations
1. Establish executive contact with the payment vendor to expedite API credentials.
2. Deploy temporary mock clearinghouse stubs for developer integration testing.
3. Conduct knowledge transfer on database migration scripts before leave begins.`,
        metadata: {
          healthScore: 82,
          riskCount: 7,
          blockerCount: 3,
          documentsAnalyzed: 4
        }
      }
    ];

    this.chatHistory = [
      {
        id: "msg-1",
        role: "assistant",
        content: "Hello! I am your **Project Intelligence & Risk Advisor**. I have processed 4 project documents (SRS, Architecture, Sprint 4 Notes, and Task Tracker). Ask me anything about project scope, risks, blockers, pending actions, deadlines, or health status.",
        timestamp: new Date().toISOString(),
        agentUsed: "Routing Agent",
        sources: ["HealthPulse_SRS_v2.docx", "Sprint_04_Meeting_Notes.txt"]
      }
    ];

    // Re-index all sample documents into RAG
    this.reindexAllDocuments();
  }

  public reindexAllDocuments() {
    this.rag = new RAGPipeline();
    for (const doc of this.documents) {
      const chunks = this.rag.chunkText(doc.content, doc.id, doc.name, doc.category);
      doc.chunkCount = chunks.length;
      this.rag.addChunks(chunks);
    }
  }

  public addDocument(doc: ProjectDocument): void {
    this.documents.push(doc);
    const chunks = this.rag.chunkText(doc.content, doc.id, doc.name, doc.category);
    doc.chunkCount = chunks.length;
    this.rag.addChunks(chunks);
  }

  public removeDocument(id: string): boolean {
    const idx = this.documents.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    this.documents.splice(idx, 1);
    this.rag.removeDocumentChunks(id);
    return true;
  }

  public clearAllDocuments(): void {
    this.documents = [];
    this.rag = new RAGPipeline();
    this.scope = {
      objectives: [],
      scope: 'Knowledge base is currently empty. Upload your project documents above to extract scope, requirements, and milestones.',
      requirements: [],
      deliverables: [],
      milestones: [],
      deadlines: [],
      constraints: [],
      summary: 'No documents uploaded yet. Upload your project documents to extract strategic objectives and deliverables.',
    };
    this.risks = [];
    this.blockers = [];
    this.actions = [];
    this.tasksAtRisk = [];
    this.conflicts = [];
    this.health = {
      overall: 0,
      status: 'Awaiting Documents',
      metrics: {
        riskScore: 0,
        scheduleScore: 0,
        scopeScore: 0,
        blockerScore: 0,
        resourceScore: 0,
      },
      summary: 'Upload your real project documents (PDF, DOCX, XLSX, CSV, TXT) and run the pipeline to calculate the health score and evaluate risk dimensions.',
      trend: 'Stable',
      history: [],
    };
    this.reports = [];
    this.latestDocGenerationOutput = '';
  }
}

export const projectStore = new ProjectStore();
