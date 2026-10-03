import React from 'react';
import { Sparkles, MessageSquare, Menu, Play, RefreshCw, FileText } from 'lucide-react';
import { ProjectSummary } from '../../types';

interface NavbarProps {
  summary: ProjectSummary | null;
  onOpenAssistant: () => void;
  onRunPipeline: () => void;
  isRunningPipeline: boolean;
  onToggleSidebar: () => void;
  activePage: string;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  summary,
  onOpenAssistant,
  onRunPipeline,
  isRunningPipeline,
  onToggleSidebar,
  activePage,
  onNavigate,
}) => {
  return (
    <header className="h-16 px-4 sm:px-6 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30 shrink-0">
      {/* Zone 1: Brand / Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-slate-100 capitalize">
            {activePage.replace(/-/g, ' ')}
          </h1>
          <p className="hidden sm:block text-[11px] text-slate-400">
            {summary?.projectName || 'Project Workspace'} · Target Release: {summary?.projectDeadline || 'Active Cycle'}
          </p>
        </div>
      </div>

      {/* Zone 2 & 3: Actions & Controls */}
      <div className="flex items-center gap-3">
        {/* Project Health Quick Status */}
        {summary && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Project Health:</span>
            <span className="font-mono font-bold text-teal-400 tabular-nums">
              {summary.healthScore}%
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            <span className="text-slate-300 font-medium">{summary.healthStatus}</span>
          </div>
        )}

        {/* Run AI Pipeline Button */}
        <button
          onClick={onRunPipeline}
          disabled={isRunningPipeline}
          className="px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-teal-500/20 disabled:opacity-50 whitespace-nowrap"
        >
          {isRunningPipeline ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Pipeline...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Run Multi-Agent Pipeline</span>
              <span className="sm:hidden">Run AI</span>
            </>
          )}
        </button>

        {/* One-Click Master Document Download Trigger */}
        <button
          onClick={() => onNavigate('reports')}
          className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-xs font-medium text-slate-200 hover:text-teal-300 transition-colors whitespace-nowrap"
          title="Download Complete Project Dossier"
        >
          <FileText className="w-3.5 h-3.5 text-teal-400" />
          <span>One-Click Dossier</span>
        </button>

        {/* AI Assistant Drawer Trigger */}
        <button
          onClick={onOpenAssistant}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">Ask Advisor</span>
        </button>
      </div>
    </header>
  );
};
