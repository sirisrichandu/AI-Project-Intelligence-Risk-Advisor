from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
import time
from datetime import datetime
from backend.store import project_store
from backend.models import GeneratedReport
from backend.agents.doc_gen_agent import build_tabular_doc_output

router = APIRouter(prefix="/api", tags=["reports"])

class GenerateReportRequest(BaseModel):
    title: Optional[str] = "Synthesized Project Intelligence Dossier"
    type: Optional[str] = "Executive Dossier"
    format: Optional[str] = "PDF"

@router.get("/reports")
async def get_reports():
    return {
        "reports": [r.model_dump() for r in project_store.reports],
    }

@router.post("/reports/generate")
async def generate_report(req: Optional[GenerateReportRequest] = None):
    req_title = req.title if req and req.title else "Synthesized Project Intelligence Dossier"
    req_type = req.type if req and req.type else "Executive Dossier"
    req_format = req.format if req and req.format else "PDF"

    if not project_store.latest_doc_generation_output:
        project_store.latest_doc_generation_output = build_tabular_doc_output(
            project_store.scope,
            project_store.risks,
            project_store.actions,
        )

    current_date = datetime.now().strftime("%Y-%m-%d")
    report = GeneratedReport(
        id=f"REP-{int(time.time() * 1000)}",
        title=req_title,
        type=req_type,
        format=req_format,
        createdAt=current_date,
        summary=f"Synthesized intelligence covering {len(project_store.documents)} artifacts in native ChromaDB.",
        content=project_store.latest_doc_generation_output or "Project Intelligence Report Summary",
        metadata={
            "healthScore": project_store.health.overall,
            "risksCount": len(project_store.risks),
            "blockersCount": len(project_store.blockers),
            "generatedEngine": "Python LangGraph StateGraph",
        },
    )
    project_store.add_report(report)
    return report.model_dump()

@router.delete("/reports/{report_id}")
async def delete_report(report_id: str):
    removed = project_store.delete_report(report_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": f"Report {report_id} deleted successfully.", "remainingReports": len(project_store.reports)}

@router.get("/documentation/latest")
async def get_latest_documentation():
    if not project_store.documents:
        project_store.latest_doc_generation_output = ""
        return {
            "documentationOutput": "",
            "hasDocuments": False,
        }

    if not project_store.latest_doc_generation_output or not project_store.latest_doc_generation_output.strip():
        project_store.latest_doc_generation_output = build_tabular_doc_output(
            project_store.scope,
            project_store.risks,
            project_store.actions,
        )

    return {
        "documentationOutput": project_store.latest_doc_generation_output,
        "hasDocuments": True,
    }

