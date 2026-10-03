import React from 'react';
import { Compass, FileSearch, ShieldAlert, CheckCircle2, HeartPulse, FileText, Loader2 } from 'lucide-react';

interface PipelineStepperProps {
  isRunning: boolean;
  currentStep: number; // 0 to 5
}

const STEPS = [
  { id: 'router', label: 'Intent Router', icon: Compass, desc: 'Classify & route document streams' },
  { id: 'scope', label: 'Scope Agent', icon: FileSearch, desc: 'Extract goals, specs & milestones' },
  { id: 'risk', label: 'Risk Agent', icon: ShieldAlert, desc: 'Detect threats, probability & impact' },
  { id: 'blocker', label: 'Blocker Agent', icon: CheckCircle2, desc: 'Resolve active impediments & actions' },
  { id: 'health', label: 'Health Engine', icon: HeartPulse, desc: 'Calculate multi-factor project score' },
  { id: 'docs', label: 'Doc Generator', icon: FileText, desc: 'Synthesize stories, reports & register' },
];

export const PipelineStepper: React.FC<PipelineStepperProps> = ({ isRunning, currentStep }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone = isRunning ? idx < currentStep : true;
          const isCurrent = isRunning && idx === currentStep;

          let stateStyle = 'border-slate-800 bg-slate-900/60 text-slate-400';
          let iconColor = 'text-slate-500';

          if (isCurrent) {
            stateStyle = 'border-teal-500/50 bg-teal-500/10 text-teal-200 shadow-sm shadow-teal-500/20';
            iconColor = 'text-teal-400';
          } else if (isDone) {
            stateStyle = 'border-slate-700/60 bg-slate-800/40 text-slate-200';
            iconColor = 'text-teal-400';
          }

          return (
            <div key={step.id} className="flex-1 min-w-[150px]">
              <div className={`p-3 rounded-lg border transition-all ${stateStyle}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-slate-400">0{idx + 1}</span>
                  {isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                  ) : isDone ? (
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                  <span className="text-xs font-semibold whitespace-nowrap">{step.label}</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 leading-tight">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
