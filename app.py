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

# Agents
from agents.scope_extraction_agent import extract_scope
from agents.risk_detection_agent import detect_risks
from agents.blocker_action_agent import identify_blockers_and_actions
from agents.documentation_agent import generate_documentation


# ============================================================
# CREATE FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="AI Project Intelligence & Risk Advisor",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# UPLOAD FOLDER
# ============================================================

UPLOAD_FOLDER = Path("uploads")

UPLOAD_FOLDER.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# REQUEST MODEL
# ============================================================

class AskRequest(BaseModel):
    project_name: str
    question: str
    agent: str


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "AI Project Intelligence API is running",
        "status": "success"
    }


# ============================================================
# UPLOAD DOCUMENTS
# ============================================================

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

            safe_filename = Path(
                file.filename
            ).name

            print(
                f"\nProcessing file: {safe_filename}"
            )

            # Save file
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

            # Load document
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

            # Chunk document
            chunks = chunk_text(text)

            print(
                f"Chunks created: {len(chunks)}"
            )

            if not chunks:
                continue

            # Source metadata
            sources = [
                f"{project_name}/{safe_filename}"
                for _ in chunks
            ]

            # Store in ChromaDB
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

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(error)}"
        )


# ============================================================
# ASK QUESTION
# ============================================================

@app.post("/api/ask")
async def ask_question(
    request: AskRequest
):

    try:

        project_name = request.project_name.strip()
        question = request.question.strip()
        agent = request.agent.strip()

        print("\n====================================")
        print("PROJECT:", project_name)
        print("AGENT:", agent)
        print("QUESTION:", question)
        print("====================================")

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

        # ====================================================
        # SEARCH CHROMADB
        # ====================================================

        results = search_documents(
            question,
            project_name,
            top_k=5
        )

        if not results:

            return {
                "project_name": project_name,
                "question": question,
                "agent": agent,
                "answer": (
                    "I could not find relevant information "
                    "in the uploaded project documents."
                )
            }

        # ====================================================
        # EXTRACT DOCUMENTS
        # ====================================================

        documents = results.get(
            "documents",
            []
        )

        if documents and isinstance(
            documents[0],
            list
        ):
            documents = documents[0]

        if not documents:

            return {
                "project_name": project_name,
                "question": question,
                "agent": agent,
                "answer": (
                    "I could not find relevant information "
                    "in the uploaded documents."
                )
            }

        # ====================================================
        # BUILD CONTEXT
        # ====================================================

        context = "\n\n".join(
            str(document)
            for document in documents
            if document
        )

        print(
            f"\nRetrieved context: {len(context)} characters"
        )

        # ====================================================
        # DOCUMENTATION AGENT
        # ====================================================

        if agent == "Documentation Agent":

            print(
                "\nRunning Documentation Generation Agent..."
            )

            documentation_result = (
                generate_documentation(context)
            )

            return {

                "project_name": project_name,

                "question": question,

                "agent": agent,

                "result": documentation_result

            }

        # ====================================================
        # SCOPE EXTRACTION AGENT
        # ====================================================

        if agent == "Scope Extraction Agent":

            print(
                "\nRunning Scope Extraction Agent..."
            )

            scope_result = extract_scope(
                context
            )

            return {

                "project_name": project_name,

                "question": question,

                "agent": agent,

                "result": scope_result

            }

        # ====================================================
        # RISK DETECTION AGENT
        # ====================================================

        if agent == "Risk Detection Agent":

            print(
                "\nRunning Risk Detection Agent..."
            )

            risk_result = detect_risks(
                context
            )

            return {

                "project_name": project_name,

                "question": question,

                "agent": agent,

                "result": risk_result

            }

        # ====================================================
        # BLOCKER & ACTION ITEM AGENT
        # ====================================================

        if agent == "Blocker & Action Item Agent":

            print(
                "\nRunning Blocker & Action Item Agent..."
            )

            blocker_result = (
                identify_blockers_and_actions(
                    context
                )
            )

            return {

                "project_name": project_name,

                "question": question,

                "agent": agent,

                "result": blocker_result

            }

        # ====================================================
        # AUTO ROUTING
        # ====================================================

        if agent == "Auto Routing":

            print(
                "\nRunning Auto Routing..."
            )

            routing_prompt = f"""
You are the Routing Agent of an AI Project
Intelligence and Risk Advisor.

Analyze the user's question and select the
MOST APPROPRIATE agent.

Available agents:

1. Scope Extraction Agent
2. Risk Detection Agent
3. Blocker & Action Item Agent
4. Documentation Agent
5. General Project Assistant

Rules:

- Scope, deliverables, milestones, timelines,
  responsibilities → Scope Extraction Agent

- Risks, risk analysis, delivery forecast,
  schedule threats → Risk Detection Agent

- Blockers, action items, pending decisions,
  unresolved issues → Blocker & Action Item Agent

- User stories, risk register, project documentation,
  structured documentation → Documentation Agent

- General project questions → General Project Assistant

Return ONLY the agent name.

User Question:
{question}
"""

            routing_answer = generate_answer(
                routing_prompt,
                context
            )

            routed_agent = (
                routing_answer
                .strip()
                .replace("```", "")
                .strip()
            )

            print(
                "Router selected:",
                routed_agent
            )

            # Normalize routing response
            if "Scope Extraction" in routed_agent:

                routed_agent = (
                    "Scope Extraction Agent"
                )

            elif "Risk Detection" in routed_agent:

                routed_agent = (
                    "Risk Detection Agent"
                )

            elif "Blocker" in routed_agent:

                routed_agent = (
                    "Blocker & Action Item Agent"
                )

            elif "Documentation" in routed_agent:

                routed_agent = (
                    "Documentation Agent"
                )

            else:

                routed_agent = (
                    "General Project Assistant"
                )

            # ------------------------------------------------
            # Execute routed agent
            # ------------------------------------------------

            if routed_agent == "Scope Extraction Agent":

                result = extract_scope(
                    context
                )

                return {
                    "project_name": project_name,
                    "question": question,
                    "agent": routed_agent,
                    "result": result
                }

            elif routed_agent == "Risk Detection Agent":

                result = detect_risks(
                    context
                )

                return {
                    "project_name": project_name,
                    "question": question,
                    "agent": routed_agent,
                    "result": result
                }

            elif routed_agent == "Blocker & Action Item Agent":

                result = identify_blockers_and_actions(
                    context
                )

                return {
                    "project_name": project_name,
                    "question": question,
                    "agent": routed_agent,
                    "result": result
                }

            elif routed_agent == "Documentation Agent":

                result = generate_documentation(
                    context
                )

                return {
                    "project_name": project_name,
                    "question": question,
                    "agent": routed_agent,
                    "result": result
                }

            else:

                answer = generate_answer(
                    question,
                    context
                )

                return {
                    "project_name": project_name,
                    "question": question,
                    "agent": routed_agent,
                    "answer": answer
                }

        # ====================================================
        # GENERAL PROJECT ASSISTANT
        # ====================================================

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

            "agent": "General Project Assistant",

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


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=5000,
        reload=True
    )