from fastapi import APIRouter
from datetime import datetime
import time
from backend.store import project_store
from backend.agents.langgraph_workflow import run_langgraph_pipeline
from backend.models import GeneratedReport

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

@router.post("/run")
async def run_pipeline():
    if not project_store.documents:
        project_store.clear_all()
        return {
            "message": "No documents in knowledge base. Upload your project documents to extract real risks.",
            "pipelineEngine": "LangGraph StateGraph",
            "scope": project_store.scope.model_dump(),
            "risks": [],
            "blockers": [],
            "actions": [],
            "tasksAtRisk": [],
            "health": project_store.health.model_dump(),
            "documentationOutput": "",
            "masterReport": None,
        }

    combined_content = project_store.get_combined_content()
    docs_payload = [d.model_dump() for d in project_store.documents]

    # Execute LangGraph StateGraph Workflow
    graph_state = run_langgraph_pipeline(combined_content, docs_payload)

    project_store.scope = graph_state["scope"]
    project_store.risks = graph_state["risks"]
    project_store.blockers = graph_state["blockers"]
    project_store.actions = graph_state["actions"]
    project_store.tasks_at_risk = graph_state["tasks_at_risk"]
    project_store.health = graph_state["health"]
    project_store.latest_doc_generation_output = graph_state["documentation_output"]

    dossier_content = graph_state.get("dossier_markdown", "")

    master_report = GeneratedReport(
        id=f"rep-master-{int(time.time() * 1000)}",
        type="complete_intelligence",
        title="Project Intelligence & Risk Master Dossier (LangGraph)",
        createdAt=datetime.now().isoformat(),
        format="PDF",
        content=f"{project_store.latest_doc_generation_output}\n\n{dossier_content}",
        metadata={
            "healthScore": project_store.health.overall,
            "riskCount": len(project_store.risks),
            "blockerCount": len(project_store.blockers),
            "documentsAnalyzed": len(project_store.documents),
            "pipelineEngine": "LangGraph StateGraph",
        },
    )
    project_store.reports.insert(0, master_report)

    return {
        "message": "LangGraph StateGraph multi-agent pipeline completed successfully.",
        "pipelineEngine": "LangGraph StateGraph",
        "executionTrace": graph_state.get("execution_trace", []),
        "scope": project_store.scope.model_dump(),
        "risks": [r.model_dump() for r in project_store.risks],
        "blockers": [b.model_dump() for b in project_store.blockers],
        "actions": [a.model_dump() for a in project_store.actions],
        "tasksAtRisk": [t.model_dump() for t in project_store.tasks_at_risk],
        "health": project_store.health.model_dump(),
        "documentationOutput": project_store.latest_doc_generation_output,
        "masterReport": master_report.model_dump(),
    }

