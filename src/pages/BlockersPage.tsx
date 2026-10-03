import React, { useState, useEffect } from 'react';
import { BlockerItem, ActionItem, TaskAtRisk } from '../types';
import { TasksAtRiskCard } from '../components/dashboard/TasksAtRiskCard';
import {
  AlertOctagon,
  CheckSquare,
  Clock,
  User,
  ArrowRight,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';

interface BlockersPageProps {
  blockers: BlockerItem[];
  actions: ActionItem[];
  tasksAtRisk: TaskAtRisk[];
  initialTab?: 'all' | 'blockers' | 'actions' | 'tasks';
  onOpenAssistant: (query?: string) => void;
}

export const BlockersPage: React.FC<BlockersPageProps> = ({
  blockers,
  actions,
  tasksAtRisk,
  initialTab = 'all',
  onOpenAssistant,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'blockers' | 'actions' | 'tasks'>(initialTab);
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const filteredActions = actions.filter((act) => {
    const matchesSearch =
      act.task.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      actionFilter === 'All' || act.status.toLowerCase() === actionFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      case 'in progress':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'overdue':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p.toLowerCase()) {
      case 'critical':
        return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      case 'high':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      default:
        return 'text-slate-300 border-slate-700 bg-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">
              BLOCKER & ACTION ITEM AGENT
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Blockers & Action Items</h2>
          <p className="text-xs text-slate-400">
            Unresolved organizational bottlenecks, impediment resolutions, and assigned task deliverables.
          </p>
        </div>

        <button
          onClick={() => onOpenAssistant('What are the top blockers and who is responsible for resolving them?')}
          className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          <span>Ask Blocker Advisor</span>
        </button>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl bg-slate-900/80 border border-slate-800/80 w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('blockers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'blockers'
              ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Blockers</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === 'blockers' ? 'bg-amber-600/40 text-slate-950' : 'bg-slate-800 text-amber-400'
          }`}>
            {blockers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('actions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'actions'
              ? 'bg-indigo-500 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Action Items</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === 'actions' ? 'bg-indigo-600/40 text-white' : 'bg-slate-800 text-indigo-400'
          }`}>
            {actions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'tasks'
              ? 'bg-rose-500 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Tasks at Risk</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === 'tasks' ? 'bg-rose-600/40 text-white' : 'bg-slate-800 text-rose-400'
          }`}>
            {tasksAtRisk.length}
          </span>
        </button>
      </div>

      {/* Blockers Section */}
      {(activeTab === 'all' || activeTab === 'blockers') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-100">Critical Project Blockers ({blockers.length})</h3>
            </div>
            <span className="text-xs text-slate-400">Extracted from standup notes & sprint retro</span>
          </div>

          {blockers.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
              <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-200">Zero Active Blockers</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No active organizational bottlenecks or impediments detected in your project documents.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {blockers.map((b) => (
                <div
                  key={b.id}
                  className="glass-panel p-5 border-l-4 border-l-amber-500 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-amber-400">{b.id}</span>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getPriorityBadge(b.priority)}`}>
                        {b.priority}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-100 mb-1.5">{b.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">{b.description}</p>
                    <div className="p-2 rounded bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 mb-3">
                      <span className="font-semibold text-rose-300 block mb-0.5">Impact:</span>
                      {b.impact}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-[11px]">
                    <span className="font-semibold text-teal-400 block mb-0.5">Resolution Recommendation:</span>
                    <span className="text-slate-300 leading-relaxed">{b.suggestedResolution}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks at Immediate Risk Module */}
      {(activeTab === 'all' || activeTab === 'tasks') && (
        <div className="grid grid-cols-1 gap-6">
          <TasksAtRiskCard tasks={tasksAtRisk} />
        </div>
      )}

      {/* Action Items Table Section */}
      {(activeTab === 'all' || activeTab === 'actions') && (
        <div className="glass-panel p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-slate-100">Assigned Action Items & Deadlines ({actions.length})</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter tasks..."
                  className="bg-slate-950 border border-slate-800 rounded px-2 pl-8 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500/60"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-xs">
                {['All', 'Pending', 'In Progress', 'Completed', 'Overdue'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setActionFilter(st)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      actionFilter === st
                        ? 'bg-slate-800 text-teal-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {actions.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
              <CheckSquare className="w-8 h-8 text-teal-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-200">No Action Items in Backlog</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Upload your project documents or meeting notes to automatically extract assigned tasks, owners, and due dates.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-semibold">ID</th>
                    <th className="pb-3 font-semibold">Action Task</th>
                    <th className="pb-3 font-semibold">Owner</th>
                    <th className="pb-3 font-semibold">Due Date</th>
                    <th className="pb-3 font-semibold">Priority</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredActions.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 font-mono font-bold text-teal-400">{act.id}</td>
                      <td className="py-3 font-medium text-slate-200 max-w-md">
                        {act.task}
                      </td>
                      <td className="py-3 text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {act.owner}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {act.deadline}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getPriorityBadge(act.priority)}`}>
                          {act.priority}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getStatusBadge(act.status)}`}>
                          {act.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
