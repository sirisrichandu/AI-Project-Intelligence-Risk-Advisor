import React, { useState, useMemo } from 'react';
import { RiskItem } from '../../types';
import { RiskBadge } from '../shared/RiskBadge';

interface RiskMatrixProps {
  risks: RiskItem[];
  onSelectRisk?: (risk: RiskItem) => void;
}

interface PlottedPoint {
  risk: RiskItem;
  cx: number;
  cy: number;
  baseX: number;
  baseY: number;
  isClustered: boolean;
  clusterIndex: number;
  clusterTotal: number;
  labelX: number;
  labelY: number;
  textAnchor: 'start' | 'middle' | 'end';
}

interface ClusterGroup {
  id: string;
  centerX: number;
  centerY: number;
  points: PlottedPoint[];
}

export const RiskMatrix: React.FC<RiskMatrixProps> = ({ risks, onSelectRisk }) => {
  const [hoveredRisk, setHoveredRisk] = useState<RiskItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const filteredRisks = useMemo(() => {
    if (activeFilter === 'All') return risks;
    return risks.filter((r) => r.severity.toLowerCase() === activeFilter.toLowerCase());
  }, [risks, activeFilter]);

  const getSeverityColor = (sev: string) => {
    const s = sev.toLowerCase();
    if (s === 'critical') return '#fb7185';
    if (s === 'high') return '#fbbf24';
    if (s === 'moderate' || s === 'medium') return '#818cf8';
    return '#2dd4bf';
  };

  // Anti-collision radial dispersion engine:
  // Detects when multiple risks share identical or close coordinates (e.g. 50/50 Moderate, 50/80 High)
  // and dynamically distributes them in a visible orbit pattern around the anchor point.
  const { plottedPoints, clusterGroups } = useMemo(() => {
    if (!filteredRisks.length) {
      return { plottedPoints: [], clusterGroups: [] };
    }

    // 1. Calculate base cartesian coordinates in SVG viewBox (400 x 220)
    const rawPoints = filteredRisks.map((risk, index) => {
      // Map probability (0-100) to X (45 to 370)
      const clampedP = Math.max(5, Math.min(95, risk.probability || 50));
      const baseX = 45 + (clampedP / 100) * 325;

      // Map impact (0-100) to Y (175 down to 25)
      const clampedI = Math.max(5, Math.min(95, risk.impact || 50));
      const baseY = 175 - (clampedI / 100) * 150;

      return { risk, baseX, baseY, index };
    });

    // 2. Identify clusters of points within proximity threshold (< 22px)
    const clusters: Array<typeof rawPoints> = [];
    const visited = new Set<number>();

    for (let i = 0; i < rawPoints.length; i++) {
      if (visited.has(i)) continue;
      const cluster = [rawPoints[i]];
      visited.add(i);

      for (let j = i + 1; j < rawPoints.length; j++) {
        if (visited.has(j)) continue;
        const dx = rawPoints[i].baseX - rawPoints[j].baseX;
        const dy = rawPoints[i].baseY - rawPoints[j].baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 22) {
          cluster.push(rawPoints[j]);
          visited.add(j);
        }
      }
      clusters.push(cluster);
    }

    // 3. Compute dispersed coordinates and label placements for each cluster
    const plotted: PlottedPoint[] = [];
    const groups: ClusterGroup[] = [];

    clusters.forEach((cluster, clusterIdx) => {
      if (cluster.length === 1) {
        const item = cluster[0];
        plotted.push({
          risk: item.risk,
          cx: item.baseX,
          cy: item.baseY,
          baseX: item.baseX,
          baseY: item.baseY,
          isClustered: false,
          clusterIndex: 0,
          clusterTotal: 1,
          labelX: item.baseX + 9,
          labelY: item.baseY + 3.5,
          textAnchor: 'start',
        });
      } else {
        // Multi-risk cluster detected: arrange in radial orbit around centroid
        const centerX = cluster.reduce((sum, p) => sum + p.baseX, 0) / cluster.length;
        const centerY = cluster.reduce((sum, p) => sum + p.baseY, 0) / cluster.length;
        const spreadRadius = cluster.length === 2 ? 16 : cluster.length === 3 ? 19 : 24;

        const clusterPoints: PlottedPoint[] = [];

        cluster.forEach((item, k) => {
          // Distribute evenly around the circle, starting with top orientation (-90 deg)
          const angle = -Math.PI / 2 + (k * 2 * Math.PI) / cluster.length;
          const cx = Math.max(35, Math.min(380, centerX + Math.cos(angle) * spreadRadius));
          const cy = Math.max(20, Math.min(185, centerY + Math.sin(angle) * spreadRadius));

          // Calculate non-colliding label placement facing outward from cluster center
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);

          let labelX = cx;
          let labelY = cy;
          let textAnchor: 'start' | 'middle' | 'end' = 'start';

          if (cosA > 0.35) {
            labelX = cx + 8;
            labelY = cy + 3.5;
            textAnchor = 'start';
          } else if (cosA < -0.35) {
            labelX = cx - 8;
            labelY = cy + 3.5;
            textAnchor = 'end';
          } else if (sinA < 0) {
            labelX = cx;
            labelY = cy - 8;
            textAnchor = 'middle';
          } else {
            labelX = cx;
            labelY = cy + 14;
            textAnchor = 'middle';
          }

          const point: PlottedPoint = {
            risk: item.risk,
            cx,
            cy,
            baseX: centerX,
            baseY: centerY,
            isClustered: true,
            clusterIndex: k,
            clusterTotal: cluster.length,
            labelX,
            labelY,
            textAnchor,
          };

          plotted.push(point);
          clusterPoints.push(point);
        });

        groups.push({
          id: `cluster-${clusterIdx}`,
          centerX,
          centerY,
          points: clusterPoints,
        });
      }
    });

    return { plottedPoints: plotted, clusterGroups: groups };
  }, [filteredRisks]);

  return (
    <div className="glass-panel p-6 h-full flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight">Risk Priority Matrix</h3>
            {clusterGroups.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                Anti-Collision Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">Probability vs. Impact distribution with intelligent collision dispersion</p>
        </div>

        {/* Severity filter controls */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
          {['All', 'Critical', 'High', 'Moderate', 'Low'].map((level) => (
            <button
              key={level}
              onClick={() => setActiveFilter(level)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                activeFilter === level
                  ? 'bg-slate-800 text-teal-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Matrix SVG Plot */}
      <div className="relative w-full h-[280px] bg-slate-950/60 rounded-lg border border-slate-800/80 p-4 flex flex-col justify-between">
        {/* Quadrant labels */}
        <div className="absolute top-2 right-3 text-[10px] font-mono uppercase text-rose-400/60 font-semibold tracking-wider pointer-events-none">
          Critical Hazard Zone
        </div>
        <div className="absolute bottom-2 left-10 text-[10px] font-mono uppercase text-teal-400/60 font-semibold tracking-wider pointer-events-none">
          Low Priority Zone
        </div>

        {/* Matrix grid lines and axes */}
        <svg className="w-full h-full" viewBox="0 0 400 220">
          {/* Subtle grid lines */}
          <line x1="30" y1="110" x2="390" y2="110" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1="210" y1="10" x2="210" y2="190" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

          {/* Axes */}
          <line x1="30" y1="190" x2="390" y2="190" stroke="#334155" strokeWidth="1.5" />
          <line x1="30" y1="10" x2="30" y2="190" stroke="#334155" strokeWidth="1.5" />

          {/* Axis Labels */}
          <text x="390" y="206" fill="#64748b" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">
            Probability →
          </text>
          <text x="18" y="18" fill="#64748b" fontSize="10" textAnchor="start" fontFamily="JetBrains Mono" transform="rotate(-90 18,18)">
            Impact →
          </text>

          {/* Cluster Orbit Rings & Spider Connectors for identical/overlapping coordinates */}
          {clusterGroups.map((group) => (
            <g key={group.id} className="pointer-events-none">
              {/* Central anchor point indicator */}
              <circle
                cx={group.centerX}
                cy={group.centerY}
                r="3"
                fill="#64748b"
                opacity="0.5"
              />
              {/* Orbit guide ring */}
              <circle
                cx={group.centerX}
                cy={group.centerY}
                r={group.points.length === 2 ? 16 : group.points.length === 3 ? 19 : 24}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="2 2"
              />
              {/* Spider connector lines linking each distinct risk to the anchor coordinate */}
              {group.points.map((pt) => (
                <line
                  key={`spider-${pt.risk.id}`}
                  x1={group.centerX}
                  y1={group.centerY}
                  x2={pt.cx}
                  y2={pt.cy}
                  stroke={hoveredRisk?.id === pt.risk.id ? getSeverityColor(pt.risk.severity) : 'rgba(255,255,255,0.22)'}
                  strokeWidth={hoveredRisk?.id === pt.risk.id ? 1.5 : 1}
                  strokeDasharray={hoveredRisk?.id === pt.risk.id ? 'none' : '2 2'}
                  opacity={hoveredRisk && hoveredRisk.id !== pt.risk.id ? 0.3 : 0.8}
                />
              ))}
            </g>
          ))}

          {/* Dispersed Data Points */}
          {plottedPoints.map((pt) => {
            const { risk, cx, cy, labelX, labelY, textAnchor } = pt;
            const color = getSeverityColor(risk.severity);
            const isHovered = hoveredRisk?.id === risk.id;

            return (
              <g
                key={risk.id}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredRisk(risk)}
                onMouseLeave={() => setHoveredRisk(null)}
                onClick={() => onSelectRisk && onSelectRisk(risk)}
              >
                {/* Glow ring on hover or critical */}
                {(isHovered || risk.severity === 'Critical') && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 14 : 10}
                    fill={color}
                    opacity={isHovered ? 0.4 : 0.2}
                    className={risk.severity === 'Critical' ? 'animate-pulse' : ''}
                  />
                )}

                {/* Center Node */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7.5 : 5.5}
                  fill={color}
                  stroke="#090d16"
                  strokeWidth="2"
                  style={{
                    filter: `drop-shadow(0 0 6px ${color}aa)`,
                    transition: 'all 0.15s ease',
                  }}
                />

                {/* Node ID label with high-contrast text halo to guarantee 100% legibility */}
                <text
                  x={labelX}
                  y={labelY}
                  fill={isHovered ? '#ffffff' : '#cbd5e1'}
                  fontSize={isHovered ? '10' : '9'}
                  fontWeight="600"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor={textAnchor}
                  className="pointer-events-none select-none transition-all"
                  paintOrder="stroke"
                  stroke="#090d16"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {risk.id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredRisk && (
          <div className="absolute bottom-3 right-3 max-w-[300px] p-3 rounded-lg bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md pointer-events-none z-10 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold text-slate-100 truncate">{hoveredRisk.title}</span>
              <RiskBadge severity={hoveredRisk.severity} size="sm" />
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-2 mb-2 leading-relaxed">{hoveredRisk.description}</p>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800 pt-1.5">
              <span className="text-slate-200">Prob: <strong className="text-teal-300">{hoveredRisk.probability}%</strong></span>
              <span className="text-slate-200">Impact: <strong className="text-rose-300">{hoveredRisk.impact}%</strong></span>
              <span className="text-teal-400 font-semibold">{hoveredRisk.category}</span>
            </div>
            {hoveredRisk.mitigation && (
              <div className="mt-1.5 text-[10px] text-slate-400 italic line-clamp-1 border-t border-slate-800/60 pt-1">
                <span className="text-teal-300 not-italic font-semibold">Mitigation: </span>
                {hoveredRisk.mitigation}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-4 text-[11px] flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> Critical</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> High</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400" /> Moderate</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-400" /> Low</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px]">
            {filteredRisks.length} plotted
          </span>
          {clusterGroups.length > 0 && (
            <span className="text-[10px] font-mono text-teal-400/80 hidden sm:inline">
              ({clusterGroups.length} cluster{clusterGroups.length > 1 ? 's' : ''} spread)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
