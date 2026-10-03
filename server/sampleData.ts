export interface ProjectDocument {
  id: string;
  name: string;
  type: 'PDF' | 'DOCX' | 'CSV' | 'TXT' | 'XLSX';
  size: string;
  uploadDate: string;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  chunkCount: number;
  category: 'requirements' | 'architecture' | 'meetings' | 'tasks' | 'general';
  content: string;
}

export interface ProjectScopeData {
  objectives: string[];
  scope: string;
  requirements: string[];
  deliverables: string[];
  milestones: { name: string; targetDate: string; status: 'Completed' | 'In Progress' | 'Upcoming' }[];
  deadlines: { item: string; date: string; criticality: 'High' | 'Medium' | 'Low' }[];
  constraints: string[];
  summary: string;
}

export interface RiskItem {
  id: string;
  title: string;
  category: 'Technical' | 'Schedule' | 'Resource' | 'Dependency' | 'Requirement' | 'Budget' | 'Quality' | 'Deployment';
  severity: 'Critical' | 'High' | 'Moderate' | 'Low';
  probability: number; // 0 - 100
  impact: number; // 0 - 100
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
  overall: number; // 0-100
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

export const SAMPLE_DOCUMENTS: ProjectDocument[] = [
  {
    id: "doc-1",
    name: "HealthPulse_SRS_v2.docx",
    type: "DOCX",
    size: "2.4 MB",
    uploadDate: "2026-09-18",
    status: "COMPLETED",
    chunkCount: 14,
    category: "requirements",
    content: `SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
PROJECT: HealthPulse Enterprise Clinical Intelligence Platform
VERSION: 2.1 | DATE: September 2026

1. PROJECT OBJECTIVES
The primary objective of HealthPulse is to deliver an enterprise-grade clinical decision support and patient records management platform. The platform must connect disparate EHR databases, automate clinical audit logging, and provide predictive patient risk scoring with 99.9% uptime and HIPAA compliance.

2. CORE REQUIREMENTS
- Functional Req 101: Zero-trust biometric and multi-factor authentication for healthcare practitioners.
- Functional Req 102: Real-time FHIR-compliant patient telemetry ingestion with automated triage alerts.
- Functional Req 103: Automated billing insurance pre-authorization with Stripe & HealthNet payment clearinghouse.
- Functional Req 104: Comprehensive audit logging compliant with ISO 27001 and HIPAA security standards.
- Non-Functional Req 201: System query response latency under 300ms at 10,000 concurrent clinicians.
- Non-Functional Req 202: Zero data loss guarantee with automated multi-region PostgreSQL failover.

3. KEY DELIVERABLES
- Deliverable 1: Core Patient Records Microservice with PostgreSQL & Redis caching.
- Deliverable 2: Integration Gateway connecting third-party banking & insurance clearinghouse API.
- Deliverable 3: Clinical Dashboard with real-time risk indicators and triage queue.
- Deliverable 4: Auditing and compliance reporting generator for regulatory submission.

4. MILESTONES & TARGET DEADLINES
- Milestone 1: Ingestion & Schema Architecture Sign-Off — Target: October 15, 2026 [Completed]
- Milestone 2: Payment Gateway & EHR Connector Integration — Target: November 12, 2026 [In Progress]
- Milestone 3: End-to-End Penetration Testing & Compliance Audit — Target: November 30, 2026 [Upcoming]
- Milestone 4: Production Release & Hospital Pilot Deployment — Hard Deadline: December 15, 2026 [Upcoming]

5. CONSTRAINTS & DEPENDENCIES
- Hard regulatory constraint: All medical data must remain within regional data jurisdiction (US-East).
- Critical dependency: Third-party banking clearinghouse sandbox credentials must be granted prior to Milestone 2 testing.`
  },
  {
    id: "doc-2",
    name: "System_Architecture_Spec.pdf",
    type: "PDF",
    size: "4.1 MB",
    uploadDate: "2026-09-20",
    status: "COMPLETED",
    chunkCount: 18,
    category: "architecture",
    content: `SYSTEM ARCHITECTURE & INFRASTRUCTURE SPECIFICATION
PROJECT: HealthPulse Clinical Intelligence Platform
LEAD ARCHITECT: Marcus Vance | INFRASTRUCTURE TEAM

1. ARCHITECTURAL OVERVIEW
HealthPulse is architected as an event-driven microservices ecosystem running on Amazon Elastic Kubernetes Service (EKS).
- Primary Database: PostgreSQL 16 cluster with multi-AZ replication and pgvector indexing.
- Caching & Fast State: In-memory Redis 7.2 cluster with Redis Sentinel for session management.
- Message Broker: Apache Kafka cluster for streaming clinical telemetry and order events.
- Identity Provider: Auth0 enterprise tier with SAML 2.0 integration for hospital active directories.

2. CRITICAL ARCHITECTURAL BOTTLENECK & VULNERABILITIES
- Bottleneck A: The legacy database migration script has schema mismatch issues with v1 EHR records containing non-standard patient birthdate encodings. If not addressed, the historical record migration will halt.
- Bottleneck B: Payment Gateway webhook ingestion requires synchronous certificate validation which creates a 1.8s latency spike during peak hospital shift changes.
- Dependency Vulnerability: The clearinghouse API vendor has notified our team that Sandbox Environment v3 will be deprecated on November 1st, requiring migration to v4 before deployment.

3. RESOURCE ALLOCATION & INFRASTRUCTURE COSTS
Monthly AWS infrastructure budget is capped at $18,500. Current burn rate is running at $14,200.
High risk of compute overage if Kafka telemetry replication throughput exceeds 500 MB/s during load testing.`
  },
  {
    id: "doc-3",
    name: "Sprint_04_Meeting_Notes.txt",
    type: "TXT",
    size: "142 KB",
    uploadDate: "2026-09-28",
    status: "COMPLETED",
    chunkCount: 8,
    category: "meetings",
    content: `SPRINT 04 TEAM RETROSPECTIVE & PLANNING MEETING MINUTES
DATE: September 28, 2026 | ATTENDEES: Dev Team, Scrum Master, Product Owner (Rachel Lee)

1. ACTIVE BLOCKERS & IMMEDIATE UNRESOLVED ISSUES:
- Blocker 1: Third-party payment clearinghouse sandbox credentials are STILL delayed by the vendor by 12 days. Backend team cannot verify transaction error handling.
- Blocker 2: Sarah Jenkins (Lead Database Architect) has notified the team of an emergency medical leave scheduled for the first two weeks of October. No backup engineer is currently trained on the custom database migration scripts.
- Blocker 3: Legacy patient records migration script fails on legacy row IDs 400,000 to 520,000 due to malformed timestamps.

2. SCOPE DISPUTES & CLIENT REQUESTS:
- Client representative asked for automated interactive PDF/DOCX clinical report generation during Sprint 04 demo.
- Rachel Lee noted that Report Generation was originally deferred to Phase 2, but client is conditioning hospital sign-off on having this feature in the December release. This represents scope creep of approximately 80 engineering hours.

3. PENDING ACTION ITEMS ASSIGNED:
- Action 1: Daniel Cruz to escalate clearinghouse sandbox API credentials with vendor management by Oct 3.
- Action 2: Sarah Jenkins to record knowledge transfer walkthrough on DB migration scripts before leave begins on Oct 2.
- Action 3: Priya Patel to benchmark Redis cache invalidation under synthetic 10k user load by Oct 8.
- Action 4: Liam O'Connor to draft technical specification for emergency PDF Report Generation module by Oct 6.`
  },
  {
    id: "doc-4",
    name: "Task_Tracker_Sprint_Backlog.csv",
    type: "CSV",
    size: "86 KB",
    uploadDate: "2026-09-29",
    status: "COMPLETED",
    chunkCount: 10,
    category: "tasks",
    content: `Task_ID,Task_Name,Owner,Priority,Due_Date,Status,Milestone,Estimated_Hours,Actual_Hours
HP-101,PostgreSQL Schema Migration Script,Sarah Jenkins,Critical,2026-10-02,In Progress,Milestone 1,30,28
HP-102,Payment Gateway Webhook Validation,Daniel Cruz,Critical,2026-10-08,Pending,Milestone 2,45,12
HP-103,Redis Session Failover Benchmark,Priya Patel,High,2026-10-08,In Progress,Milestone 2,24,18
HP-104,Auth0 SAML 2.0 Integration Test,Liam O'Connor,High,2026-10-10,Completed,Milestone 1,40,40
HP-105,Clearinghouse API Credential Escalation,Daniel Cruz,Critical,2026-10-03,Pending,Milestone 2,10,2
HP-106,Patient EHR Search Endpoint Optimization,Priya Patel,Medium,2026-10-15,Pending,Milestone 2,20,0
HP-107,Audit Trail Cryptographic Signing,Liam O'Connor,High,2026-10-22,Pending,Milestone 3,35,0
HP-108,Clinical Report Generation PDF Module,Liam O'Connor,High,2026-10-25,Pending,Milestone 2,50,0
HP-109,HIPAA Security Rule Penetration Audit,External Auditor,Critical,2026-11-20,Pending,Milestone 3,60,0
HP-110,Disaster Recovery Backup Drill,Sarah Jenkins,Medium,2026-10-28,Overdue,Milestone 2,20,24
HP-111,Frontend Triage Queue Component,Marcus Vance,Medium,2026-10-18,In Progress,Milestone 2,30,15
HP-112,End-to-End Synthetic Load Testing,Priya Patel,High,2026-11-10,Pending,Milestone 3,40,0`
  }
];

export const INITIAL_SCOPE: ProjectScopeData = {
  objectives: [
    "Deliver enterprise-grade clinical decision support and patient records management platform",
    "Achieve 99.9% uptime SLA with automated multi-region PostgreSQL failover",
    "Attain full regulatory HIPAA and ISO 27001 data governance compliance",
    "Ingest real-time FHIR telemetry with sub-300ms query latency under 10k concurrent clinicians",
    "Automate clinical billing insurance pre-authorization with Stripe & HealthNet clearinghouse"
  ],
  scope: "The project encompasses backend microservices on AWS EKS, PostgreSQL multi-AZ database, Redis session caching, Kafka event streaming, Auth0 SAML authentication, healthcare provider triage UI, and regulatory audit report generation.",
  requirements: [
    "FR-101: Zero-trust biometric and multi-factor authentication for healthcare practitioners",
    "FR-102: Real-time FHIR-compliant patient telemetry ingestion with automated triage alerts",
    "FR-103: Automated billing insurance pre-authorization with Stripe & HealthNet clearinghouse",
    "FR-104: Comprehensive audit logging compliant with ISO 27001 and HIPAA security standards",
    "NFR-201: Sub-300ms query response latency at 10,000 concurrent active hospital clinicians",
    "NFR-202: Zero data loss guarantee with automated multi-region PostgreSQL failover"
  ],
  deliverables: [
    "Core Patient Records Microservice with PostgreSQL & Redis caching layer",
    "Integration Gateway connecting third-party banking & insurance clearinghouse API",
    "Clinical Dashboard with real-time patient risk indicators and triage queue",
    "Automated Auditing and Compliance Report Generation module for hospital accreditation"
  ],
  milestones: [
    { name: "Milestone 1: Ingestion & Schema Architecture Sign-Off", targetDate: "2026-10-15", status: "Completed" },
    { name: "Milestone 2: Payment Gateway & EHR Connector Integration", targetDate: "2026-11-12", status: "In Progress" },
    { name: "Milestone 3: End-to-End Penetration Testing & Compliance Audit", targetDate: "2026-11-30", status: "Upcoming" },
    { name: "Milestone 4: Production Release & Hospital Pilot Deployment", targetDate: "2026-12-15", status: "Upcoming" }
  ],
  deadlines: [
    { item: "Payment Clearinghouse Sandbox Setup", date: "2026-10-03", criticality: "High" },
    { item: "PostgreSQL Legacy Data Migration Completion", date: "2026-10-15", criticality: "High" },
    { item: "EHR Connector Integration Freeze", date: "2026-11-12", criticality: "Medium" },
    { item: "Final Hospital Production Go-Live", date: "2026-12-15", criticality: "High" }
  ],
  constraints: [
    "Hard regulatory constraint: All medical data must remain within US-East regional data jurisdiction",
    "AWS monthly cloud infrastructure budget capped strictly at $18,500",
    "Zero-downtime database schema migration required for existing legacy hospital records"
  ],
  summary: "HealthPulse is an enterprise clinical SaaS platform on track for December 15, 2026 release, currently in Sprint 4. The project is facing moderate schedule pressure due to external payment clearinghouse credential delays and key personnel leave on the database migration track."
};

export const INITIAL_RISKS: RiskItem[] = [
  {
    id: "RSK-01",
    title: "Third-Party Clearinghouse API Credential Delay",
    category: "Dependency",
    severity: "Critical",
    probability: 88,
    impact: 92,
    description: "Clearinghouse sandbox environment credentials are delayed by 12 days, preventing verification of insurance pre-authorization and payment flows.",
    evidence: "Sprint 04 Meeting Notes: 'Clearinghouse sandbox credentials are STILL delayed by the vendor by 12 days. Backend team cannot verify transaction error handling.'",
    mitigation: "Escalate to executive vendor liaison; implement mock clearinghouse simulator to allow local end-to-end integration testing in parallel.",
    status: "Open"
  },
  {
    id: "RSK-02",
    title: "Key Personnel Single-Point-of-Failure on DB Migration",
    category: "Resource",
    severity: "High",
    probability: 75,
    impact: 85,
    description: "Lead Database Architect Sarah Jenkins taking emergency medical leave during critical migration phase with no trained secondary engineer.",
    evidence: "Sprint 04 Meeting Notes: 'Sarah Jenkins taking emergency medical leave scheduled for first two weeks of October. No backup engineer is currently trained.'",
    mitigation: "Mandate recorded walkthrough documentation session prior to leave; pair Senior Dev Liam O'Connor on schema scripts immediately.",
    status: "Mitigating"
  },
  {
    id: "RSK-03",
    title: "Legacy Patient Timestamp Schema Incompatibility",
    category: "Technical",
    severity: "High",
    probability: 80,
    impact: 78,
    description: "Data migration script crashes on legacy EHR rows 400,000 - 520,000 due to non-standard timestamp encodings, threatening data integrity.",
    evidence: "Architecture Design Spec & Sprint Notes: 'Migration script fails on legacy row IDs 400k-520k due to malformed timestamps.'",
    mitigation: "Deploy regex sanitization pre-processing pipeline to normalize vintage timestamps before inserting into PostgreSQL 16.",
    status: "Open"
  },
  {
    id: "RSK-04",
    title: "Scope Creep: Unscheduled Clinical PDF Report Generator",
    category: "Requirement",
    severity: "Moderate",
    probability: 65,
    impact: 60,
    description: "Client demanding automated PDF/DOCX clinical report generation for December pilot despite being scheduled for Phase 2, adding ~80 dev hours.",
    evidence: "Sprint 04 Meeting Notes: 'Client conditioning hospital sign-off on having PDF report generation in December release. Represents ~80 engineering hours.'",
    mitigation: "Implement standardized report template using client-side generator; negotiate de-scoping non-critical analytics charts for V1.",
    status: "Open"
  },
  {
    id: "RSK-05",
    title: "Clearinghouse Sandbox v3 Deprecation Deadline",
    category: "Schedule",
    severity: "Moderate",
    probability: 55,
    impact: 70,
    description: "Vendor deprecating sandbox v3 on November 1st, forcing team to adopt v4 schema concurrently with penetration testing.",
    evidence: "System Architecture Spec: 'Vendor has notified our team that Sandbox Environment v3 will be deprecated on November 1st, requiring migration to v4.'",
    mitigation: "Direct integration branch straight to v4 specification to eliminate duplicate refactoring effort.",
    status: "Mitigating"
  },
  {
    id: "RSK-06",
    title: "Infrastructure Telemetry Budget Overage Risk",
    category: "Budget",
    severity: "Low",
    probability: 40,
    impact: 45,
    description: "Kafka multi-AZ replication may breach the $18,500/month infrastructure cap if clinical telemetry throughput exceeds 500 MB/s.",
    evidence: "System Architecture Spec: 'AWS budget capped at $18,500. High risk of compute overage if Kafka throughput exceeds 500 MB/s during load testing.'",
    mitigation: "Enable snappy compression on Kafka topics and configure AWS CloudWatch cost budget auto-throttling alarms.",
    status: "Resolved"
  },
  {
    id: "RSK-07",
    title: "Payment Webhook Latency Spikes during Hospital Shift Change",
    category: "Quality",
    severity: "Moderate",
    probability: 50,
    impact: 65,
    description: "Synchronous certificate validation creates a 1.8s latency spike during peak 7:00 AM shift turnover, threatening the 300ms SLA.",
    evidence: "System Architecture Spec: 'Synchronous certificate validation creates a 1.8s latency spike during peak shift changes.'",
    mitigation: "Convert certificate verification to asynchronous worker queue with Redis-based cached trust chains.",
    status: "Open"
  }
];

export const INITIAL_BLOCKERS: BlockerItem[] = [
  {
    id: "BLK-01",
    title: "Delayed Payment Gateway Sandbox Credentials",
    description: "Vendor has exceeded SLA by 12 days. Integration engineer cannot test webhook handlers, dispute callbacks, or pre-authorization responses.",
    impact: "Halts Milestone 2 payment verification and delays end-to-end integration test runs.",
    priority: "Critical",
    status: "Active",
    suggestedResolution: "Issue urgent escalation ticket with vendor VP of Partnerships; deploy local mock gateway stub in meantime."
  },
  {
    id: "BLK-02",
    title: "Legacy EHR Data Migration Script Failure",
    description: "Database migration script crashes on 120,000 legacy records due to malformed date formatting in the vintage MS SQL export.",
    impact: "Blocks Milestone 1 completion and historical patient analytics ingestion.",
    priority: "High",
    status: "Active",
    suggestedResolution: "Implement automated Python/Regex data cleaning step prior to running the PostgreSQL bulk COPY command."
  },
  {
    id: "BLK-03",
    title: "Database Architect Leave Without Backup Coverage",
    description: "Lead DB architect departs on leave in 4 days with exclusive knowledge of the proprietary partitioning and schema migration logic.",
    impact: "Zero progress possible on database emergency fixes for 14 days if an incident occurs.",
    priority: "High",
    status: "Active",
    suggestedResolution: "Host mandatory 3-hour recorded handover session with Liam O'Connor and document rollback playbook in internal wiki."
  }
];

export const INITIAL_ACTIONS: ActionItem[] = [
  {
    id: "ACT-01",
    task: "Escalate clearinghouse sandbox credentials with vendor partnership VP",
    owner: "Daniel Cruz",
    priority: "Critical",
    deadline: "2026-10-03",
    status: "Pending"
  },
  {
    id: "ACT-02",
    task: "Record comprehensive knowledge transfer on DB migration scripts before leave",
    owner: "Sarah Jenkins",
    priority: "Critical",
    deadline: "2026-10-02",
    status: "In Progress"
  },
  {
    id: "ACT-03",
    task: "Benchmark Redis session failover under synthetic 10,000 user concurrent load",
    owner: "Priya Patel",
    priority: "High",
    deadline: "2026-10-08",
    status: "In Progress"
  },
  {
    id: "ACT-04",
    task: "Draft technical spec and component layout for Clinical PDF Report Generator",
    owner: "Liam O'Connor",
    priority: "High",
    deadline: "2026-10-06",
    status: "Pending"
  },
  {
    id: "ACT-05",
    task: "Execute Disaster Recovery automated database backup and restore drill",
    owner: "Sarah Jenkins",
    priority: "Medium",
    deadline: "2026-10-01",
    status: "Overdue"
  },
  {
    id: "ACT-06",
    task: "Complete Auth0 enterprise SAML 2.0 configuration and unit test suite",
    owner: "Liam O'Connor",
    priority: "High",
    deadline: "2026-09-28",
    status: "Completed"
  },
  {
    id: "ACT-07",
    task: "Optimize patient EHR search endpoint to guarantee sub-300ms SLA",
    owner: "Priya Patel",
    priority: "Medium",
    deadline: "2026-10-15",
    status: "Pending"
  }
];

export const INITIAL_TASKS_AT_RISK: TaskAtRisk[] = [
  {
    id: "HP-102",
    name: "Payment Gateway Webhook Validation",
    owner: "Daniel Cruz",
    dueDate: "2026-10-08",
    severity: "Critical",
    riskReason: "Vendor sandbox credentials delayed by 12 days; zero test runs executed to date.",
    milestone: "Milestone 2: Payment Integration"
  },
  {
    id: "HP-101",
    name: "PostgreSQL Schema Migration Script",
    owner: "Sarah Jenkins",
    dueDate: "2026-10-02",
    severity: "Critical",
    riskReason: "Sarah taking leave on Oct 2; script currently crashing on 120,000 legacy records.",
    milestone: "Milestone 1: Schema Architecture"
  },
  {
    id: "HP-108",
    name: "Clinical Report Generation PDF Module",
    owner: "Liam O'Connor",
    dueDate: "2026-10-25",
    severity: "High",
    riskReason: "Unscheduled 80-hour scope addition requested by client during Sprint 4 demo.",
    milestone: "Milestone 2: Hospital Pilot"
  },
  {
    id: "HP-110",
    name: "Disaster Recovery Backup Drill",
    owner: "Sarah Jenkins",
    dueDate: "2026-10-01",
    severity: "Moderate",
    riskReason: "Currently 2 days overdue with primary owner departing on scheduled leave.",
    milestone: "Milestone 2: Infrastructure"
  }
];

export const INITIAL_CONFLICTS: DocumentConflict[] = [
  {
    id: "CNF-01",
    docA: "HealthPulse_SRS_v2.docx",
    docB: "Sprint_04_Meeting_Notes.txt",
    statementA: "SRS Section 3 lists 4 core deliverables with Report Generation deferred to Phase 2.",
    statementB: "Meeting notes state client is conditioning hospital sign-off on having PDF/DOCX report generator in the December release.",
    conflictType: "Scope Creep",
    severity: "High",
    recommendation: "Issue formal change order approval or negotiate reduced report template scope for Phase 1."
  },
  {
    id: "CNF-02",
    docA: "System_Architecture_Spec.pdf",
    docB: "Task_Tracker_Sprint_Backlog.csv",
    statementA: "Architecture spec requires Clearinghouse Sandbox v4 migration before November 1st deprecation.",
    statementB: "Task tracker HP-102 is currently coded against deprecated v3 sandbox specification.",
    conflictType: "Schedule Mismatch",
    severity: "Critical",
    recommendation: "Repoint task HP-102 branch directly to v4 API specification to avoid double rework."
  }
];

export const INITIAL_HEALTH: HealthBreakdown = {
  overall: 82,
  status: "Healthy",
  metrics: {
    riskScore: 76,
    scheduleScore: 90,
    scopeScore: 85,
    blockerScore: 72,
    resourceScore: 80
  },
  summary: "HealthPulse platform demonstrates strong foundational health (82/100). Primary risks are concentrated in external dependency credentials and key personnel leave on the database migration track.",
  trend: "Stable",
  history: [
    { date: "2026-09-08", score: 88, note: "Initial architecture kickoff completed" },
    { date: "2026-09-15", score: 85, note: "Sprint 2 backend services deployed" },
    { date: "2026-09-22", score: 80, note: "Clearinghouse credential delay flagged" },
    { date: "2026-09-29", score: 82, note: "Mock clearinghouse stub and Redis benchmark initiated" },
    { date: "2026-10-01", score: 82, note: "Current assessment: Milestone 1 largely intact" }
  ]
};
