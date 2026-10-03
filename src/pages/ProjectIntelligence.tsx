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
} from 'lucide-react';

interface ProjectIntelligenceProps {
  scope: ProjectScopeData;
}

export const ProjectIntelligence: React.FC<ProjectIntelligenceProps> = ({ scope }) => {
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
          <h2 className="text-lg font-bold text-white tracking-tight">Project Intelligence & Scope Architecture</h2>
          <p className="text-xs text-slate-400">
            Synthesized objectives, deliverables, milestones, requirements, and constraints from uploaded project artifacts.
          </p>
        </div>
      </div>

      {/* Scope Summary Card */}
      <div className="glass-panel p-6 border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-900/40">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-semibold text-slate-100">Executive Scope Summary</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          {scope.summary}
        </p>
        <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
          <span className="font-semibold text-teal-400">System Boundaries: </span>
          {scope.scope}
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
              {scope.objectives.map((obj, i) => (
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
              {scope.deliverables.map((del, i) => (
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
          {scope.requirements.map((req, i) => (
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
            {scope.milestones.map((m, i) => (
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
            {scope.deadlines.map((dl, i) => (
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
          {scope.constraints.map((con, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              <span className="font-semibold text-amber-400 font-mono block mb-1">Constraint 0{i + 1}</span>
              {con}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
