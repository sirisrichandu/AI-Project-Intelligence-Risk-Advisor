import React, { useState } from 'react';
import { Table, AlignLeft, Copy, Check, FileText, Sparkles, UploadCloud, Download, FileSpreadsheet } from 'lucide-react';
import { downloadSinglePDF } from '../../utils/pdfDownloader';

interface TabularDocViewerProps {
  content: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  hasDocuments?: boolean;
  onGoToUpload?: () => void;
  documentTitle?: string;
}

interface TableSection {
  title: string;
  headers: string[];
  rows: string[][];
}

export function parseTabularContent(text: string): TableSection[] {
  if (!text || text.trim() === '') return [];

  const sections: TableSection[] = [];
  const lines = text.split(/\r?\n/);

  let currentTitle = '';
  let currentHeaders: string[] = [];
  let currentRows: string[][] = [];

  const flush = () => {
    if (currentTitle && (currentHeaders.length > 0 || currentRows.length > 0)) {
      if (currentHeaders.length === 0 && currentRows.length > 0) {
        currentHeaders = currentRows[0];
        currentRows = currentRows.slice(1);
      }
      if (currentHeaders.length > 0) {
        sections.push({
          title: currentTitle,
          headers: currentHeaders,
          rows: currentRows,
        });
      }
    }
    currentTitle = '';
    currentHeaders = [];
    currentRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    // Detect section titles (with or without numbers, markdown headers)
    const cleanLine = line.replace(/^[#*_\s]+/, '').replace(/[*_]+$/, '').trim();
    const isSectionHeading =
      /^[0-9]+[\.\)]\s+[A-Za-z]/.test(cleanLine) ||
      cleanLine.toLowerCase().startsWith('user stories') ||
      cleanLine.toLowerCase().startsWith('risk register') ||
      cleanLine.toLowerCase().startsWith('action items') ||
      cleanLine.toLowerCase().startsWith('active blockers') ||
      cleanLine.toLowerCase().includes('user stories &') ||
      cleanLine.toLowerCase().includes('risk register &') ||
      cleanLine.toLowerCase().includes('action items register') ||
      cleanLine.toLowerCase().includes('enterprise risk register') ||
      line.startsWith('### ') ||
      line.startsWith('## ');

    if (isSectionHeading && !rawLine.includes('\t') && (!line.startsWith('|') || !line.endsWith('|'))) {
      flush();
      currentTitle = cleanLine;
      continue;
    }

    // 1. Tab-delimited rows
    if (rawLine.includes('\t')) {
      const parts = rawLine.split('\t').map((p) => p.trim());
      if (parts.length >= 2) {
        if (!currentTitle) {
          currentTitle = 'Project Intelligence Register';
        }

        if (currentHeaders.length === 0) {
          currentHeaders = parts;
        } else {
          currentRows.push(parts);
        }
        continue;
      }
    }

    // 2. Markdown pipe table rows (| Col 1 | Col 2 |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const parts = line
        .split('|')
        .slice(1, -1)
        .map((p) => p.trim());

      // Ignore markdown separator row (| :--- | :--- |)
      if (parts.every((p) => /^:?-+:?$/.test(p))) {
        continue;
      }

      if (!currentTitle) {
        currentTitle = 'Project Intelligence Register';
      }

      if (currentHeaders.length === 0) {
        currentHeaders = parts;
      } else {
        currentRows.push(parts);
      }
      continue;
    }

    // 3. Structured ID item pattern (e.g. US-01: ... or RSK-01: ... or A-01: ...)
    const idMatch = line.match(/^([A-Z0-9]+-[0-9]+)[:\s—-]+(.*)$/i);
    if (idMatch) {
      const itemId = idMatch[1].toUpperCase();
      const rest = idMatch[2].trim();

      if (!currentTitle) {
        if (itemId.startsWith('US')) currentTitle = '1. User Stories & Scope Synthesis';
        else if (itemId.startsWith('RSK') || itemId.startsWith('R-')) currentTitle = '2. Risk Register & Delivery Forecasting';
        else currentTitle = '3. Action Items Register';
      }

      if (currentHeaders.length === 0) {
        if (currentTitle.toLowerCase().includes('user stor')) {
          currentHeaders = ['ID', 'User Story Narrative', 'Acceptance Criteria', 'Milestone', 'Priority'];
        } else if (currentTitle.toLowerCase().includes('risk')) {
          currentHeaders = ['ID', 'Risk Title', 'Category', 'Severity', 'Mitigation Strategy', 'Owner'];
        } else {
          currentHeaders = ['ID', 'Action Deliverable', 'Assigned Team', 'Target Deadline', 'Priority', 'Status'];
        }
      }

      // Extract parts by colon or dash or tab
      const subParts = rest.split(/[:|—]\s*/).map((s) => s.trim()).filter(Boolean);
      const cells = [itemId, ...subParts];
      while (cells.length < currentHeaders.length) {
        cells.push('—');
      }
      currentRows.push(cells.slice(0, currentHeaders.length));
      continue;
    }

    // 4. Fallback: Multi-space column separation
    if (/\s{3,}/.test(line)) {
      const parts = line.split(/\s{3,}/).map((p) => p.trim());
      if (parts.length >= 2) {
        if (!currentTitle) currentTitle = 'Project Intelligence Register';
        if (currentHeaders.length === 0) currentHeaders = parts;
        else currentRows.push(parts);
        continue;
      }
    }
  }

  flush();
  return sections;
}

