export interface ProjectDocument {
  id: string;
  name: string;
  type: 'PDF' | 'DOCX' | 'CSV' | 'TXT' | 'XLSX';
  size: string;
  uploadDate: string;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  chunkCount: number;
  category: 'requirements' | 'architecture' | 'meetings' | 'tasks' | 'general';
}

export interface MilestoneItem {
  name: string;
  targetDate: string;
  status: 'Completed' | 'In Progress' | 'Upcoming';
}

export interface DeadlineItem {
  item: string;
  date: string;
  criticality: 'High' | 'Medium' | 'Low';
}

export interface ProjectScopeData {
  objectives: string[];
  scope: string;
  requirements: string[];
  deliverables: string[];
  milestones: MilestoneItem[];
  deadlines: DeadlineItem[];
  constraints: string[];
  summary: string;
}

export interface RiskItem {
  id: string;
  title: string;
  category: 'Technical' | 'Schedule' | 'Resource' | 'Dependency' | 'Requirement' | 'Budget' | 'Quality' | 'Deployment';
  severity: 'Critical' | 'High' | 'Moderate' | 'Low';
  probability: number;
  impact: number;
  description: string;
  evidence: string;
  mitigation: string;
  status: 'Open' | 'Mitigating' | 'Resolved';
}

export interface BlockerItem {
  id: string;
  title: string;
  description: string;
  impact: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Active' | 'Investigating' | 'Resolved';
  suggestedResolution: string;
}

export interface ActionItem {
  id: string;
  task: string;
  owner: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  deadline: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
}

export interface TaskAtRisk {
  id: string;
  name: string;
  owner: string;
  dueDate: string;
  severity: 'Critical' | 'High' | 'Moderate' | 'Low';
  riskReason: string;
  milestone: string;
}

export interface DocumentConflict {
  id: string;
  docA: string;
  docB: string;
  statementA: string;
  statementB: string;
  conflictType: 'Schedule Mismatch' | 'Status Contradiction' | 'Scope Creep';
  severity: 'Critical' | 'High' | 'Moderate';
  recommendation: string;
}

export interface HealthBreakdown {
  overall: number;
  status: 'Healthy' | 'At Risk' | 'Critical' | 'Severe' | 'Awaiting Documents';
  metrics: {
    riskScore: number;
    scheduleScore: number;
    scopeScore: number;
    blockerScore: number;
    resourceScore: number;
  };
  summary: string;
  trend: 'Improving' | 'Stable' | 'Declining';
  history: { date: string; score: number; note: string }[];
}

export interface ProjectSummary {
  projectName: string;
  projectDeadline: string;
  healthScore: number;
  healthStatus: string;
  totalDocuments: number;
  totalRisks: number;
  criticalRisks: number;
  highRisks: number;
  activeBlockers: number;
  pendingActions: number;
  upcomingDeadlines: number;
  tasksAtRiskCount: number;
}

export interface GeneratedReport {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  format: string;
  content: string;
  metadata: {
    healthScore: number;
    riskCount: number;
    blockerCount: number;
    documentsAnalyzed: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agentUsed?: string;
  sources?: string[];
}
