import React from 'react';
import { TaskAtRisk } from '../../types';
import { AlertTriangle, Clock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { RiskBadge } from '../shared/RiskBadge';

interface TasksAtRiskCardProps {
  tasks: TaskAtRisk[];
  onViewAll?: () => void;
}

export const TasksAtRiskCard: React.FC<TasksAtRiskCardProps> = ({ tasks, onViewAll }) => {
  return (
    <div className="glass-panel p-6 h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight">Tasks at Immediate Risk</h3>
            <p className="text-xs text-slate-400">Backlog items linked to active risks & bottlenecks</p>
          </div>
        </div>
        <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border tabular-nums ${
          tasks.length > 0
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            : 'bg-teal-500/10 border-teal-500/20 text-teal-300'
        }`}>
          {tasks.length} Flagged
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="py-8 px-4 text-center my-auto rounded-lg bg-slate-900/40 border border-slate-800/60">
          <CheckCircle2 className="w-7 h-7 text-teal-400/80 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-200">No Tasks at Immediate Risk</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
            All work packages and backlog items in your project documents are progressing without flagged impediments.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 my-auto overflow-y-auto max-h-[280px] pr-1">
          {tasks.map((task) => {
            let borderGlow = 'border-l-rose-500';
            if (task.severity === 'High') borderGlow = 'border-l-amber-500';
            else if (task.severity === 'Moderate') borderGlow = 'border-l-indigo-500';

            return (
              <div
                key={task.id}
                className={`p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 border-l-4 ${borderGlow} hover:border-slate-700 transition-all`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-100">{task.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{task.id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        {task.owner}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Due {task.dueDate}
                      </span>
                    </div>
                  </div>
                  <RiskBadge severity={task.severity} size="sm" />
                </div>

                <div className="text-[11px] text-rose-200/90 bg-rose-500/5 p-1.5 rounded border border-rose-500/10 mt-2">
                  <span className="font-semibold text-rose-400">Risk Factor: </span>
                  {task.riskReason}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-slate-400">Cross-referenced with active project backlog</span>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-medium transition-colors"
          >
            Manage Backlog <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
