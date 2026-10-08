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
  blockers = [],
  actions = [],
  tasksAtRisk = [],
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

  const safeActions = Array.isArray(actions) ? actions : [];
  const safeBlockers = Array.isArray(blockers) ? blockers : [];
  const safeTasksAtRisk = Array.isArray(tasksAtRisk) ? tasksAtRisk : [];

  const filteredActions = safeActions.filter((act) => {
    const taskName = ((act as any).task || (act as any).title || (act as any).description || '').toString();
    const ownerName = ((act as any).owner || (act as any).assignee || '').toString();
    const actId = (act.id || '').toString();
    const actStatus = ((act as any).status || 'Pending').toString();

    const matchesSearch =
      taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      actId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      actionFilter === 'All' || actStatus.toLowerCase() === actionFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status?: string) => {
    switch ((status || 'pending').toLowerCase()) {
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

  const getPriorityBadge = (p?: string) => {
    switch ((p || 'medium').toLowerCase()) {
      case 'critical':
      case 'p1':
        return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      case 'high':
      case 'p2':
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
          <span>All Deliverables</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === 'all' ? 'bg-slate-900 text-teal-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {safeBlockers.length + safeActions.length + safeTasksAtRisk.length}
          </span>
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
            activeTab === 'blockers' ? 'bg-slate-900 text-amber-400' : 'bg-slate-800 text-amber-400'
          }`}>
            {safeBlockers.length}
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
            {safeActions.length}
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
            {safeTasksAtRisk.length}
          </span>
        </button>
      </div>

      {/* Blockers Section */}
      {(activeTab === 'all' || activeTab === 'blockers') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-100">Critical Project Blockers ({safeBlockers.length})</h3>
            </div>
            <span className="text-xs text-slate-400">Extracted from standup notes & sprint retro</span>
          </div>

          {safeBlockers.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
              <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-200">Zero Active Blockers</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No active organizational bottlenecks or impediments detected in your project documents.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {safeBlockers.map((b) => {
                const impactText = b.impact || (b as any).impactedTasks?.join(', ') || 'Project timeline and release velocity impacted.';
                const resolutionText = b.suggestedResolution || (b as any).suggestedAction || 'Review blocker mitigation with assigned lead.';
                return (
                  <div
                    key={b.id || Math.random().toString()}
                    className="glass-panel p-5 border-l-4 border-l-amber-500 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-amber-400">{b.id}</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {b.owner && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                              <User className="w-2.5 h-2.5 text-amber-400" /> {b.owner}
                            </span>
                          )}
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getPriorityBadge(b.priority)}`}>
                            {b.priority || 'High'}
                          </span>
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 mb-1.5">{b.title}</h4>
                      {((b as any).dueDate || (b as any).status) && (
                        <div className="flex items-center gap-2 mb-2 text-[11px] text-slate-400 font-mono">
                          {(b as any).dueDate && (
                            <span className="flex items-center gap-1 text-amber-300/80">
                              <Clock className="w-3 h-3" /> Target: {(b as any).dueDate}
                            </span>
                          )}
                          {(b as any).status && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded border ${getStatusBadge((b as any).status)}`}>
                              {(b as any).status}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">{b.description}</p>
                      <div className="p-2 rounded bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 mb-3">
                        <span className="font-semibold text-rose-300 block mb-0.5">Impact:</span>
                        {impactText}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 text-[11px]">
                      <span className="font-semibold text-teal-400 block mb-0.5">Resolution Recommendation:</span>
                      <span className="text-slate-300 leading-relaxed">{resolutionText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tasks at Immediate Risk */}
      {(activeTab === 'all' || activeTab === 'tasks') && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-semibold text-slate-100">Tasks with Critical Path Threats ({safeTasksAtRisk.length})</h3>
            </div>
            <span className="text-xs text-slate-400">Backlog items linked to active blockers & dependencies</span>
          </div>

          <TasksAtRiskCard tasks={safeTasksAtRisk} />
        </div>
      )}

      {/* Action Items Section */}
      {(activeTab === 'all' || activeTab === 'actions') && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-100">Assigned Mitigation Actions ({safeActions.length})</h3>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2">
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

          {safeActions.length === 0 ? (
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
                  {filteredActions.map((act) => {
                    const taskTitle = (act as any).task || (act as any).title || (act as any).description || 'Action Deliverable';
                    const ownerName = (act as any).owner || (act as any).assignee || 'Unassigned';
                    const dueDate = (act as any).deadline || (act as any).dueDate || '2026-10-31';
                    const priority = (act as any).priority || 'Medium';
                    const status = (act as any).status || 'Pending';

                    return (
                      <tr key={act.id || Math.random().toString()} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 font-mono font-bold text-teal-400">{act.id}</td>
                        <td className="py-3 font-medium text-slate-200 max-w-md">
                          {taskTitle}
                        </td>
                        <td className="py-3 text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            {ownerName}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {dueDate}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getPriorityBadge(priority)}`}>
                            {priority}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getStatusBadge(status)}`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
