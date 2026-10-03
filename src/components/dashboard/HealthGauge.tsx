import React from 'react';
import { HealthBreakdown } from '../../types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HealthGaugeProps {
  health: HealthBreakdown;
}

export const HealthGauge: React.FC<HealthGaugeProps> = ({ health }) => {
  const score = health.overall;
  // Circumference for radius 56
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  // Arc percentage (dasharray)
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let scoreColor = '#2dd4bf'; // Teal
  let statusText = 'Healthy';
  let statusBadgeStyle = 'text-teal-300 border-teal-500/30 bg-teal-500/10';

  if (score < 40) {
    scoreColor = '#fb7185'; // Rose
    statusText = 'Severe';
    statusBadgeStyle = 'text-rose-300 border-rose-500/30 bg-rose-500/10';
  } else if (score < 60) {
    scoreColor = '#fb7185';
    statusText = 'Critical';
    statusBadgeStyle = 'text-rose-300 border-rose-500/30 bg-rose-500/10';
  } else if (score < 75) {
    scoreColor = '#fbbf24'; // Amber
    statusText = 'At Risk';
    statusBadgeStyle = 'text-amber-300 border-amber-500/30 bg-amber-500/10';
  }

  const dimensions = [
    { label: 'Risk Stability', weight: '30%', value: health.metrics.riskScore, color: '#fb7185' },
    { label: 'Schedule Adherence', weight: '20%', value: health.metrics.scheduleScore, color: '#2dd4bf' },
    { label: 'Scope Stability', weight: '20%', value: health.metrics.scopeScore, color: '#818cf8' },
    { label: 'Blocker Resolution', weight: '15%', value: health.metrics.blockerScore, color: '#fbbf24' },
    { label: 'Resource Capacity', weight: '15%', value: health.metrics.resourceScore, color: '#2dd4bf' },
  ];

  return (
    <div className="glass-panel p-6 h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 tracking-tight">Project Health Score</h3>
          <p className="text-xs text-slate-400">Multi-factor algorithmic assessment</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          {health.trend === 'Improving' && (
            <span className="flex items-center gap-1 text-teal-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Improving
            </span>
          )}
          {health.trend === 'Declining' && (
            <span className="flex items-center gap-1 text-rose-400 font-medium">
              <TrendingDown className="w-3.5 h-3.5" /> Declining
            </span>
          )}
          {health.trend === 'Stable' && (
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <Minus className="w-3.5 h-3.5" /> Stable
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-auto">
        {/* Circular SVG Gauge */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 130 130">
              {/* Background Track */}
              <circle
                cx="65"
                cy="65"
                r={radius}
                stroke="currentColor"
                strokeWidth="10"
                fill="transparent"
                className="text-slate-800"
              />
              {/* Value Arc */}
              <circle
                cx="65"
                cy="65"
                r={radius}
                stroke={scoreColor}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease',
                  filter: `drop-shadow(0 0 8px ${scoreColor}44)`,
                }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold tracking-tight text-white font-mono tabular-nums">{score}</span>
              <span className="text-[11px] text-slate-400 -mt-0.5">/ 100</span>
            </div>
          </div>
          <div className={`mt-3 px-3 py-0.5 text-xs font-semibold rounded border uppercase tracking-wider ${statusBadgeStyle}`}>
            {statusText}
          </div>
        </div>

        {/* 5-Dimension Weighted Breakdown */}
        <div className="md:col-span-7 flex flex-col gap-3">
          {dimensions.map((dim) => (
            <div key={dim.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">{dim.label}</span>
                <div className="flex items-center gap-2 font-mono tabular-nums">
                  <span className="text-[11px] text-slate-500">w: {dim.weight}</span>
                  <span className="text-slate-200 font-semibold">{dim.value}%</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${dim.value}%`,
                    backgroundColor: dim.value < 50 ? '#fb7185' : dim.value < 75 ? '#fbbf24' : '#2dd4bf',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 line-clamp-2">
        {health.summary}
      </div>
    </div>
  );
};
