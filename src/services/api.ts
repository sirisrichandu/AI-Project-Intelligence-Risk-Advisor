import {
  ProjectDocument,
  ProjectScopeData,
  RiskItem,
  BlockerItem,
  ActionItem,
  TaskAtRisk,
  DocumentConflict,
  HealthBreakdown,
  ProjectSummary,
  GeneratedReport,
  ChatMessage,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(`Server error (${response.status}): ${response.statusText}`);
    }
    throw new Error('Server returned an unexpected response format. Please try again.');
  }

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return data;
}

export const api = {
  // Summary
  getSummary: (): Promise<ProjectSummary> => fetchJson('/api/project/summary'),

  // Documents
  getDocuments: (): Promise<{ documents: ProjectDocument[]; totalChunks: number }> =>
    fetchJson('/api/documents'),

  // Proxy-safe JSON upload (bypasses multipart stream issues in iframes)
  uploadDocumentsJson: async (filesPayload: Array<{
    name: string;
    type?: string;
    size?: string;
    content?: string;
    base64?: string;
  }>): Promise<{
    message: string;
    uploadedDocuments: ProjectDocument[];
    totalKnowledgeChunks: number;
  }> => {
    return fetchJson('/api/upload-json', {
      method: 'POST',
      body: JSON.stringify({ files: filesPayload }),
    });
  },

  // Multipart fallback upload
  uploadDocuments: async (formData: FormData): Promise<{
    message: string;
    uploadedDocuments: ProjectDocument[];
    totalKnowledgeChunks: number;
  }> => {
    const response = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Upload server error (${response.status}): Please retry or use another file.`);
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload document');
    }
    return data;
  },

  deleteDocument: (id: string): Promise<{ message: string }> =>
    fetchJson(`/api/documents/${id}`, { method: 'DELETE' }),

  clearAllDocuments: (): Promise<{ message: string }> =>
    fetchJson('/api/documents/clear-all', { method: 'POST' }),

  clearRisks: (): Promise<{ message: string }> =>
    fetchJson('/api/risks/clear', { method: 'POST' }),

  downloadDocumentUrl: (id: string): string => `${API_BASE}/api/documents/${id}/download`,
  downloadSampleFileUrl: (format: string): string => `${API_BASE}/api/sample-files/${format}`,
  downloadRealProjectFileUrl: (filename: string): string => `${API_BASE}/api/sample-files/download/${filename}`,

  // Multi-Agent Pipeline
  runPipeline: (): Promise<{
    message: string;
    scope: ProjectScopeData;
    risks: RiskItem[];
    blockers: BlockerItem[];
    actions: ActionItem[];
    tasksAtRisk: TaskAtRisk[];
    health: HealthBreakdown;
    documentationOutput?: string;
  }> => fetchJson('/api/pipeline/run', { method: 'POST' }),

  getLatestDocumentation: (): Promise<{ documentationOutput: string; hasDocuments?: boolean }> =>
    fetchJson('/api/documentation/latest'),

  // Scope
  getScope: (): Promise<ProjectScopeData> => fetchJson('/api/scope'),

  // Risks
  getRisks: (): Promise<{
    risks: RiskItem[];
    tasksAtRisk: TaskAtRisk[];
    riskMatrix: Array<{
      id: string;
      x: number;
      y: number;
      label: string;
      severity: RiskItem['severity'];
      category: RiskItem['category'];
      mitigation: string;
    }>;
  }> => fetchJson('/api/risks'),

  // Blockers
  getBlockers: (): Promise<{ blockers: BlockerItem[] }> => fetchJson('/api/blockers'),

  // Actions
  getActions: (): Promise<{ actions: ActionItem[]; tasksAtRisk: TaskAtRisk[] }> => fetchJson('/api/actions'),

  // Conflicts
  getConflicts: (): Promise<{ conflicts: DocumentConflict[] }> => fetchJson('/api/conflicts'),

  // Health
  getHealth: (): Promise<HealthBreakdown> => fetchJson('/api/health'),
  getHealthHistory: (): Promise<{ current: number; trend: string; history: HealthBreakdown['history'] }> =>
    fetchJson('/api/health/history'),

  // Conversational Assistant
  askAssistant: (query: string): Promise<{
    answer: string;
    agentUsed: string;
    sources: string[];
    routingReason?: string;
  }> => fetchJson('/api/ask', { method: 'POST', body: JSON.stringify({ query }) }),

  getChatHistory: (): Promise<{ messages: ChatMessage[] }> => fetchJson('/api/chat/history'),
  clearChatHistory: (): Promise<{ message: string }> => fetchJson('/api/chat/clear', { method: 'POST' }),

  // Reports
  getReports: (): Promise<{ reports: GeneratedReport[] }> => fetchJson('/api/reports'),
  generateReport: (type: string): Promise<GeneratedReport> =>
    fetchJson('/api/reports/generate', { method: 'POST', body: JSON.stringify({ type }) }),
  deleteReport: (id: string): Promise<{ message: string }> =>
    fetchJson(`/api/reports/${id}`, { method: 'DELETE' }),

  // Reset
  resetProject: (): Promise<{ message: string; health: HealthBreakdown }> =>
    fetchJson('/api/project/reset', { method: 'POST' }),
};
