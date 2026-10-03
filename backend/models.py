from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class ProjectDocument(BaseModel):
    id: str
    name: str
    type: str  # PDF, DOCX, XLSX, CSV, TXT, MD
    size: str
    uploadDate: str
    status: str = "COMPLETED"
    chunkCount: int = 1
    category: str = "general"
    content: str

class UploadJsonFileItem(BaseModel):
    name: str
    content: str
    category: Optional[str] = None

class UploadJsonRequest(BaseModel):
    files: List[UploadJsonFileItem]

class ProjectScope(BaseModel):
    objectives: List[str] = Field(default_factory=list)
    scope: str = ""
    requirements: List[str] = Field(default_factory=list)
    deliverables: List[str] = Field(default_factory=list)
    milestones: List[str] = Field(default_factory=list)
    deadlines: List[str] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)
    summary: str = ""

class RiskItem(BaseModel):
    id: str
    title: str
    category: str  # Technical, Schedule, Resource, Dependency, Budget, Quality, Deployment
    severity: str  # Critical, High, Moderate, Low
    probability: int  # 0 - 100
    impact: int  # 0 - 100
    description: str
    evidence: str
    mitigation: str
    status: str = "Open"

class TaskAtRisk(BaseModel):
    id: str
    name: str
    owner: str
    dueDate: str
    severity: str
    riskReason: str
    milestone: str

class BlockerItem(BaseModel):
    id: str
    title: str
    description: str
    impact: str
    priority: str  # Critical, High, Medium, Low
    status: str = "Active"
    suggestedResolution: str

class ActionItem(BaseModel):
    id: str
    task: str
    owner: str
    priority: str  # Critical, High, Medium, Low
    deadline: str
    status: str = "Pending"  # Pending, In Progress, Completed, Overdue

class HealthScoreMetrics(BaseModel):
    riskScore: int = 0
    scheduleScore: int = 0
    scopeScore: int = 0
    blockerScore: int = 0
    resourceScore: int = 0

class HealthHistoryPoint(BaseModel):
    date: str
    score: int
    note: str

class HealthBreakdown(BaseModel):
    overall: int = 0
    status: str = "Awaiting Documents"  # Healthy, At Risk, Critical, Awaiting Documents
    metrics: HealthScoreMetrics = Field(default_factory=HealthScoreMetrics)
    summary: str = ""
    trend: str = "Stable"
    history: List[HealthHistoryPoint] = Field(default_factory=list)

class GeneratedReport(BaseModel):
    id: str
    type: str
    title: str
    createdAt: str
    format: str = "PDF"
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ChatMessageItem(BaseModel):
    id: str
    sender: str  # user or assistant
    text: str
    timestamp: str
    agentUsed: Optional[str] = None
    sources: Optional[List[str]] = None

class AskRequest(BaseModel):
    question: str
    history: Optional[List[ChatMessageItem]] = None

class AskResponse(BaseModel):
    answer: str
    agentUsed: str
    sources: List[str]
    suggestedFollowUps: List[str]
