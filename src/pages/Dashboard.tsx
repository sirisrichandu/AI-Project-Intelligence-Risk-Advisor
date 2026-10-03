import React from 'react';
import {
  ProjectSummary,
  HealthBreakdown,
  RiskItem,
  TaskAtRisk,
  DocumentConflict,
} from '../types';
import { HealthGauge } from '../components/dashboard/HealthGauge';
import { RiskMatrix } from '../components/dashboard/RiskMatrix';
import { TasksAtRiskCard } from '../components/dashboard/TasksAtRiskCard';
import { ConflictCard } from '../components/dashboard/ConflictCard';
import { PipelineStepper } from '../components/shared/PipelineStepper';
import {
  HeartPulse,
  FolderGit2,
  ShieldAlert,
  AlertOctagon,
  CheckSquare,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
} from 'lucide-react';

interface DashboardProps {
  summary: ProjectSummary | null;
  health: HealthBreakdown | null;
  risks: RiskItem[];
  tasksAtRisk: TaskAtRisk[];
  conflicts: DocumentConflict[];
  isRunningPipeline: boolean;
  pipelineStep: number;
  onRunPipeline: () => void;
  onOpenAssistant: (query?: string) => void;
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  summary,
  health,
  risks,
  tasksAtRisk,
  conflicts,
  isRunningPipeline,
  pipelineStep,
  onRunPipeline,
  onOpenAssistant,
  onNavigate,
}) => {
  return (
    <div className="space-y-6">
      {/* Hero Welcome & Multi-Agent Pipeline Status Banner */}
      <div className="glass-panel p-6 border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-teal-950/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400">
                PROJECT INTELLIGENCE
              </span>
              <span className="text-xs text-slate-400">· {summary?.projectName || 'Project Workspace'}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Project Intelligence & Risk Command Center
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Automated RAG knowledge ingestion, specialized agent reasoning, real-time risk forecasting, and grounded decision support.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('documents')}
              className="px-3 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-750 border border-slate-750 text-xs font-semibold text-teal-300 flex items-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>{summary?.totalDocuments ? `${summary.totalDocuments} Docs Ingested` : 'Upload Documents'}</span>
            </button>
            <button
              onClick={() => onOpenAssistant('Summarize the project health and top 3 priorities')}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Ask AI Summary</span>
            </button>
            <button
              onClick={onRunPipeline}
              disabled={isRunningPipeline}
              className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm shadow-teal-500/30 disabled:opacity-50"
            >
              <span>{isRunningPipeline ? 'Pipeline In Flight...' : 'Run Automatic Pipeline'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Multi-Agent Execution Stepper */}
        <PipelineStepper isRunning={isRunningPipeline} currentStep={pipelineStep} />
      </div>

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Project Health */}
        <div
          onClick={() => onNavigate('health')}
          className="glass-panel glass-panel-interactive p-4 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Project Health</span>
            <HeartPulse className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {summary?.healthScore ?? 100} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-teal-400 mt-1 font-medium">
            <TrendingUp className="w-3 h-3" /> {summary?.healthStatus || 'Healthy'}
          </div>
        </div>

        {/* Total Documents */}
        <div
          onClick={() => onNavigate('documents')}
          className="glass-panel glass-panel-interactive p-4 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Documents</span>
            <FolderGit2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {summary?.totalDocuments ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">RAG Ingested Files</span>
        </div>

        {/* Identified Risks */}
        <div
          onClick={() => onNavigate('risks')}
          className="glass-panel glass-panel-interactive p-4 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Identified Risks</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {summary?.totalRisks ?? 0}
          </div>
          <span className="text-[11px] text-rose-300 mt-1 block font-medium">
            {summary?.criticalRisks ?? 0} Critical · {summary?.highRisks ?? 0} High
          </span>
        </div>

        {/* Active Blockers */}
        <div
          onClick={() => onNavigate('blockers')}
          className="glass-panel glass-panel-interactive p-4 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Blockers</span>
            <AlertOctagon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {summary?.activeBlockers ?? 0}
          </div>
          <span className="text-[11px] text-amber-300 mt-1 block font-medium">
            {(summary?.activeBlockers ?? 0) > 0 ? 'Requires Mitigation' : 'All Clear'}
          </span>
        </div>

        {/* Pending Actions */}
        <div
          onClick={() => onNavigate('actions')}
          className="glass-panel glass-panel-interactive p-4 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Pending Actions</span>
            <CheckSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {summary?.pendingActions ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Assigned in Backlog</span>
        </div>

        {/* Hard Deadline */}
        <div
          onClick={() => onNavigate('intelligence')}
          className="glass-panel glass-panel-interactive p-4 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Go-Live Date</span>
            <Calendar className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono tabular-nums leading-tight truncate">
            {summary?.projectDeadline || 'Not Set'}
          </div>
          <span className="text-[11px] text-teal-400 mt-1 block font-medium">
            {summary?.upcomingDeadlines ? `${summary.upcomingDeadlines} Milestones` : 'Target Schedule'}
          </span>
        </div>
      </div>

      {/* Main Dual Graphs: Project Health Gauge & Risk Priority Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          {health && <HealthGauge health={health} />}
        </div>
        <div className="lg:col-span-7">
          <RiskMatrix
            risks={risks}
            onSelectRisk={(r) => onOpenAssistant(`Tell me more about risk ${r.id}: ${r.title} and what steps should be taken.`)}
          />
        </div>
      </div>

      {/* Secondary Intelligence: Tasks at Risk & Cross-Document Inconsistencies */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <TasksAtRiskCard
            tasks={tasksAtRisk}
            onViewAll={() => onNavigate('actions')}
          />
        </div>
        <div className="lg:col-span-6">
          <ConflictCard conflicts={conflicts} />
        </div>
      </div>

      {/* Bottom Quick AI Inquiry Bar */}
      <div className="glass-panel p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-teal-500/20 bg-teal-950/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Need specific project intelligence?</h4>
            <p className="text-xs text-slate-400">Ask the conversational advisor about milestones, blockers, or budget allocations.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onOpenAssistant('What are the top 3 risks requiring immediate executive attention?')}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
          >
            "Top 3 Risks?"
          </button>
          <button
            onClick={() => onOpenAssistant('Who owns the delayed database migration tasks?')}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
          >
            "DB Migration Owner?"
          </button>
          <button
            onClick={() => onOpenAssistant()}
            className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap"
          >
            Open Assistant
          </button>
        </div>
      </div>
    </div>
  );
};
