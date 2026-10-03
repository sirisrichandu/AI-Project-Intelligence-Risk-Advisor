import React from 'react';
import { RiskItem } from '../../types';

interface RiskBadgeProps {
  severity: RiskItem['severity'] | string;
  size?: 'sm' | 'md';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ severity, size = 'md' }) => {
  const normalized = severity.toLowerCase();

  let colorClasses = 'text-teal-300 border-teal-500/30 bg-teal-500/10';
  let dotClass = 'bg-teal-400';

  if (normalized === 'critical') {
    colorClasses = 'text-rose-300 border-rose-500/30 bg-rose-500/10';
    dotClass = 'bg-rose-400 pulse-dot-critical';
  } else if (normalized === 'high') {
    colorClasses = 'text-amber-300 border-amber-500/30 bg-amber-500/10';
    dotClass = 'bg-amber-400 pulse-dot-high';
  } else if (normalized === 'moderate' || normalized === 'medium') {
    colorClasses = 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10';
    dotClass = 'bg-indigo-400';
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium border rounded-md uppercase tracking-wider ${px} ${colorClasses} whitespace-nowrap shrink-0`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span>{severity}</span>
    </span>
  );
};
