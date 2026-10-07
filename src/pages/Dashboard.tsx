import React, { useState, useEffect } from 'react';
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
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  LayoutGrid,
  CheckCircle2,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'health-risks' | 'execution'>('overview');
  const [stepperExpanded, setStepperExpanded] = useState<boolean>(false);

  // Auto-expand stepper when pipeline is actively running
  useEffect(() => {
    if (isRunningPipeline) {
      setStepperExpanded(true);
    }
  }, [isRunningPipeline]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="glass-panel p-6 border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-950">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400">
              <span className="font-semibold text-teal-400">Project Workspace</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-slate-300">{summary?.projectName || 'Active Intelligence'}</span>
              <span aria-hidden="true">·</span>
              <span>{summary?.totalDocuments ? `${summary.totalDocuments} Ingested Docs` : '0 Documents'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Project Intelligence & Risk Command Center
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Multi-agent reasoning engine grounded in persistent ChromaDB vector storage. Monitors delivery health, flags critical path blockers, and quantifies risk exposure.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('documents')}
              className="px-3.5 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2 transition-colors"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-teal-400" />
              <span>Documents ({summary?.totalDocuments ?? 0})</span>
            </button>

            <button
              onClick={() => onOpenAssistant('Summarize project health and the top 3 highest priority risks.')}
              className="px-3.5 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 text-xs font-medium text-slate-200 hover:text-white flex items-center gap-2 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Ask Advisor</span>
            </button>

            <button
              onClick={onRunPipeline}
              disabled={isRunningPipeline}
              className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-all shadow-sm shadow-teal-500/20 disabled:opacity-50"
            >
              <span>{isRunningPipeline ? 'Pipeline Running...' : 'Run Pipeline'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pipeline Stepper Dropdown Header */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <button
            onClick={() => setStepperExpanded((prev) => !prev)}
            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-teal-400 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            <span>Autonomous Pipeline Agents (6 Stages)</span>
            {isRunningPipeline && (
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            )}
            {stepperExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            {isRunningPipeline ? `Running Stage 0${pipelineStep + 1} of 06` : 'Ready for execution'}
          </span>
        </div>

        {/* Collapsible Pipeline Stepper */}
        {stepperExpanded && (
          <div className="mt-4 pt-2">
            <PipelineStepper isRunning={isRunningPipeline} currentStep={pipelineStep} />
          </div>
        )}
      </div>

      {/* 2. Executive Pillar KPIs (Clean 4-Card Strategic Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Project Health */}
        <div
          onClick={() => onNavigate('health')}
          className="glass-panel glass-panel-interactive p-4.5 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase text-slate-400">Composite Health</span>
            <HeartPulse className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tabular-nums">
              {summary?.healthScore ?? 100}
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-teal-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{summary?.healthStatus || 'Healthy'} Status</span>
          </div>
        </div>

        {/* KPI 2: Risk Exposure */}
        <div
          onClick={() => onNavigate('risks')}
          className="glass-panel glass-panel-interactive p-4.5 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase text-slate-400">Risk Exposure</span>
            <ShieldAlert className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tabular-nums">
              {summary?.totalRisks ?? 0}
            </span>
            <span className="text-xs text-slate-400">Identified</span>
          </div>
          <div className="mt-2.5 text-xs text-rose-300 font-medium">
            {summary?.criticalRisks ?? 0} Critical · {summary?.highRisks ?? 0} High Priority
          </div>
        </div>

        {/* KPI 3: Active Blockers */}
        <div
          onClick={() => onNavigate('blockers')}
          className="glass-panel glass-panel-interactive p-4.5 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase text-slate-400">Active Blockers</span>
            <AlertOctagon className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tabular-nums">
              {summary?.activeBlockers ?? 0}
            </span>
            <span className="text-xs text-slate-400">Impediments</span>
          </div>
          <div className="mt-2.5 text-xs text-amber-300 font-medium">
            {(summary?.activeBlockers ?? 0) > 0 ? 'Requires Immediate Action' : 'No Critical Blockers'}
          </div>
        </div>

        {/* KPI 4: Target Delivery Schedule */}
        <div
          onClick={() => onNavigate('intelligence')}
          className="glass-panel glass-panel-interactive p-4.5 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase text-slate-400">Target Schedule</span>
            <Calendar className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg font-bold text-white font-mono truncate leading-8">
            {summary?.projectDeadline || 'Under Evaluation'}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-medium">
            {summary?.pendingActions ?? 0} Pending Actions · {summary?.upcomingDeadlines ?? 0} Milestones
          </div>
        </div>
      </div>

      {/* 3. Perspective Lens Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            {activeTab === 'overview'
              ? 'Complete Intelligence Overview'
              : activeTab === 'health-risks'
              ? 'Health & Risk Telemetry'
              : 'Execution Threats & Document Alignment'}
          </h2>
          <p className="text-xs text-slate-400">
            {activeTab === 'overview'
              ? 'Consolidated view of health diagnostics, probability-impact matrix, and delivery threats'
              : activeTab === 'health-risks'
              ? 'Algorithmic multi-factor project health score and severity-probability distribution'
              : 'High-risk tasks scheduled in current sprint and cross-document inconsistency tracking'}
          </p>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'overview'
                ? 'bg-slate-800 text-teal-300 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('health-risks')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'health-risks'
                ? 'bg-slate-800 text-teal-300 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Health & Risks
          </button>
          <button
            onClick={() => setActiveTab('execution')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'execution'
                ? 'bg-slate-800 text-teal-300 shadow-sm border border-slate-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Execution & Alignment
          </button>
        </div>
      </div>

      {/* 4. Structured Content Sections */}

      {/* Section A: Health & Risk Telemetry */}
      {(activeTab === 'overview' || activeTab === 'health-risks') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            {health && <HealthGauge health={health} />}
          </div>
          <div className="lg:col-span-7">
            <RiskMatrix
              risks={risks}
              onSelectRisk={(r) =>
                onOpenAssistant(
                  `Tell me more about risk ${r.id}: ${r.title} and what steps should be taken.`
                )
              }
            />
          </div>
        </div>
      )}

      {/* Section B: Execution Threats & Document Alignment */}
      {(activeTab === 'overview' || activeTab === 'execution') && (
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
      )}
    </div>
  );
};
