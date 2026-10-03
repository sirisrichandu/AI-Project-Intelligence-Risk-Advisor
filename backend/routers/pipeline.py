from fastapi import APIRouter
from datetime import datetime
import time
from backend.store import project_store
from backend.agents.scope_agent import extract_project_scope
from backend.agents.risk_agent import detect_project_risks
from backend.agents.blocker_action_agent import extract_blockers_and_actions, detect_tasks_at_risk
from backend.agents.health_engine import compute_health_score
from backend.agents.doc_gen_agent import build_tabular_doc_output, generate_dossier_markdown
from backend.models import GeneratedReport

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

@router.post("/run")
async def run_pipeline():
    if not project_store.documents:
        project_store.clear_all()
        return {
            "message": "No documents in knowledge base. Upload your project documents to extract real risks.",
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

    # 1. Run Scope Agent
    project_store.scope = extract_project_scope(combined_content)

    # 2. Run Risk Agent
    project_store.risks = detect_project_risks(combined_content)

    # 3. Run Blocker & Action Agent
    blockers, actions = extract_blockers_and_actions(combined_content)
    project_store.blockers = blockers
    project_store.actions = actions

    # 4. Run Task Risk Detection
    project_store.tasks_at_risk = detect_tasks_at_risk(combined_content, project_store.risks)

    # 5. Run Health Scoring Engine
    project_store.health = compute_health_score(
        project_store.risks,
        project_store.blockers,
        project_store.actions,
        project_store.health.history,
    )

    # 6. Run Documentation Generation Agent
    project_store.latest_doc_generation_output = build_tabular_doc_output(
        project_store.scope,
        project_store.risks,
        project_store.actions,
    )

    dossier = generate_dossier_markdown(
        project_store.scope,
        project_store.risks,
        project_store.blockers,
        project_store.actions,
        project_store.health,
    )

    master_report = GeneratedReport(
        id=f"rep-master-{int(time.time() * 1000)}",
        type="complete_intelligence",
        title="Project Intelligence & Risk Master Dossier",
        createdAt=datetime.now().isoformat(),
        format="PDF",
        content=f"{project_store.latest_doc_generation_output}\n\n{dossier['content']}",
        metadata={
            "healthScore": project_store.health.overall,
            "riskCount": len(project_store.risks),
            "blockerCount": len(project_store.blockers),
            "documentsAnalyzed": len(project_store.documents),
        },
    )
    project_store.reports.insert(0, master_report)

    return {
        "message": "Automatic Multi-Agent Pipeline completed successfully.",
        "scope": project_store.scope.model_dump(),
        "risks": [r.model_dump() for r in project_store.risks],
        "blockers": [b.model_dump() for b in project_store.blockers],
        "actions": [a.model_dump() for a in project_store.actions],
        "tasksAtRisk": [t.model_dump() for t in project_store.tasks_at_risk],
        "health": project_store.health.model_dump(),
        "documentationOutput": project_store.latest_doc_generation_output,
        "masterReport": master_report.model_dump(),
    }
