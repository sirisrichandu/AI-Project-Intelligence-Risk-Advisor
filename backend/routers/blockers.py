from fastapi import APIRouter
from backend.store import project_store

router = APIRouter(prefix="/api/blockers", tags=["blockers"])

@router.get("")
async def get_blockers():
    return {
        "blockers": [b.model_dump() for b in project_store.blockers],
        "conflicts": [],
    }
