from fastapi import APIRouter
from backend.store import project_store

router = APIRouter(prefix="/api/risks", tags=["risks"])

@router.get("")
async def get_risks():
    risk_matrix = []
    for r in project_store.risks:
        risk_matrix.append({
            "id": r.id,
            "x": r.probability,
            "y": r.impact,
            "label": r.title,
            "severity": r.severity,
            "category": r.category,
            "mitigation": r.mitigation,
        })

    return {
        "risks": [r.model_dump() for r in project_store.risks],
        "tasksAtRisk": [t.model_dump() for t in project_store.tasks_at_risk],
        "riskMatrix": risk_matrix,
    }

@router.post("/clear")
async def clear_risks():
    project_store.risks = []
    project_store.tasks_at_risk = []
    return {"message": "Risks cleared", "remainingRisks": 0}
