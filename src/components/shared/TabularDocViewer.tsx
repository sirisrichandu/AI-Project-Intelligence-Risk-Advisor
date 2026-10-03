import React, { useState } from 'react';
import { Table, AlignLeft, Copy, Check, FileText, Sparkles, UploadCloud } from 'lucide-react';

interface TabularDocViewerProps {
  content: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  hasDocuments?: boolean;
  onGoToUpload?: () => void;
}

interface TableSection {
  title: string;
  headers: string[];
  rows: string[][];
}

export function parseTabularContent(text: string): TableSection[] {
  if (!text || text.trim() === '') return [];

  const sections: TableSection[] = [];
  const lines = text.split('\n');

  let currentTitle = '';
  let currentHeaders: string[] = [];
  let currentRows: string[][] = [];

  const flush = () => {
    if (currentTitle && currentHeaders.length > 0) {
      sections.push({
        title: currentTitle,
        headers: currentHeaders,
        rows: currentRows,
      });
    }
    currentTitle = '';
    currentHeaders = [];
    currentRows = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect section titles (with or without numbers, markdown headers)
    const cleanLine = line.replace(/^#+\s*/, '').trim();
    if (
      cleanLine.startsWith('1. User Stories') ||
      cleanLine.startsWith('2. Risk Register') ||
      cleanLine.startsWith('3. Action Items') ||
      cleanLine.toLowerCase().startsWith('user stories') ||
      cleanLine.toLowerCase().startsWith('risk register') ||
      cleanLine.toLowerCase().startsWith('action items') ||
      cleanLine.toLowerCase().includes('enterprise risk register') ||
      cleanLine.toLowerCase().includes('active blockers')
    ) {
      flush();
      currentTitle = cleanLine;
      continue;
    }

    // 1. Tab-delimited rows
    if (rawLine.includes('\t')) {
      const parts = rawLine.split('\t').map((p) => p.trim());
      if (parts[0] === 'ID' || parts[0]?.toLowerCase() === 'id' || parts[0]?.toLowerCase() === 'risk id' || parts[0]?.toLowerCase() === 'action id') {
        currentHeaders = parts;
      } else {
        currentRows.push(parts);
      }
      continue;
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

      if (currentHeaders.length === 0) {
        currentHeaders = parts;
      } else {
        currentRows.push(parts);
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
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');
  const [copied, setCopied] = useState(false);

  const sections = parseTabularContent(content);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="space-y-4">
      {/* View Switcher Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800">
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
            <span>Raw Text (Tab-Delimited)</span>
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
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
              <span>Copy Text</span>
            </>
          )}
        </button>
      </div>

      {viewMode === 'table' && sections.length > 0 ? (
        <div className="space-y-6">
          {sections.map((section, sIdx) => (
            <div
              key={sIdx}
              className="rounded-xl border border-slate-800/90 bg-slate-950/70 overflow-hidden shadow-sm"
            >
              {/* Section Header */}
              <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-teal-400 font-mono tracking-tight">
                  {section.title}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {section.rows.length} records
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
                    {section.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-slate-900/40 transition-colors"
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`px-4 py-3 leading-relaxed ${
                              cIdx === 0
                                ? 'font-bold text-teal-300 whitespace-nowrap'
                                : 'text-slate-200'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre overflow-x-auto shadow-inner">
          {content}
        </div>
      )}
    </div>
  );
};
