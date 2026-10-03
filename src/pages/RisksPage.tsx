import React, { useState } from 'react';
import { RiskItem } from '../types';
import { RiskBadge } from '../components/shared/RiskBadge';
import { RiskMatrix } from '../components/dashboard/RiskMatrix';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileText,
  SlidersHorizontal,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';

interface RisksPageProps {
  risks: RiskItem[];
  onOpenAssistant: (query?: string) => void;
  onRefresh?: () => void;
}

export const RisksPage: React.FC<RisksPageProps> = ({ risks, onOpenAssistant, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState<RiskItem | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearRisks = async () => {
    setIsClearing(true);
    try {
      await api.clearRisks();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to clear risks:', err);
    } finally {
      setIsClearing(false);
    }
  };

  // Counts
  const total = risks.length;
  const critical = risks.filter((r) => r.severity === 'Critical').length;
  const high = risks.filter((r) => r.severity === 'High').length;
  const moderate = risks.filter((r) => r.severity === 'Moderate').length;
  const low = risks.filter((r) => r.severity === 'Low').length;
  const resolved = risks.filter((r) => r.status === 'Resolved').length;

  const filteredRisks = risks.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.mitigation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity =
      selectedSeverity === 'All' || r.severity.toLowerCase() === selectedSeverity.toLowerCase();

    const matchesCategory =
      selectedCategory === 'All' || r.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const categories = [
    'All',
    'Technical',
    'Schedule',
    'Resource',
    'Dependency',
    'Requirement',
    'Budget',
    'Quality',
    'Deployment',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold">
              RISK DETECTION AGENT
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Project Risk Analysis & Mitigation Dashboard</h2>
          <p className="text-xs text-slate-400">
            Automated vulnerability detection, impact estimation, evidence tracking, and assigned mitigation strategies.
          </p>
        </div>

        <button
          onClick={() => onOpenAssistant('What are the critical risks requiring immediate executive escalation?')}
          className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Ask Risk Advisor</span>
        </button>
      </div>

      {/* Summary Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-panel p-3.5">
          <span className="text-[11px] text-slate-400 block mb-1">Total Risks</span>
          <span className="text-xl font-bold font-mono text-white tabular-nums">{total}</span>
        </div>
        <div className="glass-panel p-3.5 border-l-4 border-l-rose-500">
          <span className="text-[11px] text-rose-300 block mb-1">Critical</span>
          <span className="text-xl font-bold font-mono text-rose-400 tabular-nums">{critical}</span>
        </div>
        <div className="glass-panel p-3.5 border-l-4 border-l-amber-500">
          <span className="text-[11px] text-amber-300 block mb-1">High Severity</span>
          <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">{high}</span>
        </div>
        <div className="glass-panel p-3.5 border-l-4 border-l-indigo-500">
          <span className="text-[11px] text-indigo-300 block mb-1">Moderate</span>
          <span className="text-xl font-bold font-mono text-indigo-400 tabular-nums">{moderate}</span>
        </div>
        <div className="glass-panel p-3.5 border-l-4 border-l-teal-500">
          <span className="text-[11px] text-teal-300 block mb-1">Low Severity</span>
          <span className="text-xl font-bold font-mono text-teal-400 tabular-nums">{low}</span>
        </div>
        <div className="glass-panel p-3.5">
          <span className="text-[11px] text-slate-400 block mb-1">Resolved</span>
          <span className="text-xl font-bold font-mono text-teal-300 tabular-nums">{resolved}</span>
        </div>
      </div>

      {/* Top Visual: Interactive Risk Priority Matrix */}
      <div className="grid grid-cols-1 gap-6">
        <RiskMatrix
          risks={risks}
          onSelectRisk={(r) => setSelectedRisk(r)}
        />
      </div>

      {/* Filters and Search Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search risks by title, description, or mitigation..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60"
          />
        </div>

        {/* Severity Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          {['All', 'Critical', 'High', 'Moderate', 'Low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                selectedSeverity === sev
                  ? 'bg-slate-800 text-teal-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-teal-500/60"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Risk Register Table */}
      <div className="glass-panel p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Formal Project Risk Register</h3>
            <p className="text-xs text-slate-400">Identified risks extracted from project documents</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              Showing {filteredRisks.length} of {risks.length} risks
            </span>
            {risks.length > 0 && (
              <button
                onClick={handleClearRisks}
                disabled={isClearing}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Clear sample risks so you can re-analyze your real documents"
              >
                {isClearing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Clear All Risks</span>
              </button>
            )}
          </div>
        </div>

        {filteredRisks.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 text-teal-400 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">No Risks In Register</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {risks.length === 0
                ? 'Sample risks have been cleared. Upload your real project documents on the Documents page and click Re-Analyze All to detect real risks directly from your files.'
                : 'No risks match the selected search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
          {filteredRisks.map((risk) => (
            <div
              key={risk.id}
              className={`p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all ${
                selectedRisk?.id === risk.id ? 'ring-1 ring-teal-500 border-teal-500/40' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2.5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-semibold text-teal-400">{risk.id}</span>
                    <span className="text-xs font-semibold text-slate-100">{risk.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-mono text-slate-300">{risk.category} Risk</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">Probability: {risk.probability}%</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">Impact: {risk.impact}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <RiskBadge severity={risk.severity} />
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                      risk.status === 'Resolved'
                        ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                        : risk.status === 'Mitigating'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {risk.status}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-3">{risk.description}</p>

              {/* Evidence Quote */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 mb-3 text-xs text-slate-400 flex items-start gap-2">
                <FileText className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-300 block text-[11px] mb-0.5">Evidence in Source Documents:</span>
                  <p className="italic text-[11px] text-slate-300">"{risk.evidence}"</p>
                </div>
              </div>

              {/* Mitigation Strategy */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div className="text-slate-300">
                  <span className="font-semibold text-teal-400">Actionable Mitigation: </span>
                  {risk.mitigation}
                </div>
                <button
                  onClick={() => onOpenAssistant(`Give me an in-depth execution plan to mitigate ${risk.id}: ${risk.title}`)}
                  className="text-[11px] text-teal-400 hover:text-teal-300 font-medium whitespace-nowrap self-end sm:self-auto"
                >
                  Generate Plan →
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};
