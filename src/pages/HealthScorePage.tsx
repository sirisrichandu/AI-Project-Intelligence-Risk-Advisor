import React, { useState } from 'react';
import { HealthBreakdown } from '../types';
import { HealthGauge } from '../components/dashboard/HealthGauge';
import {
  Activity,
  TrendingUp,
  Sliders,
  History,
  CheckCircle2,
  Info,
  RotateCcw,
} from 'lucide-react';

interface HealthScorePageProps {
  health: HealthBreakdown;
  onOpenAssistant: (query?: string) => void;
}

export const HealthScorePage: React.FC<HealthScorePageProps> = ({ health, onOpenAssistant }) => {
  // Simulator state
  const [simRisk, setSimRisk] = useState(health.metrics.riskScore);
  const [simSchedule, setSimSchedule] = useState(health.metrics.scheduleScore);
  const [simScope, setSimScope] = useState(health.metrics.scopeScore);
  const [simBlocker, setSimBlocker] = useState(health.metrics.blockerScore);
  const [simResource, setSimResource] = useState(health.metrics.resourceScore);

  const simulatedOverall = Math.round(
    simRisk * 0.3 +
    simSchedule * 0.2 +
    simScope * 0.2 +
    simBlocker * 0.15 +
    simResource * 0.15
  );

  const resetSimulator = () => {
    setSimRisk(health.metrics.riskScore);
    setSimSchedule(health.metrics.scheduleScore);
    setSimScope(health.metrics.scopeScore);
    setSimBlocker(health.metrics.blockerScore);
    setSimResource(health.metrics.resourceScore);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400 font-semibold">
              HEALTH SCORING ENGINE
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Project Health Scoring & Historical Analytics</h2>
          <p className="text-xs text-slate-400">
            Multi-variable algorithmic evaluation combining risk frequency, milestone schedule adherence, scope stability, and blocker resolution.
          </p>
        </div>

        <button
          onClick={() => onOpenAssistant('Why is our health score currently at this rating and how can we reach 90+?')}
          className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Activity className="w-3.5 h-3.5 text-teal-400" />
          <span>Ask Health Strategy</span>
        </button>
      </div>

      {/* Top Gauge & Formula Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <HealthGauge health={health} />
        </div>

        {/* Formula Explanation Card */}
        <div className="lg:col-span-6 glass-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-slate-100">Mathematical Health Scoring Model</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Project health is dynamically computed rather than hallucinated, using measurable indicators normalized on a 0–100 scale:
            </p>

            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs text-teal-300 space-y-1">
              <div>Health Score = (Risk × 30%) + (Schedule × 20%) +</div>
              <div className="pl-14">(Scope × 20%) + (Blockers × 15%) +</div>
              <div className="pl-14">(Resources × 15%)</div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-400">
              <div className="p-2 rounded bg-slate-900/50 border border-slate-800">
                <span className="text-teal-400 font-semibold block">90 – 100:</span> Excellent Health
              </div>
              <div className="p-2 rounded bg-slate-900/50 border border-slate-800">
                <span className="text-teal-300 font-semibold block">75 – 89:</span> Healthy / Nominal
              </div>
              <div className="p-2 rounded bg-slate-900/50 border border-slate-800">
                <span className="text-amber-400 font-semibold block">60 – 74:</span> At Risk
              </div>
              <div className="p-2 rounded bg-slate-900/50 border border-slate-800">
                <span className="text-rose-400 font-semibold block">0 – 59:</span> Critical / Severe
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            Current Score: <strong className="text-white font-mono">{health.overall}/100</strong> · Status:{' '}
            <strong className="text-teal-400">{health.status}</strong>
          </div>
        </div>
      </div>

      {/* Historical Trend Timeline */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-slate-100">Historical Health Trajectory</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {health.history?.length || 0} Recorded Assessment Checkpoint{health.history?.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Timeline Line & Points or Empty State */}
        {health.history && health.history.length > 0 ? (
          <div className="relative pt-6 pb-2">
            {/* Connecting Line */}
            <div className="absolute top-10 left-6 right-6 h-0.5 bg-slate-800 -z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
              {health.history.map((pt, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-teal-400 text-teal-300 font-mono font-bold text-xs flex items-center justify-center shadow-lg shadow-teal-500/20 mb-2">
                    {pt.score}
                  </div>
                  <span className="text-xs font-mono text-slate-300">{pt.date}</span>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[150px] line-clamp-2">{pt.note}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 px-4 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
            <History className="w-7 h-7 text-slate-600 mx-auto mb-2" />
            <h4 className="text-xs font-semibold text-slate-300">No Historical Health Trajectory Recorded</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
              Upload project documents and run the pipeline to start recording health checkpoints, milestone risk trends, and trajectory milestones over time.
            </p>
          </div>
        )}
      </div>

      {/* Interactive Health Score Simulator */}
      <div className="glass-panel p-6 border-slate-800 bg-slate-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Interactive What-If Health Simulator</h3>
              <p className="text-xs text-slate-400">Simulate resolving blockers or mitigating risks to preview projected score impact</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Projected Health:</span>
              <span className="text-2xl font-bold font-mono text-teal-400 tabular-nums">
                {simulatedOverall} <span className="text-xs text-slate-400">/ 100</span>
              </span>
            </div>
            <button
              onClick={resetSimulator}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Reset Simulator"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Risk Stability</span>
              <span className="font-mono text-teal-400">{simRisk}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={simRisk}
              onChange={(e) => setSimRisk(Number(e.target.value))}
              className="w-full accent-teal-400 bg-slate-800"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Schedule</span>
              <span className="font-mono text-teal-400">{simSchedule}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={simSchedule}
              onChange={(e) => setSimSchedule(Number(e.target.value))}
              className="w-full accent-teal-400 bg-slate-800"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Scope Stability</span>
              <span className="font-mono text-teal-400">{simScope}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={simScope}
              onChange={(e) => setSimScope(Number(e.target.value))}
              className="w-full accent-teal-400 bg-slate-800"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Blockers</span>
              <span className="font-mono text-teal-400">{simBlocker}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={simBlocker}
              onChange={(e) => setSimBlocker(Number(e.target.value))}
              className="w-full accent-teal-400 bg-slate-800"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">Resources</span>
              <span className="font-mono text-teal-400">{simResource}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={simResource}
              onChange={(e) => setSimResource(Number(e.target.value))}
              className="w-full accent-teal-400 bg-slate-800"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
