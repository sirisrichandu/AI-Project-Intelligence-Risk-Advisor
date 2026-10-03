import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ChatDrawer } from './components/chat/ChatDrawer';
import { Dashboard } from './pages/Dashboard';
import { Documents } from './pages/Documents';
import { ProjectIntelligence } from './pages/ProjectIntelligence';
import { RisksPage } from './pages/RisksPage';
import { BlockersPage } from './pages/BlockersPage';
import { HealthScorePage } from './pages/HealthScorePage';
import { AssistantPage } from './pages/AssistantPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ArchitectureMilestones } from './pages/ArchitectureMilestones';
import { api } from './services/api';
import {
  ProjectSummary,
  HealthBreakdown,
  ProjectScopeData,
  RiskItem,
  BlockerItem,
  ActionItem,
  TaskAtRisk,
  DocumentConflict,
  ProjectDocument,
} from './types';
import { downloadSinglePDF } from './utils/pdfDownloader';
import { DocGenModal } from './components/shared/DocGenModal';
import { Loader2, Download, X, FileText, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(undefined);

  // Documentation Generation Agent Output Modal
  const [docGenModalOpen, setDocGenModalOpen] = useState(false);
  const [latestDocumentationOutput, setLatestDocumentationOutput] = useState<string>('');

  // Core Data States
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [health, setHealth] = useState<HealthBreakdown | null>(null);
  const [scope, setScope] = useState<ProjectScopeData | null>(null);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [blockers, setBlockers] = useState<BlockerItem[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [tasksAtRisk, setTasksAtRisk] = useState<TaskAtRisk[]>([]);
  const [conflicts, setConflicts] = useState<DocumentConflict[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);

  // Pipeline animation
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(5);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const results = await Promise.allSettled([
        api.getSummary(),
        api.getHealth(),
        api.getScope(),
        api.getRisks(),
        api.getBlockers(),
        api.getActions(),
        api.getConflicts(),
        api.getDocuments(),
        api.getLatestDocumentation(),
      ]);

      if (results[0].status === 'fulfilled') setSummary(results[0].value);
      if (results[1].status === 'fulfilled') setHealth(results[1].value);
      if (results[2].status === 'fulfilled') setScope(results[2].value);
      if (results[3].status === 'fulfilled') {
        setRisks(results[3].value.risks || []);
        setTasksAtRisk(results[3].value.tasksAtRisk || []);
      }
      if (results[4].status === 'fulfilled') setBlockers(results[4].value.blockers || []);
      if (results[5].status === 'fulfilled') setActions(results[5].value.actions || []);
      if (results[6].status === 'fulfilled') setConflicts(results[6].value.conflicts || []);
      const loadedDocs = results[7].status === 'fulfilled' ? (results[7].value.documents || []) : [];
      if (results[7].status === 'fulfilled') {
        setDocuments(loadedDocs);
        setTotalChunks(results[7].value.totalChunks || 0);
      }
      if (results[8].status === 'fulfilled') {
        if (loadedDocs.length === 0 || !results[8].value?.hasDocuments) {
          setLatestDocumentationOutput('');
        } else if (results[8].value?.documentationOutput) {
          setLatestDocumentationOutput(results[8].value.documentationOutput);
        } else {
          setLatestDocumentationOutput('');
        }
      }
    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      setIsLoadingInitial(false);
    }
  };

  const handleRunPipeline = async () => {
    if (isRunningPipeline) return;
    setIsRunningPipeline(true);
    setPipelineStep(0);

    // Multi-agent step animation sequence
    const stepInterval = setInterval(() => {
      setPipelineStep((prev) => {
        if (prev < 4) return prev + 1;
        return prev;
      });
    }, 700);

    try {
      const res = await api.runPipeline();
      clearInterval(stepInterval);
      setPipelineStep(5);
      setScope(res.scope);
      setRisks(res.risks);
      setBlockers(res.blockers);
      setActions(res.actions);
      setTasksAtRisk(res.tasksAtRisk);
      setHealth(res.health);
      if (res.documentationOutput) {
        setLatestDocumentationOutput(res.documentationOutput);
        setDocGenModalOpen(true);
      }
      // Refresh summary
      const sumRes = await api.getSummary();
      setSummary(sumRes);
    } catch (err) {
      console.error('Pipeline execution error:', err);
      clearInterval(stepInterval);
    } finally {
      setTimeout(() => setIsRunningPipeline(false), 800);
    }
  };

  const handleOpenAssistant = (query?: string) => {
    if (activePage === 'assistant') {
      // already on assistant page
      return;
    }
    setChatInitialQuery(query);
    setChatDrawerOpen(true);
  };

  const handleResetBenchmark = async () => {
    await api.resetProject();
    await loadAllData();
  };

  if (isLoadingInitial) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-3" />
        <span className="text-xs font-mono tracking-wider uppercase text-slate-300">
          Initializing Project Intelligence & RAG Core...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0">
        {/* Top Navbar */}
        <Navbar
          summary={summary}
          onOpenAssistant={() => handleOpenAssistant()}
          onRunPipeline={handleRunPipeline}
          isRunningPipeline={isRunningPipeline}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activePage={activePage}
          onNavigate={(page) => setActivePage(page)}
        />

        {/* Main Viewport Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {activePage === 'dashboard' && (
            <Dashboard
              summary={summary}
              health={health}
              risks={risks}
              tasksAtRisk={tasksAtRisk}
              conflicts={conflicts}
              isRunningPipeline={isRunningPipeline}
              pipelineStep={pipelineStep}
              onRunPipeline={handleRunPipeline}
              onOpenAssistant={handleOpenAssistant}
              onNavigate={(page) => setActivePage(page)}
            />
          )}

          {activePage === 'documents' && (
            <Documents
              documents={documents}
              totalChunks={totalChunks}
              onRefresh={loadAllData}
              onRunPipeline={handleRunPipeline}
            />
          )}

          {activePage === 'intelligence' && scope && (
            <ProjectIntelligence scope={scope} />
          )}

          {activePage === 'risks' && (
            <RisksPage
              risks={risks}
              onOpenAssistant={handleOpenAssistant}
              onRefresh={loadAllData}
            />
          )}

          {(activePage === 'blockers' || activePage === 'actions' || activePage === 'blockers-actions') && (
            <BlockersPage
              blockers={blockers}
              actions={actions}
              tasksAtRisk={tasksAtRisk}
              initialTab={activePage === 'actions' ? 'actions' : activePage === 'blockers' ? 'blockers' : 'all'}
              onOpenAssistant={handleOpenAssistant}
            />
          )}

          {activePage === 'health' && health && (
            <HealthScorePage
              health={health}
              onOpenAssistant={handleOpenAssistant}
            />
          )}

          {activePage === 'assistant' && (
            <AssistantPage />
          )}

          {activePage === 'reports' && (
            <ReportsPage
              documentationOutput={latestDocumentationOutput}
              hasDocuments={documents.length > 0}
              onNavigate={(page) => setActivePage(page)}
            />
          )}

          {activePage === 'roadmap' && (
            <ArchitectureMilestones
              onNavigate={(page) => setActivePage(page)}
              onOpenAssistant={handleOpenAssistant}
              onRunPipeline={handleRunPipeline}
              documentationOutput={latestDocumentationOutput}
            />
          )}

          {activePage === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>

      {/* Multi-Agent Documentation Generation Agent Output Modal */}
      <DocGenModal
        isOpen={docGenModalOpen}
        onClose={() => setDocGenModalOpen(false)}
        output={latestDocumentationOutput}
        onNavigateToReports={() => {
          setActivePage('reports');
        }}
      />

      {/* Slide-out Conversational AI Assistant Drawer */}
      <ChatDrawer
        isOpen={chatDrawerOpen}
        onClose={() => {
          setChatDrawerOpen(false);
          setChatInitialQuery(undefined);
        }}
        initialQuery={chatInitialQuery}
      />
    </div>
  );
}
