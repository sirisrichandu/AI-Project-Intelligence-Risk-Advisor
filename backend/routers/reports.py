from fastapi import APIRouter
from backend.store import project_store
from backend.agents.doc_gen_agent import build_tabular_doc_output

router = APIRouter(prefix="/api", tags=["reports"])

@router.get("/reports")
async def get_reports():
    return {
        "reports": [r.model_dump() for r in project_store.reports],
    }

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