export const TabularDocViewer: React.FC<TabularDocViewerProps> = ({
  content,
  onRefresh,
  isRefreshing,
  hasDocuments = false,
  onGoToUpload,
  documentTitle = 'Project_Specification_Documentation',
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');
  const [copied, setCopied] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'stories' | 'risks' | 'actions'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sections = parseTabularContent(content);

  const filteredSections = sections.filter((s) => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'stories') return s.title.toLowerCase().includes('user stor');
    if (selectedTab === 'risks') return s.title.toLowerCase().includes('risk');
    if (selectedTab === 'actions') return s.title.toLowerCase().includes('action') || s.title.toLowerCase().includes('blocker');
    return true;
  });

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    if (!content) return;
    downloadSinglePDF(documentTitle, content);
  };

  const handleExportTxt = () => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentTitle.replace(/[\s\W]+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  // If no documents are uploaded, show clear prompt to upload documents first
  if (!hasDocuments || !content || content.trim() === '') {
    return (
      <div className="py-16 px-4 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/60">
        <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto mb-3">
          <UploadCloud className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-100">
          {!hasDocuments ? 'No Project Documents Uploaded' : 'Awaiting Documentation Synthesis'}
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          {!hasDocuments
            ? 'Upload your project documents (e.g. SRS, architecture specs, Jira CSV backlog, or meeting notes) in the Document Ingestion view to extract genuine User Stories, Risk Registers, and Action Items.'
            : 'Documents are uploaded. Click below to run the Documentation Generation Agent and synthesize structured output.'}
        </p>

        <div className="mt-5 flex items-center justify-center gap-3">
          {onGoToUpload && (
            <button
              onClick={onGoToUpload}
              className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors inline-flex items-center gap-2 shadow-sm shadow-teal-500/20"
            >
              <UploadCloud className="w-4 h-4 text-slate-950" />
              <span>Upload Project Documents</span>
            </button>
          )}

          {hasDocuments && onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors inline-flex items-center gap-2 border border-slate-700 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>{isRefreshing ? 'Synthesizing...' : 'Synthesize Documentation'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const totalRecords = sections.reduce((acc, s) => acc + s.rows.length, 0);

  return (
    <div className="space-y-4">
      {/* View Switcher & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Table / Raw Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Interactive Table View</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'raw'
                  ? 'bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Raw Text</span>
            </button>
          </div>

          {/* Section Filter Pills (Only visible in Table mode) */}
          {viewMode === 'table' && sections.length > 1 && (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
              <button
                onClick={() => setSelectedTab('all')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedTab === 'all'
                    ? 'bg-slate-800 text-teal-300 font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({totalRecords})
              </button>
              <button
                onClick={() => setSelectedTab('stories')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedTab === 'stories'
                    ? 'bg-slate-800 text-teal-300 font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                User Stories
              </button>
              <button
                onClick={() => setSelectedTab('risks')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedTab === 'risks'
                    ? 'bg-slate-800 text-teal-300 font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Risk Register
              </button>
              <button
                onClick={() => setSelectedTab('actions')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  selectedTab === 'actions'
                    ? 'bg-slate-800 text-teal-300 font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Action Items
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'table' && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter table rows..."
              className="px-2.5 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 w-36 sm:w-44"
            />
          )}

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 shrink-0"
            title="Copy formatted tab-delimited text"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-teal-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportTxt}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 shrink-0"
            title="Download formatted tab-delimited text file"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span> TXT
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-sm shadow-teal-500/20"
            title="Download formatted multi-table PDF containing User Stories, Risk Register, and Action Items"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {viewMode === 'table' && filteredSections.length > 0 ? (
        <div className="space-y-6">
          {filteredSections.map((section, sIdx) => {
            const displayRows = searchQuery.trim()
              ? section.rows.filter((r) =>
                  r.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
                )
              : section.rows;

            return (
              <div
                key={sIdx}
                className="rounded-xl border border-slate-800/90 bg-slate-950/70 overflow-hidden shadow-sm"
              >
                {/* Section Header */}
                <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-400 font-mono tracking-tight flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-teal-400" />
                    {section.title}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {displayRows.length} of {section.rows.length} records
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/50 text-[11px] font-mono font-semibold text-slate-400 uppercase border-b border-slate-800">
                      <tr>
                        {section.headers.map((h, hIdx) => (
                          <th
                            key={hIdx}
                            className="px-4 py-2.5 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                      {displayRows.length === 0 ? (
                        <tr>
                          <td colSpan={section.headers.length} className="px-4 py-6 text-center text-slate-500 italic">
                            No matching records found for "{searchQuery}"
                          </td>
                        </tr>
                      ) : (
                        displayRows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="hover:bg-slate-900/40 transition-colors"
                          >
                            {row.map((cell, cIdx) => {
                              const trimmed = cell.trim();
                              const lower = trimmed.toLowerCase();
                              const isPriority = lower === 'critical' || lower === 'high' || lower === 'medium' || lower === 'low';
                              const isStatus = lower === 'open' || lower === 'active' || lower === 'in progress' || lower === 'pending' || lower === 'completed' || lower === 'monitoring' || lower === 'agreed' || lower === 'pending approval';
                              const isId = /^[A-Z0-9]+-[0-9]+$/i.test(trimmed);
                              const isPercent = /^[0-9]+%$/.test(trimmed);

                              return (
                                <td
                                  key={cIdx}
                                  className={`px-4 py-3 leading-relaxed ${
                                    cIdx === 0
                                      ? 'font-bold text-teal-300 whitespace-nowrap'
                                      : 'text-slate-200'
                                  }`}
                                >
                                  {isId ? (
                                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-teal-400 font-bold">
                                      {trimmed}
                                    </span>
                                  ) : isPriority ? (
                                    <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase font-bold ${
                                      lower === 'critical'
                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                        : lower === 'high'
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                        : 'bg-slate-800 text-slate-300 border-slate-700'
                                    }`}>
                                      {trimmed}
                                    </span>
                                  ) : isStatus ? (
                                    <span className={`px-2 py-0.5 rounded border text-[10px] font-mono ${
                                      lower === 'completed'
                                        ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                                        : lower === 'in progress' || lower === 'active'
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                        : 'bg-slate-800 text-slate-300 border-slate-700'
                                    }`}>
                                      {trimmed}
                                    </span>
                                  ) : isPercent ? (
                                    <span className="font-mono font-semibold text-teal-400">
                                      {trimmed}
                                    </span>
                                  ) : (
                                    cell
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre overflow-x-auto shadow-inner">
          {content}
        </div>
      )}
    </div>
  );
};
