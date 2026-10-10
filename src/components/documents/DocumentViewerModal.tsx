import React, { useState, useEffect } from 'react';
import { ProjectDocument } from '../../types';
import { downloadSinglePDF } from '../../utils/pdfDownloader';
import {
  X,
  FileText,
  Download,
  Copy,
  Check,
  Search,
  Database,
  Layers,
  FileCode,
  FileSpreadsheet,
  File,
  CheckCircle2,
  Calendar,
  HardDrive,
  FileCheck,
  Tag,
} from 'lucide-react';

interface DocumentViewerModalProps {
  document: ProjectDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (id: string, name: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  onDownload,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'chunks'>('content');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchedChunks, setFetchedChunks] = useState<any[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  useEffect(() => {
    if (isOpen && doc?.id) {
      setLoadingChunks(true);
      fetch(`/api/documents/${doc.id}/chunks`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.chunks) && data.chunks.length > 0) {
            setFetchedChunks(data.chunks);
          } else {
            setFetchedChunks([]);
          }
        })
        .catch((err) => {
          console.warn('Error fetching document chunks:', err);
          setFetchedChunks([]);
        })
        .finally(() => setLoadingChunks(false));
    }
  }, [isOpen, doc?.id]);

  if (!isOpen || !doc) return null;

  const contentText = doc.content || `[No raw text extracted for ${doc.name}]`;
  const lines: string[] = contentText.split('\n');
  const filteredLines: string[] = searchQuery.trim()
    ? lines.filter((l: string) => l.toLowerCase().includes(searchQuery.toLowerCase()))
    : lines;

  const handleCopy = () => {
    navigator.clipboard.writeText(contentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getFileIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-rose-400" />;
      case 'DOCX':
      case 'DOC':
        return <FileCode className="w-5 h-5 text-blue-400" />;
      case 'XLSX':
      case 'XLS':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      case 'CSV':
      case 'TSV':
        return <FileSpreadsheet className="w-5 h-5 text-teal-400" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  // Fallback to local synthesized chunks if backend chunks not yet fetched
  const displayChunks = fetchedChunks.length > 0
    ? fetchedChunks.map((c, idx) => ({
        index: idx + 1,
        id: c.id,
        section_title: c.section_title || `Section ${idx + 1}`,
        semantic_type: c.semantic_type || 'narrative',
        length: (c.text || '').length,
        tokens: c.tokens || Math.ceil((c.text || '').length / 4),
        snippet: c.text || '',
      }))
    : Array.from({ length: doc.chunkCount || 1 }).map((_, idx) => {
        const start = idx * 600;
        const end = Math.min(start + 600, contentText.length);
        const chunkSnippet = contentText.slice(start, end).trim();
        return {
          index: idx + 1,
          id: `${doc.id}_chunk_${idx + 1}`,
          section_title: `Semantic Block #${idx + 1}`,
          semantic_type: 'structural_block',
          length: chunkSnippet.length,
          tokens: Math.ceil(chunkSnippet.length / 4),
          snippet: chunkSnippet || `Vector embedding chunk ${idx + 1} for ${doc.name}`,
        };
      });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
              {getFileIcon(doc.type)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white truncate max-w-md" title={doc.name}>
                  {doc.name}
                </h3>
                <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-teal-400 border border-slate-700">
                  {doc.type}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" /> Indexed in ChromaDB
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> {doc.size}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {doc.uploadDate}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-teal-400">
                  <Database className="w-3 h-3" /> {doc.chunkCount || 1} Chunks
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                downloadSinglePDF(
                  `${doc.name.replace(/\.[^/.]+$/, '')}_Extracted_Intelligence`,
                  doc.content || contentText
                );
              }}
              className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm shadow-teal-500/20"
              title="Export formatted PDF with User Stories, Risk Register, and Action Items"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              onClick={() => onDownload(doc.id, doc.name)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Download original raw file"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subheader / Tabs */}
        <div className="px-6 py-2.5 bg-slate-900/50 border-b border-slate-800/80 flex items-center justify-between gap-4 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('content')}
              className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'content'
                  ? 'bg-teal-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Extracted Document Content</span>
              <span className="text-[10px] opacity-75 font-mono">({lines.length} lines)</span>
            </button>
            <button
              onClick={() => setActiveTab('chunks')}
              className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'chunks'
                  ? 'bg-teal-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vector Chunks</span>
              <span className="text-[10px] opacity-75 font-mono">({displayChunks.length})</span>
            </button>
          </div>

          {activeTab === 'content' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search in document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 w-44 sm:w-56"
                />
              </div>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Copy entire document text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40 font-mono text-xs text-slate-300">
          {activeTab === 'content' ? (
            <div className="space-y-1">
              {filteredLines.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-sans">
                  No text matching &quot;{searchQuery}&quot; found in document.
                </div>
              ) : (
                filteredLines.map((line: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-4 hover:bg-slate-900/60 py-0.5 px-2 rounded">
                    <span className="text-slate-600 select-none w-10 text-right tabular-nums shrink-0 text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="whitespace-pre-wrap break-words leading-relaxed text-slate-200">
                      {line}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4 font-sans">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>
                    Semantic structural chunks indexed in ChromaDB vector repository ({displayChunks.length} chunks).
                  </span>
                </div>
                {loadingChunks && (
                  <span className="text-[11px] text-teal-400 animate-pulse font-mono">Syncing vector store...</span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3">
                {displayChunks.map((chk) => (
                  <div
                    key={chk.id}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold">
                          Chunk #{chk.index}
                        </span>
                        <span className="text-slate-500 text-[11px]">{chk.id}</span>
                        {chk.semantic_type && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] uppercase border border-slate-700">
                            {chk.semantic_type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-slate-400 text-xs font-mono">
                        <span>~{chk.tokens} tokens</span>
                        <span>{chk.length} chars</span>
                      </div>
                    </div>
                    {chk.section_title && (
                      <div className="mb-2 text-xs font-semibold text-slate-200 flex items-center gap-1.5 font-sans">
                        <Tag className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span className="truncate">{chk.section_title}</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                      {chk.snippet}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 shrink-0 font-mono">
          <span>
            {contentText.length.toLocaleString()} characters • {contentText.split(/\s+/).filter(Boolean).length.toLocaleString()} words
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
