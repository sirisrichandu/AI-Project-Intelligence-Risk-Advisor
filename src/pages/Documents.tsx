import React, { useState, useRef, useEffect } from 'react';
import { ProjectDocument } from '../types';
import { api } from '../services/api';
import {
  UploadCloud,
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  File,
  Info,
  Database,
  Layers,
  Sparkles,
  Download,
  AlertTriangle,
  PlayCircle,
  FilePlus,
} from 'lucide-react';

interface DocumentsProps {
  documents: ProjectDocument[];
  totalChunks: number;
  onRefresh: () => void;
  onRunPipeline: () => void;
}

export const Documents: React.FC<DocumentsProps> = ({
  documents,
  totalChunks,
  onRefresh,
  onRunPipeline,
}) => {
  // Local state for instant visual feedback on upload
  const [localDocs, setLocalDocs] = useState<ProjectDocument[]>(documents);
  const [localChunks, setLocalChunks] = useState<number>(totalChunks);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [actionNotification, setActionNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [isInjectingSample, setIsInjectingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep local state in sync whenever parent documents update
  useEffect(() => {
    setLocalDocs(documents);
  }, [documents]);

  useEffect(() => {
    setLocalChunks(totalChunks);
  }, [totalChunks]);

  const handleDownloadDoc = async (id: string, name: string) => {
    try {
      const url = api.downloadDocumentUrl(id);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 4000);
    } catch (err) {
      window.location.href = api.downloadDocumentUrl(id);
    }
  };

  const handleFileUpload = async (incomingFiles: FileList | File[] | null) => {
    if (!incomingFiles) return;

    // CRITICAL: Snapshot FileList to plain JS Array synchronously before any await
    // to prevent browser garbage collection or input.value clearing from dropping files
    const files: File[] = Array.from(incomingFiles);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadStatus(`Preparing ${files.length} document(s)...`);

    try {
      setUploadStatus(`Extracting content & encoding ${files.length} document(s)...`);

      // Read ALL files concurrently with Promise.all
      const payloads = await Promise.all(
        files.map(async (file) => {
          const ext = file.name.split('.').pop()?.toLowerCase();
          const sizeKB = file.size / 1024;
          const sizeStr = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeKB))} KB`;

          // Text-based files: read as UTF-8 text directly in the browser
          if (['txt', 'csv', 'tsv', 'md', 'json', 'log', 'yaml', 'yml'].includes(ext || '')) {
            try {
              const content = await file.text();
              return { name: file.name, size: sizeStr, content };
            } catch (readErr) {
              console.warn('Browser file.text() fallback:', readErr);
            }
          }

          // Binary files (PDF, Word DOCX, Excel XLSX): read as Base64 Data URL
          return new Promise<{ name: string; size: string; base64: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: file.name, size: sizeStr, base64: (reader.result as string) || '' });
            reader.onerror = () => resolve({ name: file.name, size: sizeStr, base64: '' });
            reader.readAsDataURL(file);
          });
        })
      );

      setUploadStatus(`Indexing ${payloads.length} document(s) into RAG vector space...`);
      let res;
      try {
        res = await api.uploadDocumentsJson(payloads);
      } catch (jsonErr) {
        console.warn('JSON upload failed, attempting multipart fallback:', jsonErr);
        const formData = new FormData();
        for (const file of files) {
          formData.append('files', file);
        }
        res = await api.uploadDocuments(formData);
      }

      if (res.uploadedDocuments && res.uploadedDocuments.length > 0) {
        // Instantly reflect all uploaded documents in the table
        setLocalDocs((prev) => {
          const newIds = new Set(res.uploadedDocuments.map((d) => d.id));
          const filtered = prev.filter((d) => !newIds.has(d.id));
          return [...res.uploadedDocuments, ...filtered];
        });
        setLocalChunks(res.totalKnowledgeChunks);

        setActionNotification({
          type: 'success',
          message: `Successfully ingested all ${res.uploadedDocuments.length} document(s) (${res.totalKnowledgeChunks} vector chunks). Click "Run AI Multi-Agent Pipeline" below to analyze your project!`,
        });
      } else {
        setActionNotification({
          type: 'info',
          message: 'Documents processed and indexed into knowledge base.',
        });
      }

      setUploadStatus(null);
      // Trigger parent refresh to update dashboard, summary, and health score
      onRefresh();
    } catch (err: any) {
      console.error('File upload error:', err);
      setActionNotification({
        type: 'error',
        message: `Upload failed: ${err.message || 'Unable to parse document format.'}`,
      });
      setUploadStatus(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      setDeletingId(id);
      await api.deleteDocument(id);
      setLocalDocs((prev) => prev.filter((d) => d.id !== id));
      setActionNotification({
        type: 'info',
        message: `Removed "${name}" from knowledge base.`,
      });
      setTimeout(() => setActionNotification(null), 3500);
      onRefresh();
    } catch (err: any) {
      setActionNotification({
        type: 'error',
        message: `Failed to delete: ${err.message || 'Error'}`,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    try {
      setIsClearingAll(true);
      await api.clearAllDocuments();
      setLocalDocs([]);
      setLocalChunks(0);
      setActionNotification({
        type: 'info',
        message: 'All documents cleared. Knowledge base is ready for your project files.',
      });
      setTimeout(() => setActionNotification(null), 4000);
      onRefresh();
    } catch (err: any) {
      setActionNotification({
        type: 'error',
        message: `Failed to clear: ${err.message || 'Error'}`,
      });
    } finally {
      setIsClearingAll(false);
    }
  };

  // Quick Ingestion of sample documents to test the pipeline immediately
  const handleQuickIngestSample = async (sampleType: 'srs' | 'tasks' | 'notes' | 'all') => {
    try {
      setIsInjectingSample(true);
      setUploadStatus('Creating and indexing sample project artifact(s)...');

      let samplePayloads: Array<{ name: string; size: string; content: string }> = [];

      if (sampleType === 'all') {
        samplePayloads = [
          {
            name: '1_project_specification.docx',
            size: '24 KB',
            content: 'Project SRS: Cloud Platform Architecture and System Requirements. Deliverables include OAuth gateway, high availability RAG vector store, and 99.9% uptime SLA.',
          },
          {
            name: '2_sprint_task_backlog.csv',
            size: '18 KB',
            content: 'Task ID,Task Name,Owner,Priority,Status\nTSK-101,Setup Database Cluster,DevOps Lead,High,In Progress\nTSK-102,API Gateway Auth,Backend Team,Critical,Blocked\nTSK-103,Frontend Dashboard,UI Engineer,Medium,In Progress',
          },
          {
            name: '3_sprint_retrospective_notes.txt',
            size: '8 KB',
            content: 'Sprint 04 Retrospective Meeting Notes:\nBlockers identified: Third party API sandbox delays.\nAction item: Escalate to vendor contact by Friday. Team capacity at 85%.',
          },
        ];
      } else if (sampleType === 'tasks') {
        samplePayloads = [
          {
            name: 'task_backlog.csv',
            size: '18 KB',
            content: 'Task ID,Task Name,Owner,Priority,Status\nTSK-101,Setup Database Cluster,DevOps Lead,High,In Progress\nTSK-102,API Gateway Auth,Backend Team,Critical,Blocked',
          },
        ];
      } else if (sampleType === 'notes') {
        samplePayloads = [
          {
            name: 'sprint_retro_notes.txt',
            size: '8 KB',
            content: 'Sprint Retrospective Meeting Notes:\nBlockers identified: Third party API sandbox delays.\nAction item: Escalate to vendor contact by Friday.',
          },
        ];
      } else {
        samplePayloads = [
          {
            name: 'project_overview.docx',
            size: '24 KB',
            content: 'Project Specification: Cloud Platform System Architecture and Delivery Roadmap. Target release: Dec 2026. Microservices architecture with 99.9% uptime requirement.',
          },
        ];
      }

      const res = await api.uploadDocumentsJson(samplePayloads);

      if (res.uploadedDocuments) {
        setLocalDocs((prev) => {
          const newIds = new Set(res.uploadedDocuments.map((d) => d.id));
          const filtered = prev.filter((d) => !newIds.has(d.id));
          return [...res.uploadedDocuments, ...filtered];
        });
        setLocalChunks(res.totalKnowledgeChunks);
      }

      setActionNotification({
        type: 'success',
        message: `Successfully ingested ${res.uploadedDocuments.length} document(s) into knowledge base!`,
      });
      setUploadStatus(null);
      onRefresh();
    } catch (err: any) {
      setActionNotification({
        type: 'error',
        message: `Quick ingest failed: ${err.message}`,
      });
      setUploadStatus(null);
    } finally {
      setIsInjectingSample(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-rose-400" />;
      case 'DOCX':
      case 'DOC':
        return <FileCode className="w-5 h-5 text-blue-400" />;
      case 'XLSX':
      case 'XLS':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      case 'CSV':
        return <FileSpreadsheet className="w-5 h-5 text-teal-400" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Project Document Management & Ingestion</h2>
          <p className="text-xs text-slate-400">
            Accepts PDF, DOCX, XLSX, CSV, Markdown, and TXT files for semantic chunking, vector indexing, and multi-agent retrieval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-400">Knowledge Chunks:</span>
            <span className="text-white font-bold tabular-nums">{localChunks}</span>
          </div>
          <button
            onClick={onRunPipeline}
            disabled={localDocs.length === 0}
            className="px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-teal-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Run AI Pipeline</span>
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.tsv,.txt,.text,.md,.markdown,.json,.rtf,.log"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            handleFileUpload(files);
          }
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            handleFileUpload(files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`glass-panel p-8 text-center border-2 border-dashed transition-all cursor-pointer ${
          isDragging
            ? 'border-teal-400 bg-teal-500/10 scale-[1.005]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto mb-3">
          {isUploading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
        </div>
        <h3 className="text-sm font-semibold text-slate-100">Upload Project Documents</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Drag & drop one or multiple project artifacts simultaneously, or click below to select multiple files.
        </p>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={isUploading}
            className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition-colors inline-flex items-center gap-2 shadow-sm shadow-teal-500/30 disabled:opacity-50"
          >
            {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            <span>{isUploading ? 'Ingesting Documents...' : 'Browse Multiple Files From Computer'}</span>
          </button>
        </div>

        {/* Supported Formats */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 text-[11px] font-mono text-slate-400 mt-4">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> DOCX / DOC</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> PDF</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> XLSX / XLS</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-400" /> CSV / TSV</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Markdown (.md)</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> TXT</span>
        </div>

        {/* Processing Notification */}
        {uploadStatus && (
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-teal-500/40 text-xs text-teal-300 font-mono shadow-lg">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{uploadStatus}</span>
          </div>
        )}
      </div>

      {/* Action Notification Banner */}
      {actionNotification && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            actionNotification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : actionNotification.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              : 'bg-teal-950/40 border-teal-500/40 text-teal-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionNotification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {actionNotification.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {actionNotification.type === 'info' && <Info className="w-4 h-4 text-teal-400 shrink-0" />}
            <span className="leading-relaxed">{actionNotification.message}</span>
          </div>
          <button
            onClick={() => setActionNotification(null)}
            className="text-xs font-mono opacity-70 hover:opacity-100 underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Ingested Documents Table */}
      <div className="glass-panel p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Ingested Project Knowledge Base</h3>
            <p className="text-xs text-slate-400">Current documents indexed into vector similarity space</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-xs font-mono text-slate-400">
              {localDocs.length} File{localDocs.length === 1 ? '' : 's'} Ingested
            </span>
            <button
              onClick={() => handleQuickIngestSample('all')}
              disabled={isInjectingSample}
              className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Add 3 multi-document artifacts at once (SRS, Backlog, Retro)"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>+ Add Multi-Doc Pack (3 Files)</span>
            </button>
            {localDocs.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={isClearingAll}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Remove all documents so you can upload your real documents"
              >
                {isClearingAll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete All Documents</span>
              </button>
            )}
          </div>
        </div>

        {localDocs.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 text-teal-400 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">Knowledge Base is Empty</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              No project documents are currently uploaded. Drag & drop your project files (PDF, DOCX, XLSX, CSV, Markdown, or TXT) into the box above to begin AI analysis.
            </p>

            {/* Quick Test Option */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 max-w-md mx-auto">
              <span className="text-[11px] font-mono text-slate-400 block mb-2">
                Want to test immediately? Add a sample template:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => handleQuickIngestSample('all')}
                  disabled={isInjectingSample}
                  className="px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/50 text-teal-200 text-xs font-mono transition-colors flex items-center gap-1.5 font-bold shadow-sm shadow-teal-500/20"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>+ Ingest Multi-Doc Pack (3 Documents)</span>
                </button>
                <button
                  onClick={() => handleQuickIngestSample('srs')}
                  disabled={isInjectingSample}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-teal-300 text-xs font-mono transition-colors flex items-center gap-1.5"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>+ Sample Spec (.docx)</span>
                </button>
                <button
                  onClick={() => handleQuickIngestSample('tasks')}
                  disabled={isInjectingSample}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-teal-300 text-xs font-mono transition-colors flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>+ Sample Backlog (.csv)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Document Name</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Size</th>
                  <th className="pb-3 font-semibold">Chunks</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Uploaded</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {localDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 font-medium text-slate-100 flex items-center gap-2.5">
                      {getFileIcon(doc.type)}
                      <span className="truncate max-w-[240px]" title={doc.name}>
                        {doc.name}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {doc.type}
                      </span>
                    </td>
                    <td className="py-3 capitalize text-slate-400">{doc.category}</td>
                    <td className="py-3 font-mono text-slate-400 tabular-nums">{doc.size}</td>
                    <td className="py-3 font-mono text-teal-400 tabular-nums font-semibold">
                      {doc.chunkCount || 1} chunks
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-teal-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Indexed
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-400 tabular-nums">{doc.uploadDate}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownloadDoc(doc.id, doc.name)}
                          title={`Download ${doc.name}`}
                          className="p-1.5 rounded text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition-colors inline-flex items-center"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.name)}
                          disabled={deletingId === doc.id}
                          title={`Delete ${doc.name}`}
                          className="p-1.5 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 transition-colors inline-flex items-center disabled:opacity-50"
                        >
                          {deletingId === doc.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Post-Upload Next Step Guidance Card (shown when documents exist) */}
      {localDocs.length > 0 && (
        <div className="glass-panel p-4 bg-teal-950/20 border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Next Step: Execute Multi-Agent Intelligence Pipeline</h4>
              <p className="text-[11px] text-slate-300">
                Run the Scope, Risk, and Blocker agents on your newly ingested documents to populate the dashboard metrics and risk matrix.
              </p>
            </div>
          </div>
          <button
            onClick={onRunPipeline}
            className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors shrink-0 shadow-sm shadow-teal-500/20"
          >
            Run Multi-Agent Pipeline
          </button>
        </div>
      )}
    </div>
  );
};
