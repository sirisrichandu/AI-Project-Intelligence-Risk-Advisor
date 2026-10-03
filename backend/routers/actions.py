from fastapi import APIRouter
from backend.store import project_store

router = APIRouter(prefix="/api/actions", tags=["actions"])

@router.get("")
async def get_actions():
    return {
        "actions": [a.model_dump() for a in project_store.actions],
        "tasksAtRisk": [t.model_dump() for t in project_store.tasks_at_risk],
    }
