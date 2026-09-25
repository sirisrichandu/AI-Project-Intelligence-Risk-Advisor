import shutil
import traceback
from pathlib import Path

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ingestion.document_loader import load_document
from rag.chunking import chunk_text

from rag.chroma_store import (
    add_documents,
    search_documents
)

from llm import generate_answer


# ==========================================
# CREATE FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="AI Project Intelligence & Risk Advisor",
    version="1.0.0"
)


# ==========================================
# CORS CONFIGURATION
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ==========================================
# UPLOAD FOLDER
# ==========================================

UPLOAD_FOLDER = Path("uploads")

UPLOAD_FOLDER.mkdir(
    parents=True,
    exist_ok=True
)


# ==========================================
# REQUEST MODEL
# ==========================================

class AskRequest(BaseModel):

    project_name: str
    question: str
    agent: str


# ==========================================
# HOME ROUTE
# ==========================================

@app.get("/")
def home():

    return {
        "message": "AI Project Intelligence API is running",
        "status": "success"
    }


# ==========================================
# UPLOAD DOCUMENTS
# ==========================================

@app.post("/api/upload")
async def upload_documents(
    project_name: str = Form(...),
    files: list[UploadFile] = File(...)
):

    try:

        project_name = project_name.strip()

        if not project_name:

            raise HTTPException(
                status_code=400,
                detail="Project name is required"
            )

        if not files:

            raise HTTPException(
                status_code=400,
                detail="Please upload at least one file"
            )

        # Create project folder
        project_folder = (
            UPLOAD_FOLDER / project_name
        )

        project_folder.mkdir(
            parents=True,
            exist_ok=True
        )

        total_chunks = 0
        uploaded_files = []

        for file in files:

            if not file.filename:
                continue

            # Prevent unsafe file paths
            safe_filename = Path(
                file.filename
            ).name

            print(
                f"\nProcessing file: {safe_filename}"
            )

            # ==================================
            # SAVE FILE
            # ==================================

            file_path = (
                project_folder / safe_filename
            )

            with open(
                file_path,
                "wb"
            ) as buffer:

                shutil.copyfileobj(
                    file.file,
                    buffer
                )

            print(
                f"File saved: {file_path}"
            )

            # ==================================
            # LOAD DOCUMENT
            # ==================================

            text = load_document(
                str(file_path)
            )

            print(
                "Document loaded successfully"
            )

            if not text or not text.strip():

                print(
                    f"No text found in {safe_filename}"
                )

                continue

            # ==================================
            # CREATE CHUNKS
            # ==================================

            chunks = chunk_text(text)

            print(
                f"Chunks created: {len(chunks)}"
            )

            if not chunks:

                print(
                    f"No chunks created for {safe_filename}"
                )

                continue

            # ==================================
            # CREATE SOURCE NAMES
            # ==================================

            sources = [
                f"{project_name}/{safe_filename}"
                for _ in chunks
            ]

            # ==================================
            # STORE DOCUMENTS IN CHROMADB
            # ==================================

            added_chunks = add_documents(
                chunks,
                sources,
                project_name
            )

            print(
                f"Added chunks: {added_chunks}"
            )

            total_chunks += added_chunks

            uploaded_files.append(
                safe_filename
            )

        if not uploaded_files:

            raise HTTPException(
                status_code=400,
                detail="No valid documents were uploaded"
            )

        return {

            "message": "Documents uploaded successfully",

            "project_name": project_name,

            "files": uploaded_files,

            "total_chunks": total_chunks

        }

    except HTTPException:

        raise

    except Exception as error:

        print("\nUPLOAD ERROR")

        print(
            f"Error message: {str(error)}"
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(error)}"
        )


# ==========================================
# ASK QUESTION
# ==========================================

@app.post("/api/ask")
async def ask_question(
    request: AskRequest
):

    try:

        project_name = request.project_name.strip()
        question = request.question.strip()

        print(
            f"\nProject: {project_name}"
        )

        print(
            f"Question: {question}"
        )

        if not project_name:

            raise HTTPException(
                status_code=400,
                detail="Project name is required"
            )

        if not question:

            raise HTTPException(
                status_code=400,
                detail="Question is required"
            )

        # ==================================
        # SEARCH CHROMADB
        # ==================================

        results = search_documents(
            question,
            project_name,
            top_k=5
        )

        if not results:

            return {

                "project_name": project_name,

                "question": question,

                "agent": request.agent,

                "answer": (
                    "I could not find this information "
                    "in the uploaded project documents."
                )

            }

        # ==================================
        # EXTRACT DOCUMENTS FROM CHROMADB
        # ==================================

        documents = results.get(
            "documents",
            []
        )

        # ChromaDB returns nested documents:
        # [["chunk 1", "chunk 2", "chunk 3"]]

        if documents and isinstance(
            documents[0],
            list
        ):

            documents = documents[0]

        if not documents:

            return {

                "project_name": project_name,

                "question": question,

                "agent": request.agent,

                "answer": (
                    "I could not find relevant information "
                    "in the uploaded documents."
                )

            }

        # ==================================
        # PREPARE CONTEXT
        # ==================================

        context = "\n\n".join(
            str(document)
            for document in documents
            if document
        )

        print(
            "\nRelevant context retrieved successfully"
        )

        print(
            f"Context length: {len(context)} characters"
        )

        # ==================================
        # GENERATE GEMINI ANSWER
        # ==================================

        answer = generate_answer(
            question,
            context
        )

        if not answer:

            answer = (
                "Unable to generate an answer "
                "from the uploaded documents."
            )

        return {

            "project_name": project_name,

            "question": question,

            "agent": request.agent,

            "answer": answer

        }

    except HTTPException:

        raise

    except Exception as error:

        print("\nQUESTION ERROR")

        print(
            f"Error message: {str(error)}"
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Question failed: {str(error)}"
        )


# ==========================================
# RUN APPLICATION
# ==========================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=5000,
        reload=True
    )