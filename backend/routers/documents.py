from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from datetime import datetime
import time
from backend.store import project_store
from backend.models import ProjectDocument, UploadJsonRequest

router = APIRouter(prefix="/api", tags=["documents"])

@router.get("/documents")
async def get_documents():
    return {
        "documents": [d.model_dump() for d in project_store.documents],
        "totalChunks": len(project_store.documents),
    }

@router.post("/upload-json")
async def upload_json_documents(req: UploadJsonRequest):
    if not req.files:
        raise HTTPException(status_code=400, detail="No files provided in JSON payload.")

    uploaded_docs: List[ProjectDocument] = []
    current_date = datetime.now().strftime("%Y-%m-%d")
    timestamp = int(time.time() * 1000)

    for i, file_item in enumerate(req.files):
        ext = file_item.name.split(".")[-1].upper() if "." in file_item.name else "TXT"
        content_size_kb = max(1, round(len(file_item.content) / 1024))
        doc_id = f"doc-{timestamp}-{i}"

        # Category detection
        lower_name = file_item.name.lower()
        category = file_item.category or "general"
        if any(w in lower_name for w in ["srs", "spec", "requirement", "prs"]):
            category = "requirements"
        elif any(w in lower_name for w in ["task", "backlog", "jira", "tracker", "csv"]):
            category = "tasks"
        elif any(w in lower_name for w in ["meeting", "note", "retro", "standup"]):
            category = "meetings"

        doc = ProjectDocument(
            id=doc_id,
            name=file_item.name,
            type=ext,
            size=f"{content_size_kb} KB",
            uploadDate=current_date,
            status="COMPLETED",
            chunkCount=1,
            category=category,
            content=file_item.content,
        )
        uploaded_docs.append(doc)

    project_store.add_documents(uploaded_docs)

    return {
        "message": f"{len(uploaded_docs)} document(s) uploaded and indexed successfully into RAG knowledge base.",
        "uploadedDocuments": [d.model_dump() for d in uploaded_docs],
        "totalKnowledgeChunks": len(project_store.documents),
    }

@router.delete("/documents")
async def clear_all_documents_del():
    project_store.clear_all()
    return {"message": "All documents cleared from knowledge base", "remainingDocuments": 0}

@router.post("/documents/clear-all")
async def clear_all_documents_post():
    project_store.clear_all()
    return {"message": "All documents cleared from knowledge base", "remainingDocuments": 0}

@router.delete("/documents/{doc_id}")
async def delete_single_document(doc_id: str):
    removed = project_store.delete_document(doc_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": f"Document {doc_id} deleted successfully", "remainingDocuments": len(project_store.documents)}
