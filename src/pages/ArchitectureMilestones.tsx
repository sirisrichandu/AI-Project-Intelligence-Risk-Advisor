import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  FileText,
  ShieldAlert,
  AlertOctagon,
  Activity,
  Bot,
  LayoutDashboard,
  FolderGit2,
  Download,
  ArrowRight,
  Target,
  Zap,
  Code2,
} from 'lucide-react';
import { downloadBlueprintPDF } from '../utils/pdfDownloader';

interface ArchitectureMilestonesProps {
  onNavigate: (page: string) => void;
  onOpenAssistant: (query?: string) => void;
  onRunPipeline: () => void;
  documentationOutput?: string;
}

export const ArchitectureMilestones: React.FC<ArchitectureMilestonesProps> = ({
  onNavigate,
  onRunPipeline,
}) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'techstack'>('modules');

  const TECH_STACK = [
    { layer: 'Frontend', tech: 'Streamlit (Python)', purpose: 'Interactive web dashboard, document ingestion, agent triggers, risk matrix, and conversational Q&A' },
    { layer: 'Backend', tech: 'FastAPI + Uvicorn', purpose: 'High-throughput async REST APIs and application business logic' },
    { layer: 'AI / LLM', tech: 'Google Gemini API', purpose: 'Conversational reasoning and structured multi-agent outputs' },
    { layer: 'RAG', tech: 'ChromaDB', purpose: 'Project-document vector storage and semantic retrieval' },
    { layer: 'Embeddings', tech: 'Sentence Transformers (all-MiniLM-L6-v2)', purpose: 'Convert documents and user queries into dense vector embeddings' },
    { layer: 'Document Processing', tech: 'Python', purpose: 'PDF, DOCX, XLSX, CSV, and plain text ingestion and chunking' },
    { layer: 'Agent Framework', tech: 'LangGraph', purpose: 'Deterministic agent routing and state graph workflow orchestration' },
    { layer: 'Agents', tech: 'Python', purpose: 'Scope, Risk, Blocker/Action, Documentation Generation, and Health Scoring' },
    { layer: 'Database / Storage', tech: 'ChromaDB + Project File Storage', purpose: 'Isolated project knowledge base and uploaded document chunks' },
    { layer: 'Environment', tech: '.env + python-dotenv', purpose: 'Secure environment configuration and API key isolation' },
    { layer: 'API Communication', tech: 'REST + JSON', purpose: 'Streamlit ↔ FastAPI typed DTO communication' },
    { layer: 'Version Control', tech: 'Git + GitHub', purpose: 'Source code versioning, repository management, and deployment' },
  ];

  const MODULES = [
    {
      id: 1,
      name: 'Document Ingestion & Knowledge Base Construction',
      tag: 'INGESTION ENGINE',
      description:
        'Accepts multi-format project artifacts (PDF, DOCX, CSV, TXT) and processes proposals, SRS documents, meeting notes, and task trackers into a unified repository.',
      page: 'documents',
      icon: FolderGit2,
      status: 'VERIFIED',
      features: ['PDF & DOCX parsing', 'CSV task sheets', 'Meeting notes ingestion', 'Incremental updates'],
    },
    {
      id: 2,
      name: 'RAG Pipeline — Chunking, Embedding & Vector Store',
      tag: 'KNOWLEDGE RETRIEVAL',
      description:
        'Context-aware text chunking with category metadata, vector embedding generation, inverted index token scoring, and top-k semantic similarity retrieval.',
      page: 'documents',
      icon: Layers,
      status: 'VERIFIED',
      features: ['Category chunking', 'Vector token scoring', 'Source attribution', 'Zero hallucination bounds'],
    },
    {
      id: 3,
      name: 'Scope & Deliverable Extraction Agent',
      tag: 'AGENT 1',
      description:
        'Analyzes project specifications to extract strategic objectives, core deliverables, system scope, milestones, deadlines, and technical constraints.',
      page: 'intelligence',
      icon: Target,
      status: 'VERIFIED',
      features: ['Goal identification', 'Milestone dates', 'Deliverables tracking', 'Boundary verification'],
    },
    {
      id: 4,
      name: 'Risk Detection & Delivery Forecasting Agent',
      tag: 'AGENT 2',
      description:
        'Detects technical, schedule, resource, dependency, budget, and quality risks. Estimates probability & impact with actionable mitigation strategies.',
      page: 'risks',
      icon: ShieldAlert,
      status: 'VERIFIED',
      features: ['7 risk categories', 'Severity scoring', 'Mitigation plans', 'Scatter matrix mapping'],
    },
    {
      id: 5,
      name: 'Blocker & Action Item Identification Agent',
      tag: 'AGENT 3',
      description:
        'Scans meeting transcripts and task lists to isolate active delivery blockers, resolution recommendations, and assigned action items with deadlines.',
      page: 'blockers',
      icon: AlertOctagon,
      status: 'VERIFIED',
      features: ['Active blocker alerts', 'Resolution plans', 'Action item owners', 'Tasks at risk sync'],
    },
    {
      id: 6,
      name: 'Documentation Generation Agent',
      tag: 'AGENT 4',
      description:
        'Produces structured Agile User Stories, formal Risk Registers, and Action Item registers in tabular format with one-click single PDF export.',
      page: 'reports',
      icon: FileText,
      status: 'VERIFIED',
      features: ['US-01, US-02, US-03', 'R-01, R-02, R-03', 'A-01, A-02, A-03', 'Single PDF download'],
    },
    {
      id: 7,
      name: 'Project Health Scoring Module',
      tag: 'ANALYTICS ENGINE',
      description:
        'Calculates a 0-100 composite health score across 5 weighted dimensions: Risk Stability (30%), Schedule Adherence (20%), Scope Clarity (20%), Blocker Resolution (15%), and Resource Capacity (15%).',
      page: 'health',
      icon: Activity,
      status: 'VERIFIED',
      features: ['5-factor formula', 'Healthy/At Risk/Critical', 'Historical trends', 'Remediation advice'],
    },
    {
      id: 8,
      name: 'Conversational Project Intelligence Assistant',
      tag: 'CONVERSATIONAL AI',
      description:
        'RAG-grounded natural language assistant with automatic intent routing to specialized agents. Cites exact document sources for verification.',
      page: 'assistant',
      icon: Bot,
      status: 'VERIFIED',
      features: ['Intent router', 'Document citations', 'Context grounding', 'Suggested queries'],
    },
    {
      id: 9,
      name: 'Project Insights & Risk Summary Dashboard',
      tag: 'EXECUTIVE UI',
      description:
        'Comprehensive single-pane enterprise dashboard with metric counters, SVG Health Gauge, interactive Risk Priority Matrix, and Tasks at Risk tracking.',
      page: 'dashboard',
      icon: LayoutDashboard,
      status: 'VERIFIED',
      features: ['Executive metrics', 'Visual health gauge', 'Interactive scatter plot', 'Pipeline stepper'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold">
              SYSTEM ARCHITECTURE & SPEC
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            AI Project Intelligence & Risk Advisor — Technical Blueprint
          </h2>
          <p className="text-xs text-slate-400">
            Architectural mapping of the 9 functional intelligence modules and the enterprise technology stack.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRunPipeline}
            className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/20"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Run Pipeline</span>
          </button>
          <button
            onClick={() => downloadBlueprintPDF()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Project Statement & Outcomes Banner */}
      <div className="glass-panel p-6 border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-teal-950/20">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
                PROJECT STATEMENT & PURPOSE
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Transforming Scattered Artifacts into a Living, Queryable Intelligence Layer
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Software development teams and project groups frequently struggle with incomplete planning, missed deadlines, undetected risks, and scattered documentation. While teams do generate project-related documents — proposals, meeting notes, sprint updates, task lists, and progress reports — extracting actionable intelligence from these scattered artifacts manually is time-consuming and prone to human oversight.
            </p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              <strong>The Objective:</strong> An intelligent platform where teams upload existing project documents (PDF, DOCX, CSV, TXT) and receive automated insights, risk forecasts, and actionable recommendations powered by a unified RAG knowledge base and specialized multi-agent pipeline.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-start gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                <span>Unified RAG knowledge base from scattered project artifacts</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                <span>Multi-agent scope, risk, and delivery challenge forecasting</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                <span>Auto-generation of User Stories, Risk Register, and Action Items</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                <span>RAG conversational assistant grounded in uploaded content</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex flex-row lg:flex-col gap-3 shrink-0">
            <div className="glass-panel p-3.5 bg-slate-950/80 border-slate-800 min-w-[140px]">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Modules</span>
              <span className="text-2xl font-bold font-mono text-teal-400">9 / 9</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> All Operational
              </span>
            </div>
            <div className="glass-panel p-3.5 bg-slate-950/80 border-slate-800 min-w-[140px]">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Tech Stack</span>
              <span className="text-2xl font-bold font-mono text-teal-400">12</span>
              <span className="text-[10px] text-teal-300 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> Architecture Layers
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('modules')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'modules'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>9 Core Modules</span>
        </button>
        <button
          onClick={() => setActiveTab('techstack')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'techstack'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Technology Stack Architecture</span>
        </button>
      </div>

      {/* TAB 1: 9 MODULES */}
      {activeTab === 'modules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                className="glass-panel p-5 flex flex-col justify-between hover:border-slate-700 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                        {mod.tag}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> {mod.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white tracking-tight mb-2">
                    Module {mod.id}: {mod.name}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {mod.description}
                  </p>

                  <div className="space-y-1.5 mb-4">
                    {mod.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
                        <span className="w-1 h-1 rounded-full bg-teal-400" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onNavigate(mod.page)}
                  className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-800 flex items-center justify-center gap-1.5 transition-colors group-hover:border-teal-500/40 group-hover:text-teal-300"
                >
                  <span>Open Module View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: TECHNOLOGY STACK */}
      {activeTab === 'techstack' && (
        <div className="space-y-4">
          <div className="glass-panel p-6 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Enterprise Technology Stack Architecture</h3>
                <p className="text-xs text-slate-400">
                  Target implementation mapping for multi-agent reasoning, vector storage, and interactive interfaces.
                </p>
              </div>
              <span className="text-xs font-mono text-teal-400 font-semibold px-2.5 py-1 rounded bg-teal-500/10 border border-teal-500/30 self-start sm:self-auto">
                12 Production Layers
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Layer</th>
                    <th className="pb-3 font-semibold">Technology</th>
                    <th className="pb-3 font-semibold">Purpose & Responsibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {TECH_STACK.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 font-bold text-white whitespace-nowrap">
                        {item.layer}
                      </td>
                      <td className="py-3.5 font-mono font-medium text-teal-300 whitespace-nowrap">
                        {item.tech}
                      </td>
                      <td className="py-3.5 text-slate-300 leading-relaxed">
                        {item.purpose}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
