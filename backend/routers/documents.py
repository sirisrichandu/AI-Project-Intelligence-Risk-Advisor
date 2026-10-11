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

def auto_extract_project_intelligence():
    """Immediately extract project scope, risks, blockers upon document upload so all tabs populate."""
    combined = project_store.get_combined_content()
    if not combined:
        return
    try:
        from backend.agents.scope_agent import extract_project_scope
        from backend.agents.risk_agent import detect_project_risks
        from backend.agents.blocker_action_agent import extract_blockers_and_actions, detect_tasks_at_risk
        from backend.agents.health_engine import compute_health_score

        project_store.scope = extract_project_scope(combined)
        project_store.risks = detect_project_risks(combined)
        b, a = extract_blockers_and_actions(combined)
        project_store.blockers = b
        project_store.actions = a
        project_store.tasks_at_risk = detect_tasks_at_risk(combined, project_store.risks)
        project_store.health = compute_health_score(
            project_store.risks,
            project_store.blockers,
            project_store.actions,
            project_store.health.history,
        )
    except Exception as e:
        import logging
        logging.getLogger("documents").warning(f"Auto-extraction error: {e}")

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
                if not raw_bytes:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Uploaded file '{file_item.name}' contains empty byte data (0 bytes)."
                    )
                text_content = extract_text_from_bytes(file_item.name, raw_bytes)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=422,
                    detail=f"Failed to decode base64 file data for '{file_item.name}': {str(e)}"
                )
        elif file_item.content is not None:
            raw_text = file_item.content.strip()
            if not raw_text:
                raise HTTPException(
                    status_code=422,
                    detail=f"Text content provided for '{file_item.name}' is empty or whitespace-only."
                )
            text_content = raw_text
            file_size_bytes = len(text_content.encode("utf-8"))
        else:
            raise HTTPException(
                status_code=422,
                detail=f"Neither valid file bytes (base64) nor actual text content was provided for '{file_item.name}'."
            )

        if not text_content or not text_content.strip():
            raise HTTPException(
                status_code=422,
                detail=f"No readable text could be extracted from '{file_item.name}'. The file appears empty or unparseable."
            )

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

        if not chunks:
            raise HTTPException(
                status_code=422,
                detail=f"Could not generate semantic chunks for '{file_item.name}'. Extracted text content was insufficient."
            )

        # 3. Store chunks into ChromaDB / persistent vector store
        indexing_res = chroma_service.add_document_chunks(
            document_id=doc_id,
            document_name=file_item.name,
            chunks=chunks,
        )
        indexed_count = int(indexing_res)
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
    auto_extract_project_intelligence()

    storage_mode = getattr(indexing_res, "storage_mode", "native_chromadb" if chroma_service.is_chroma_available else "json_fallback")
    native_chroma_success = getattr(indexing_res, "native_chroma_success", chroma_service.is_chroma_available)

    if native_chroma_success:
        summary_msg = f"{len(uploaded_docs)} document(s) uploaded and indexed into native ChromaDB ({total_indexed_chunks} vector chunks)."
    else:
        summary_msg = f"{len(uploaded_docs)} document(s) uploaded and indexed into persistent JSON vector store ({total_indexed_chunks} chunks)."

    return {
        "message": summary_msg,
        "uploadedDocuments": [d.model_dump() for d in uploaded_docs],
        "totalDocuments": len(project_store.documents),
        "totalKnowledgeChunks": total_indexed_chunks,
        "totalChromaChunks": total_indexed_chunks,
        "storageMode": storage_mode,
        "nativeChromaSuccess": native_chroma_success,
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
        if not file_bytes:
            raise HTTPException(
                status_code=422,
                detail=f"Uploaded file '{file_obj.filename}' is empty (0 bytes)."
            )

        text_content = extract_text_from_bytes(file_obj.filename, file_bytes)
        if not text_content or not text_content.strip():
            raise HTTPException(
                status_code=422,
                detail=f"No readable text could be extracted from '{file_obj.filename}'. The file appears empty or unparseable."
            )

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
        if not chunks:
            raise HTTPException(
                status_code=422,
                detail=f"Could not generate semantic chunks for '{file_obj.filename}'. Extracted content was insufficient."
            )

        # Index to ChromaDB / persistent vector store
        indexing_res = chroma_service.add_document_chunks(
            document_id=doc_id,
            document_name=file_obj.filename,
            chunks=chunks,
        )
        indexed_count = int(indexing_res)
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
    auto_extract_project_intelligence()

    storage_mode = getattr(indexing_res, "storage_mode", "native_chromadb" if chroma_service.is_chroma_available else "json_fallback")
    native_chroma_success = getattr(indexing_res, "native_chroma_success", chroma_service.is_chroma_available)

    if native_chroma_success:
        summary_msg = f"{len(uploaded_docs)} document(s) uploaded and indexed into native ChromaDB ({total_indexed_chunks} chunks)."
    else:
        summary_msg = f"{len(uploaded_docs)} document(s) uploaded and indexed into persistent JSON vector store ({total_indexed_chunks} chunks)."

    return {
        "message": summary_msg,
        "uploadedDocuments": [d.model_dump() for d in uploaded_docs],
        "totalKnowledgeChunks": total_indexed_chunks,
        "totalChromaChunks": total_indexed_chunks,
        "storageMode": storage_mode,
        "nativeChromaSuccess": native_chroma_success,
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

@router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str):
    doc = project_store.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    from fastapi.responses import Response
    safe_filename = doc.name or f"document_{doc_id}.txt"
    ext = safe_filename.split(".")[-1].lower() if "." in safe_filename else "txt"
    content = doc.content or f"[Document: {safe_filename}]"

    media_type = "text/plain; charset=utf-8"
    if ext == "csv":
        media_type = "text/csv; charset=utf-8"
    elif ext == "json":
        media_type = "application/json; charset=utf-8"
    elif ext == "pdf":
        media_type = "application/pdf"

    return Response(
        content=content.encode("utf-8") if isinstance(content, str) else content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
    )

@router.get("/sample-files/{fmt}")
async def download_sample_format(fmt: str):
    from fastapi.responses import Response
    fmt_clean = fmt.lower().strip()
    safe_filename = f"sample_project_{fmt_clean}.{fmt_clean}"
    
    if fmt_clean == "csv":
        content = "ID,Title,Status,Owner,Priority\n1,Initial Sample Requirement,Open,Sprint Lead,High\n2,Security Architecture Review,In Progress,Security Team,Critical\n"
        media_type = "text/csv; charset=utf-8"
    elif fmt_clean == "json":
        content = '{\n  "project": "Sample Project",\n  "tasks": [\n    {"id": 1, "title": "Setup pipeline", "status": "Done"}\n  ]\n}'
        media_type = "application/json; charset=utf-8"
    else:
        content = f"Sample Project {fmt_clean.upper()} Document\nID\tTitle\tStatus\n1\tInitial Sample Task\tOpen\n"
        media_type = "text/plain; charset=utf-8"

    return Response(
        content=content.encode("utf-8"),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
    )

@router.get("/sample-files/download/{filename}")
async def download_real_sample_file(filename: str):
    import os
    from fastapi.responses import FileResponse

    # Check if file exists in sample files folder
    candidates = [
        os.path.join("./backend/storage/files", filename),
        os.path.join("./backend/chroma_db/files", filename),
        os.path.join("./backend/storage/chroma_db/files", filename),
    ]
    for path in candidates:
        if os.path.exists(path) and os.path.isfile(path):
            return FileResponse(path, filename=filename)

    # Return explicit 404 Not Found when file does not exist on disk
    raise HTTPException(
        status_code=404,
        detail=f"Requested sample file '{filename}' was not found on the server. No placeholder content is generated."
    )

