import React from 'react';
import { ProjectScopeData } from '../types';
import {
  Target,
  FileCheck2,
  Package,
  Milestone,
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Calendar,
  FolderGit2,
  ArrowRight,
} from 'lucide-react';

interface ProjectIntelligenceProps {
  scope: ProjectScopeData;
  hasDocuments?: boolean;
  onNavigate?: (page: string) => void;
}

const renderString = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    return val.item || val.name || val.title || val.description || val.text || '';
  }
  return String(val);
};

export const ProjectIntelligence: React.FC<ProjectIntelligenceProps> = ({
  scope,
  hasDocuments = true,
  onNavigate,
}) => {
  const safeObjectives = Array.isArray(scope?.objectives) ? scope.objectives.map(renderString).filter(Boolean) : [];
  const safeDeliverables = Array.isArray(scope?.deliverables) ? scope.deliverables.map(renderString).filter(Boolean) : [];
  const safeRequirements = Array.isArray(scope?.requirements) ? scope.requirements.map(renderString).filter(Boolean) : [];
  const safeMilestones = Array.isArray(scope?.milestones)
    ? scope.milestones.map((m: any) =>
        typeof m === 'string'
          ? { name: m, targetDate: 'Upcoming', status: 'Upcoming' as const }
          : {
              name: renderString(m?.name) || 'Milestone Target',
              targetDate: renderString(m?.targetDate) || 'Upcoming',
              status: (renderString(m?.status) || 'Upcoming') as 'Completed' | 'In Progress' | 'Upcoming',
            }
      )
    : [];
  const safeDeadlines = Array.isArray(scope?.deadlines)
    ? scope.deadlines.map((dl: any) =>
        typeof dl === 'string'
          ? { item: dl, date: 'Upcoming', criticality: 'Medium' as const }
          : {
              item: renderString(dl?.item) || 'Deliverable Target',
              date: renderString(dl?.date) || 'Upcoming',
              criticality: (renderString(dl?.criticality) || 'Medium') as 'High' | 'Medium' | 'Low',
            }
      )
    : [];
  const safeConstraints = Array.isArray(scope?.constraints) ? scope.constraints.map(renderString).filter(Boolean) : [];

  const isEmpty =
    !hasDocuments ||
    !scope ||
    (safeMilestones.length === 0 && safeObjectives.length === 0 && safeDeliverables.length === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400 font-semibold">
              SCOPE EXTRACTION AGENT
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Scope and Milestones</h2>
          <p className="text-xs text-slate-400">
            Synthesized objectives, deliverables, milestones, requirements, and constraints from uploaded project artifacts.
          </p>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('documents')}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-2 transition-colors"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Manage Documents</span>
          </button>
        )}
      </div>

      {isEmpty ? (
        /* Empty State Card when 0 documents exist */
        <div className="glass-panel p-10 border-slate-800 text-center flex flex-col items-center justify-center max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5 shadow-lg shadow-teal-500/5">
            <Milestone className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Awaiting Document Ingestion</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            No Scope or Milestones Extracted
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
            The knowledge base currently contains 0 project documents. Upload your Project Specification, SRS, SOW, Task Backlog, or Architecture Overview in the Documents section to automatically synthesize delivery milestones and scope.
          </p>

          {onNavigate && (
            <button
              onClick={() => onNavigate('documents')}
              className="px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm shadow-teal-500/20"
            >
              <FolderGit2 className="w-4 h-4" />
              <span>Go to Documents & Upload</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800/80 w-full grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <span className="text-[11px] font-semibold text-teal-400 block mb-1">Objectives</span>
              <span className="text-[10px] text-slate-400">Goals & business outcomes</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <span className="text-[11px] font-semibold text-indigo-400 block mb-1">Deliverables</span>
              <span className="text-[10px] text-slate-400">Tangible system packages</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <span className="text-[11px] font-semibold text-amber-400 block mb-1">Milestones</span>
              <span className="text-[10px] text-slate-400">Target dates & status roadmap</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <span className="text-[11px] font-semibold text-rose-400 block mb-1">Constraints</span>
              <span className="text-[10px] text-slate-400">SLAs & technical boundaries</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Scope Summary Card */}
          <div className="glass-panel p-6 border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-900/40">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-slate-100">Executive Scope Summary</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
              {renderString(scope?.summary)}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
              <span className="font-semibold text-teal-400">System Boundaries: </span>
              {renderString(scope?.scope)}
            </div>
          </div>

      {/* Objectives & Deliverables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Objectives */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100">Strategic Project Objectives</h3>
            </div>
            <ul className="space-y-2.5">
              {safeObjectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Deliverables */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <Package className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100">Core Deliverables</h3>
            </div>
            <ul className="space-y-2.5">
              {safeDeliverables.map((del, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{del}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Key Requirements List */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-100">Key Requirements Specification</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {safeRequirements.map((req, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{req}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones & Deadlines Dual Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Milestones Timeline */}
        <div className="md:col-span-7 glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Milestone className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">Milestone Roadmap</h3>
          </div>
          <div className="space-y-3.5">
            {safeMilestones.map((m, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">{m.name}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    Target: {m.targetDate}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border whitespace-nowrap ${
                    m.status === 'Completed'
                      ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                      : m.status === 'In Progress'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Important Deadlines Table */}
        <div className="md:col-span-5 glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">Critical Deadlines</h3>
          </div>
          <div className="space-y-3">
            {safeDeadlines.map((dl, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-medium text-slate-200 block">{dl.item}</span>
                  <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">{dl.date}</span>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                    dl.criticality === 'High'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {dl.criticality}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Constraints Card */}
      <div className="glass-panel p-6 border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-100">Project Constraints & Compliance Boundaries</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {safeConstraints.map((con, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <span className="font-semibold text-amber-400 font-mono block mb-1">Constraint 0{i + 1}</span>
              {con}
            </div>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
};
