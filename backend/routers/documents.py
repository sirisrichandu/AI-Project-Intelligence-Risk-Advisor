from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Dict, Any, Optional
from datetime import datetime
import time
import base64
from backend.store import project_store
from backend.models import ProjectDocument, UploadJsonRequest
from backend.chroma_service import chroma_service
from backend.document_parser import extract_text_from_bytes, chunk_document_text

router = APIRouter(prefix="/api", tags=["documents"])

@router.get("/documents")
async def get_documents():
    total_chunks = sum(d.chunkCount for d in project_store.documents)
    return {
        "documents": [d.model_dump() for d in project_store.documents],
        "totalDocuments": len(project_store.documents),
        "totalChunks": total_chunks,
        "chromaStatus": "Active" if chroma_service.is_chroma_available else "Local Persistent Store",
    }

@router.post("/upload-json")
async def upload_json_documents(req: UploadJsonRequest):
    """
    Ingests document payloads (including base64 PDFs from Streamlit or Web),
    extracts clean text, chunks semantically, and stores vector embeddings in ChromaDB.
    """
    if not req.files:
        raise HTTPException(status_code=400, detail="No files provided in JSON payload.")

    uploaded_docs: List[ProjectDocument] = []
    current_date = datetime.now().strftime("%Y-%m-%d")
    timestamp = int(time.time() * 1000)
    total_indexed_chunks = 0

    for i, file_item in enumerate(req.files):
        ext = file_item.name.split(".")[-1].upper() if "." in file_item.name else "TXT"
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

        # 1. Extract text from Base64 or plain string
        text_content = ""
        file_size_bytes = 0

        if file_item.base64:
            try:
                raw_bytes = base64.b64decode(file_item.base64)
                file_size_bytes = len(raw_bytes)
                text_content = extract_text_from_bytes(file_item.name, raw_bytes)
            except Exception as e:
                text_content = f"Error decoding file {file_item.name}: {str(e)}"
        elif file_item.content:
            text_content = file_item.content
            file_size_bytes = len(text_content.encode("utf-8"))
        else:
            text_content = f"Uploaded document: {file_item.name}"

        # Size formatting
        size_kb = max(1, round(file_size_bytes / 1024)) if file_size_bytes else 1
        size_str = f"{size_kb} KB"

        # 2. Semantic chunking for ChromaDB
        chunks = chunk_document_text(
            text=text_content,
            chunk_size=700,
            overlap=120,
            category=category,
        )

        # 3. Store chunks into persistent ChromaDB
        indexed_count = chroma_service.add_document_chunks(
            document_id=doc_id,
            document_name=file_item.name,
            chunks=chunks,
        )
        total_indexed_chunks += indexed_count

        doc = ProjectDocument(
            id=doc_id,
            name=file_item.name,
            type=ext,
            size=size_str,
            uploadDate=current_date,
            status="COMPLETED",
            chunkCount=max(1, len(chunks)),
            category=category,
            content=text_content,
        )
        uploaded_docs.append(doc)

    project_store.add_documents(uploaded_docs)

    return {
        "message": f"{len(uploaded_docs)} document(s) uploaded and indexed into ChromaDB ({total_indexed_chunks} vector chunks).",
        "uploadedDocuments": [d.model_dump() for d in uploaded_docs],
        "totalDocuments": len(project_store.documents),
        "totalChromaChunks": total_indexed_chunks,
        "chromaCollection": "project_knowledge_base",
    }

@router.post("/upload")
async def upload_multipart_files(files: List[UploadFile] = File(...)):
    """
    Direct multipart form-data file upload (PDF, DOCX, CSV, TXT)
    directly extracted and stored into ChromaDB.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files received.")

    uploaded_docs: List[ProjectDocument] = []
    current_date = datetime.now().strftime("%Y-%m-%d")
    timestamp = int(time.time() * 1000)
    total_indexed_chunks = 0

    for i, file_obj in enumerate(files):
        ext = file_obj.filename.split(".")[-1].upper() if "." in file_obj.filename else "TXT"
        doc_id = f"doc-{timestamp}-{i}"

        # Read binary file bytes
        file_bytes = await file_obj.read()
        text_content = extract_text_from_bytes(file_obj.filename, file_bytes)

        # Categorize
        lower_name = file_obj.filename.lower()
        category = "general"
        if any(w in lower_name for w in ["srs", "spec", "requirement", "prs"]):
            category = "requirements"
        elif any(w in lower_name for w in ["task", "backlog", "jira", "tracker", "csv"]):
            category = "tasks"
        elif any(w in lower_name for w in ["meeting", "note", "retro", "standup"]):
            category = "meetings"

        # Chunk text
        chunks = chunk_document_text(text=text_content, category=category)

        # Index to ChromaDB
        indexed_count = chroma_service.add_document_chunks(
            document_id=doc_id,
            document_name=file_obj.filename,
            chunks=chunks,
        )
        total_indexed_chunks += indexed_count

        size_kb = max(1, round(len(file_bytes) / 1024))

        doc = ProjectDocument(
            id=doc_id,
            name=file_obj.filename,
            type=ext,
            size=f"{size_kb} KB",
            uploadDate=current_date,
            status="COMPLETED",
            chunkCount=max(1, len(chunks)),
            category=category,
            content=text_content,
        )
        uploaded_docs.append(doc)

    project_store.add_documents(uploaded_docs)

    return {
        "message": f"{len(uploaded_docs)} document(s) uploaded and indexed into ChromaDB ({total_indexed_chunks} chunks).",
        "uploadedDocuments": [d.model_dump() for d in uploaded_docs],
        "totalChromaChunks": total_indexed_chunks,
    }

@router.delete("/documents")
async def clear_all_documents_del():
    project_store.clear_all()
    chroma_service.reset_collection()
    return {"message": "All documents and ChromaDB vector embeddings cleared.", "remainingDocuments": 0}

@router.post("/documents/clear-all")
async def clear_all_documents_post():
    project_store.clear_all()
    chroma_service.reset_collection()
    return {"message": "All documents and ChromaDB vector embeddings cleared.", "remainingDocuments": 0}

@router.delete("/documents/{doc_id}")
async def delete_single_document(doc_id: str):
    removed = project_store.delete_document(doc_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Document not found")
    chroma_service.delete_document(doc_id)
    return {
        "message": f"Document {doc_id} and its ChromaDB embeddings deleted successfully.",
        "remainingDocuments": len(project_store.documents),
    }
