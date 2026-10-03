import React from 'react';
import {
  Settings,
  Database,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Terminal,
  Code2,
  Workflow,
  Server,
  FileCode,
  GitBranch,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const TECH_STACK = [
    {
      layer: 'Frontend',
      tech: 'React.js + Vite',
      purpose: 'Dashboard, document upload, agent selection, Q&A',
      icon: Code2,
      badge: 'React 19 / Tailwind',
    },
    {
      layer: 'Backend',
      tech: 'FastAPI + Uvicorn',
      purpose: 'REST APIs and application logic',
      icon: Server,
      badge: 'High-throughput Async',
    },
    {
      layer: 'AI / LLM',
      tech: 'Google Gemini API',
      purpose: 'Conversational answers and structured agent outputs',
      icon: Cpu,
      badge: 'gemini-3.8-flash',
    },
    {
      layer: 'RAG',
      tech: 'ChromaDB',
      purpose: 'Project-document vector storage and retrieval',
      icon: Database,
      badge: 'Vector Indexing',
    },
    {
      layer: 'Embeddings',
      tech: 'Sentence Transformers (all-MiniLM-L6-v2)',
      purpose: 'Convert documents/questions into embeddings',
      icon: Layers,
      badge: '384-dim Vectors',
    },
    {
      layer: 'Document Processing',
      tech: 'Python',
      purpose: 'PDF/DOCX/CSV/TXT ingestion and processing',
      icon: FileCode,
      badge: 'Multi-Format Parser',
    },
    {
      layer: 'Agent Framework',
      tech: 'LangGraph',
      purpose: 'Agent routing and workflow orchestration',
      icon: Workflow,
      badge: 'StateGraph Pipeline',
    },
    {
      layer: 'Agents',
      tech: 'Python',
      purpose: 'Scope, Risk, Blocker/Action, Documentation, Health Scoring',
      icon: Terminal,
      badge: '5 Specialized Agents',
    },
    {
      layer: 'Database / Storage',
      tech: 'ChromaDB + project file storage',
      purpose: 'Project-specific knowledge and uploaded documents',
      icon: Database,
      badge: 'Isolated Persistence',
    },
    {
      layer: 'Environment',
      tech: '.env + python-dotenv',
      purpose: 'Secure API-key management',
      icon: ShieldCheck,
      badge: 'Zero Secret Leaks',
    },
    {
      layer: 'API Communication',
      tech: 'REST + JSON',
      purpose: 'React ↔ FastAPI communication',
      icon: Terminal,
      badge: 'Typed DTO Contracts',
    },
    {
      layer: 'Version Control',
      tech: 'Git + GitHub',
      purpose: 'Source-code and project management',
      icon: GitBranch,
      badge: 'CI / CD Automated',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400 font-semibold">
            SYSTEM ARCHITECTURE & SPEC
          </span>
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">Platform Configuration & Technology Stack</h2>
        <p className="text-xs text-slate-400">
          Target runtime specification, multi-agent framework parameters, and health algorithm scoring weights.
        </p>
      </div>

      {/* Official Technology Stack Specification Table */}
      <div className="glass-panel p-6 border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-slate-100">Project Technology Stack Architecture</h3>
          </div>
          <span className="text-xs font-mono text-teal-400 font-semibold px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
            12 Architectural Layers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="pb-3 font-semibold">Layer</th>
                <th className="pb-3 font-semibold">Technology</th>
                <th className="pb-3 font-semibold">Purpose & Responsibility</th>
                <th className="pb-3 font-semibold text-right">Specification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {TECH_STACK.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 font-medium text-slate-200">
                      <span className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span className="font-semibold text-white">{item.layer}</span>
                      </span>
                    </td>
                    <td className="py-3 font-mono font-medium text-teal-300">
                      {item.tech}
                    </td>
                    <td className="py-3 text-slate-300 max-w-md">
                      {item.purpose}
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {item.badge}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model & AI Runtime Card */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-semibold text-slate-100">AI Intelligence Core & Engine</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block mb-1">AI / LLM Runtime</span>
            <span className="text-white font-mono font-semibold">Google Gemini API</span>
            <div className="flex items-center gap-1 text-[11px] text-teal-400 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> High-speed Inference
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block mb-1">Agent Orchestration</span>
            <span className="text-white font-mono font-semibold">LangGraph Pipeline</span>
            <div className="flex items-center gap-1 text-[11px] text-teal-400 mt-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Deterministic StateGraph
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block mb-1">Vector RAG Engine</span>
            <span className="text-white font-mono font-semibold">ChromaDB + all-MiniLM-L6-v2</span>
            <div className="flex items-center gap-1 text-[11px] text-teal-400 mt-2">
              <Database className="w-3.5 h-3.5" /> Document Vector Store
            </div>
          </div>
        </div>
      </div>

      {/* Scoring Weights Architecture */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-semibold text-slate-100 mb-2">Project Health Scoring Formula Weights</h3>
        <p className="text-xs text-slate-400 mb-4">
          Configured weights determining the quantitative composite project health score (0–100 scale):
        </p>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/50 border border-slate-800">
            <span className="text-slate-300 font-medium">Risk Frequency & Severity</span>
            <span className="font-mono text-teal-400 font-bold">30% Weight</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/50 border border-slate-800">
            <span className="text-slate-300 font-medium">Schedule Adherence & Milestone Deadlines</span>
            <span className="font-mono text-teal-400 font-bold">20% Weight</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/50 border border-slate-800">
            <span className="text-slate-300 font-medium">Scope Stability & Scope Creep Frequency</span>
            <span className="font-mono text-teal-400 font-bold">20% Weight</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/50 border border-slate-800">
            <span className="text-slate-300 font-medium">Active Blockers & Impediments</span>
            <span className="font-mono text-teal-400 font-bold">15% Weight</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/50 border border-slate-800">
            <span className="text-slate-300 font-medium">Resource Capacity & Redundancy</span>
            <span className="font-mono text-teal-400 font-bold">15% Weight</span>
          </div>
        </div>
      </div>
    </div>
  );
};
