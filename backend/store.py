import threading
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.models import (
    ProjectDocument,
    ProjectScope,
    RiskItem,
    TaskAtRisk,
    BlockerItem,
    ActionItem,
    HealthBreakdown,
    HealthScoreMetrics,
    HealthHistoryPoint,
    GeneratedReport,
    ChatMessageItem,
)

DEFAULT_TABULAR_DOCUMENTATION = ""

class ProjectStore:
    def __init__(self):
        self._lock = threading.Lock()
        self.documents: List[ProjectDocument] = []
        self.scope: ProjectScope = ProjectScope()
        self.risks: List[RiskItem] = []
        self.tasks_at_risk: List[TaskAtRisk] = []
        self.blockers: List[BlockerItem] = []
        self.actions: List[ActionItem] = []
        self.health: HealthBreakdown = HealthBreakdown()
        self.reports: List[GeneratedReport] = []
        self.chat_history: List[ChatMessageItem] = []
        self.latest_doc_generation_output: str = ""

    def clear_all(self):
        with self._lock:
            self.documents = []
            self.scope = ProjectScope(
                summary="Knowledge base is currently empty. Upload your project documents to extract real project intelligence."
            )
            self.risks = []
            self.tasks_at_risk = []
            self.blockers = []
            self.actions = []
            self.health = HealthBreakdown(
                overall=0,
                status="Awaiting Documents",
                metrics=HealthScoreMetrics(),
                summary="Upload your real project documents (PDF, DOCX, XLSX, CSV, TXT) and run the pipeline to calculate the health score.",
                trend="Stable",
                history=[],
            )
            self.reports = []
            self.latest_doc_generation_output = ""

    def add_documents(self, new_docs: List[ProjectDocument]):
        with self._lock:
            self.documents.extend(new_docs)

    def delete_document(self, doc_id: str) -> bool:
        with self._lock:
            init_len = len(self.documents)
            self.documents = [d for d in self.documents if d.id != doc_id]
            return len(self.documents) < init_len

    def get_combined_content(self) -> str:
        with self._lock:
            if not self.documents:
                return ""
            return "\n\n".join(
                [f"=== DOCUMENT: {d.name} ({d.category}) ===\n{d.content}" for d in self.documents]
            )

project_store = ProjectStore()
