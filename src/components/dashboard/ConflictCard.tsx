import React from 'react';
import { DocumentConflict } from '../../types';
import { GitCompare, AlertCircle } from 'lucide-react';

interface ConflictCardProps {
  conflicts: DocumentConflict[];
}

export const ConflictCard: React.FC<ConflictCardProps> = ({ conflicts }) => {
  if (!conflicts.length) return null;

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight">Cross-Document Inconsistencies</h3>
            <p className="text-xs text-slate-400">Contradictions identified between uploaded artifacts</p>
          </div>
        </div>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
          {conflicts.length} Detected
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {conflicts.map((conflict) => (
          <div
            key={conflict.id}
            className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  {conflict.conflictType}
                </span>
                <span className="text-[10px] font-mono text-slate-500">{conflict.id}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[10px] font-mono text-teal-400 block mb-0.5">{conflict.docA}</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">"{conflict.statementA}"</p>
                </div>
                <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[10px] font-mono text-rose-400 block mb-0.5">{conflict.docB}</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">"{conflict.statementB}"</p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
              <span className="font-semibold text-teal-300">Advisor Resolution: </span>
              {conflict.recommendation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
