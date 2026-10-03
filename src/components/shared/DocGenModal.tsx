import React, { useState } from 'react';
import { Download, Copy, Check, X, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import { downloadSinglePDF } from '../../utils/pdfDownloader';
import { TabularDocViewer } from './TabularDocViewer';

interface DocGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  output: string;
  onNavigateToReports?: () => void;
}

export const DocGenModal: React.FC<DocGenModalProps> = ({
  isOpen,
  onClose,
  output,
  onNavigateToReports,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    downloadSinglePDF('Documentation_Generation_UserStories_Risk_Register', output);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] glass-panel border border-teal-500/40 bg-slate-900/95 shadow-2xl flex flex-col rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> MULTI-AGENT PIPELINE COMPLETE
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Document Generation Agent
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              📋 Documentation Generation Agent Output
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              User stories, formal risk register, and action items synthesized in structured tabular format.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-teal-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Output Ready for Download & Integration
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Single PDF Download Enabled
            </span>
          </div>

          {/* Formatted Tabular Doc Viewer */}
          <div className="max-h-[55vh] overflow-y-auto pr-1">
            <TabularDocViewer content={output} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-teal-400">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Content</span>
                </>
              )}
            </button>

            {onNavigateToReports && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToReports();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-800"
              >
                <span>Open in Reports & Documentaion</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
