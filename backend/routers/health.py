from fastapi import APIRouter
from backend.store import project_store

router = APIRouter(prefix="/api/health", tags=["health"])

@router.get("")
async def get_health():
    return project_store.health.model_dump()

@router.get("/history")
async def get_health_history():
    return {
        "current": project_store.health.overall,
        "trend": project_store.health.trend,
        "history": [h.model_dump() for h in project_store.health.history],
    }
