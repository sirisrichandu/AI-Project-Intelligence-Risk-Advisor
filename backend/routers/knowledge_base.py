from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from backend.chroma_service import chroma_service

router = APIRouter(prefix="/api", tags=["knowledge-base"])

class SearchRequest(BaseModel):
    query: Optional[str] = ""
    category: Optional[str] = None
    categoryFilter: Optional[str] = None
    topK: Optional[int] = 10
    limit: Optional[int] = 10
    projectId: Optional[str] = None
    project_id: Optional[str] = None

class ResetKnowledgeBaseRequest(BaseModel):
    confirm: bool = False
    confirmation_phrase: Optional[str] = None
    projectId: Optional[str] = None
    project_id: Optional[str] = None

@router.post("/knowledge-base/search")
@router.post("/search")
@router.post("/query")
async def search_knowledge_base(req: SearchRequest):
    query_text = (req.query or "").strip()
    cat = req.category or req.categoryFilter
    k = req.topK or req.limit or 10
    pid = req.projectId or req.project_id

    results = chroma_service.query_similarity(
        query=query_text,
        top_k=k,
        project_id=pid,
        category_filter=cat,
    )

    return {
        "query": query_text,
        "totalMatches": len(results),
        "results": results,
    }

@router.post("/knowledge-base/reset")
async def reset_knowledge_base(req: ResetKnowledgeBaseRequest):
    """
    Dedicated endpoint to clear records from the active ChromaDB collection ('project_knowledge_base').
    Enforces explicit confirmation phrase 'CONFIRM_RESET' to prevent accidental erasure.
    Preserves collection schema, embedding function, metadata, and database directory structure.
    """
    if req.confirm is not True or req.confirmation_phrase != "CONFIRM_RESET":
        raise HTTPException(
            status_code=400,
            detail="Reset confirmation required. Request body must include {'confirm': True, 'confirmation_phrase': 'CONFIRM_RESET'}."
        )

    pid = req.projectId or req.project_id

    try:
        cleared_count = chroma_service.clear_collection_records(project_id=pid)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear active ChromaDB collection records: {str(e)}"
        )

    collection_name = chroma_service.collection.name if chroma_service.collection else "project_knowledge_base"
    return {
        "status": "success",
        "message": f"Active vector collection '{collection_name}' records cleared successfully.",
        "clearedRecords": cleared_count,
        "collection": collection_name,
        "databasePath": chroma_service.persist_dir,
        "collectionPreserved": True,
        "projectId": pid,
    }

