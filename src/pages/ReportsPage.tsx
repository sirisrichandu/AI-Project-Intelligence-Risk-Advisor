import React, { useState, useEffect } from 'react';
import { GeneratedReport } from '../types';
import { api } from '../services/api';
import { downloadSinglePDF } from '../utils/pdfDownloader';
import { TabularDocViewer } from '../components/shared/TabularDocViewer';
import {
  FileText,
  Download,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileCheck,
} from 'lucide-react';

interface ReportsPageProps {
  documentationOutput?: string;
  hasDocuments?: boolean;
  onNavigate?: (page: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  documentationOutput,
  hasDocuments = false,
  onNavigate,
}) => {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeOutput, setActiveOutput] = useState<string>('');

  useEffect(() => {
    loadReports();
  }, [hasDocuments]);

  useEffect(() => {
    if (!hasDocuments) {
      setActiveOutput('');
    } else if (documentationOutput) {
      setActiveOutput(documentationOutput);
    }
  }, [documentationOutput, hasDocuments]);

  const loadReports = async () => {
    try {
      const docRes = await api.getDocuments();
      const docsCount = docRes.documents?.length || 0;

      const data = await api.getReports();
      setReports(data.reports);

      // If no documents exist in store, strictly keep output empty!
      if (docsCount === 0) {
        setActiveOutput('');
        return;
      }

      const latestDoc = await api.getLatestDocumentation();
      if (latestDoc && latestDoc.documentationOutput && latestDoc.documentationOutput.trim() !== '') {
        setActiveOutput(latestDoc.documentationOutput);
      } else {
        setActiveOutput('');
      }

      if (data.reports.length > 0) {
        setSelectedReport(data.reports[0]);
      }
    } catch (err) {
      console.warn('Failed to load reports:', err);
    }
  };

  const handleGenerate = async () => {
    if (!hasDocuments) return;
    setIsGenerating(true);
    try {
      const latestDoc = await api.getLatestDocumentation();
      if (latestDoc && latestDoc.documentationOutput) {
        setActiveOutput(latestDoc.documentationOutput);
      }
    } catch (err) {
      console.warn('Failed to refresh documentation:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!activeOutput || !hasDocuments) return;
    downloadSinglePDF('Project_Documentation_Documenataion', activeOutput);
  };

  const handleDownloadTxt = () => {
    if (!activeOutput || !hasDocuments) return;
    const blob = new Blob([activeOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'HealthPulse_Documentation_UserStories_RiskRegister.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400 font-semibold">
              DOCUMENTATION GENERATION AGENT
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Project Documentation & Master Documentation</h2>
          <p className="text-xs text-slate-400">
            Synthesized User Stories, Risk Register, Action Items, and Executive Project Intelligence derived from ingested documents.
          </p>
        </div>

        {/* SINGLE PDF DOWNLOAD BUTTON */}
        <button
          onClick={handleDownload}
          disabled={!hasDocuments || !activeOutput}
          className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-teal-500/25 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-teal-500"
          title={!hasDocuments ? 'Upload documents to generate PDF' : 'Download PDF Document'}
        >
          <Download className="w-4 h-4" />
          <span>Download PDF Document</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* HERO: SINGLE PDF DOWNLOAD CARD                                            */}
      {/* ========================================================================= */}
      <div className="glass-panel p-6 border-teal-500/30 bg-gradient-to-r from-slate-900 via-slate-900/90 to-teal-950/30 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                hasDocuments
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {hasDocuments ? 'DOCUMENTATION AGENT' : 'AWAITING PROJECT DOCUMENTS'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {hasDocuments ? 'Ready for Download' : '0 Documents Ingested'}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Master Project Intelligence & Documentation Documentation
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {hasDocuments ? (
                <>Synthesized by the Documentation Generation Agent based on uploaded project documents. Bundles <strong>User Stories (US-01..)</strong>, <strong>Enterprise Risk Register</strong>, and <strong>Action Items</strong> into a single publication-ready PDF download.</>
              ) : (
                <>Upload your project documents (e.g. SRS, architecture specs, Jira CSV backlog, or meeting notes) in the Document Ingestion view. Once uploaded and analyzed, genuine User Stories, Risk Registers, and Action Items will appear here.</>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3.5 font-mono">
              <span className={`flex items-center gap-1.5 font-medium ${hasDocuments ? 'text-teal-400' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> 1. User Stories
              </span>
              <span className={`flex items-center gap-1.5 font-medium ${hasDocuments ? 'text-teal-400' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> 2. Risk Register
              </span>
              <span className={`flex items-center gap-1.5 font-medium ${hasDocuments ? 'text-teal-400' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> 3. Action Items
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <FileCheck className="w-3.5 h-3.5 text-teal-400" /> Multi-Page Formatted PDF
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-stretch lg:items-end gap-2 shrink-0">
            {hasDocuments ? (
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <button
                  onClick={handleDownload}
                  disabled={!activeOutput}
                  className="px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Documentation</span>
                </button>
                <button
                  onClick={handleDownloadTxt}
                  disabled={!activeOutput}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50"
                  title="Download tab-delimited text for spreadsheets"
                >
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>Download Tabular .TXT</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate && onNavigate('documents')}
                className="px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30"
              >
                <UploadCloud className="w-4 h-4 text-slate-950" />
                <span>Upload Project Documents</span>
              </button>
            )}
            <span className="text-[11px] text-slate-400 font-mono text-center lg:text-right">
              {hasDocuments ? 'Publication-ready PDF & Spreadsheet-ready TXT' : 'Ingest documents to enable downloads'}
            </span>
          </div>
        </div>
      </div>

      {/* Live Document Previewer Card */}
      <div className="glass-panel p-6 flex flex-col justify-between min-h-[560px]">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold text-white">Documentation Generation Output Preview</h3>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                hasDocuments && activeOutput
                  ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {hasDocuments && activeOutput ? 'SYNTHESIZED OUTPUT' : 'NO DOCUMENTS'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !hasDocuments}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                title={!hasDocuments ? 'Upload documents first' : 'Refresh documentation output'}
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                )}
                <span>Refresh Output</span>
              </button>

              <button
                onClick={handleDownload}
                disabled={!hasDocuments || !activeOutput}
                className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* Rendered Document Body */}
          <div className="bg-slate-950/90 rounded-xl p-4 sm:p-5 border border-slate-800 max-h-[640px] overflow-y-auto">
            <TabularDocViewer
              content={activeOutput}
              onRefresh={handleGenerate}
              isRefreshing={isGenerating}
              hasDocuments={hasDocuments}
              onGoToUpload={() => onNavigate && onNavigate('documents')}
            />
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>
            {hasDocuments
              ? 'Grounded in project artifacts & synthesized by Documentation Generation Agent'
              : 'Upload documents in the Document Ingestion view to initiate analysis'}
          </span>
          <span className="font-mono text-teal-400 font-semibold">
            {hasDocuments ? 'Single PDF Download Enabled' : 'Awaiting Documents'}
          </span>
        </div>
      </div>
    </div>
  );
};
