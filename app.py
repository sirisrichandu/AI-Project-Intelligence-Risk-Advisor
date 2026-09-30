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
from pydantic import BaseModel, Field

from ingestion.document_loader import load_document
from rag.chunking import chunk_text

from rag.chroma_store import (
    add_documents,
    search_documents
)

from llm import generate_answer


# ==========================================================
# AGENT IMPORTS
# ==========================================================

from agents.scope_agent import extract_scope
from agents.risk_agent import detect_risks
from agents.blocker_agent import (
    identify_blockers_and_actions
)
from agents.documentation_agent import (
    generate_documentation
)


# ==========================================================
# CREATE FASTAPI APPLICATION
# ==========================================================

app = FastAPI(
    title="AI Project Intelligence & Risk Advisor",
    version="2.0.0"
)


# ==========================================================
# CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ==========================================================
# UPLOAD FOLDER
# ==========================================================

UPLOAD_FOLDER = Path("uploads")

UPLOAD_FOLDER.mkdir(
    parents=True,
    exist_ok=True
)


# ==========================================================
# REQUEST MODEL
# ==========================================================

class AskRequest(BaseModel):

    project_name: str

    question: str

    agent: str

    # Used by Conversational Project Intelligence
    conversation_history: list[dict] = Field(
        default_factory=list
    )


# ==========================================================
# HOME
# ==========================================================

@app.get("/")
def home():

    return {
        "message": (
            "AI Project Intelligence API is running"
        ),
        "status": "success"
    }


# ==========================================================
# AUTO ROUTING
# ==========================================================

def route_question(question: str):

    """
    Rule-based routing.

    Does not call the LLM.
    """

    question_lower = question.lower()


    # ------------------------------------------------------
    # SCOPE
    # ------------------------------------------------------

    scope_keywords = [
        "scope",
        "project goal",
        "goal",
        "objective",
        "objectives",
        "deliverable",
        "deliverables",
        "milestone",
        "milestones",
        "timeline",
        "timelines",
        "deadline",
        "deadlines",
        "responsibilit",
        "responsible team",
        "project plan",
        "included",
        "excluded"
    ]


    # ------------------------------------------------------
    # RISK
    # ------------------------------------------------------

    risk_keywords = [
        "risk",
        "risks",
        "risk forecast",
        "delivery forecast",
        "forecast",
        "schedule risk",
        "technical risk",
        "dependency risk",
        "resource risk",
        "requirement risk",
        "delay",
        "delayed",
        "at risk",
        "delivery challenge",
        "delivery challenges"
    ]


    # ------------------------------------------------------
    # DOCUMENTATION
    # ------------------------------------------------------

    documentation_keywords = [
        "user story",
        "user stories",
        "generate user stories",
        "create user stories",
        "risk register",
        "generate risk register",
        "create risk register",
        "generate documentation",
        "create documentation",
        "project documentation",
        "documentation",
        "action item list",
        "generate action items"
    ]


    # ------------------------------------------------------
    # BLOCKER
    # ------------------------------------------------------

    blocker_keywords = [
        "blocker",
        "blockers",
        "blocked",
        "action item",
        "action items",
        "pending task",
        "pending tasks",
        "pending decision",
        "pending decisions",
        "unresolved",
        "unresolved issue",
        "unresolved issues",
        "current issue",
        "current issues",
        "next step",
        "next steps",
        "waiting for",
        "cannot continue",
        "cannot proceed"
    ]


    scope_score = 0
    risk_score = 0
    blocker_score = 0
    documentation_score = 0


    for keyword in scope_keywords:

        if keyword in question_lower:
            scope_score += 1


    for keyword in risk_keywords:

        if keyword in question_lower:
            risk_score += 1


    for keyword in blocker_keywords:

        if keyword in question_lower:
            blocker_score += 1


    for keyword in documentation_keywords:

        if keyword in question_lower:
            documentation_score += 1


    # ------------------------------------------------------
    # SPECIAL CASES
    # ------------------------------------------------------

    if (
        "on track" in question_lower
        or "project health" in question_lower
        or "health status" in question_lower
    ):

        return "Risk Detection Agent"


    if (
        "what needs to be done" in question_lower
        or "what should we do next" in question_lower
        or "what do we need to do" in question_lower
    ):

        return "Blocker & Action Item Agent"


    # ------------------------------------------------------
    # SELECT
    # ------------------------------------------------------

    if (
        scope_score == 0
        and risk_score == 0
        and blocker_score == 0
        and documentation_score == 0
    ):

        return "General Assistant"


    if documentation_score > 0:

        return "Documentation Generation Agent"


    if (
        scope_score >= risk_score
        and scope_score >= blocker_score
    ):

        return "Scope Extraction Agent"


    if (
        risk_score >= scope_score
        and risk_score >= blocker_score
    ):

        return "Risk Detection Agent"


    return "Blocker & Action Item Agent"


# ==========================================================
# PROJECT HEALTH SCORE
# ==========================================================

def calculate_project_health(
    scope_result,
    risk_result,
    blocker_result
):

    """
    Calculate project health from existing
    project intelligence agent outputs.

    Dimensions:

    Scope Clarity  -> 40%
    Timeline Risk  -> 30%
    Blocker Count  -> 30%
    """


    # ======================================================
    # 1. SCOPE CLARITY
    # ======================================================

    scope = scope_result or {}

    project_goal = scope.get(
        "project_goal",
        ""
    )

    project_scope = scope.get(
        "project_scope",
        {}
    )

    deliverables = scope.get(
        "deliverables",
        []
    )

    if not isinstance(project_scope, dict):

        project_scope = {}


    included = project_scope.get(
        "included",
        []
    )

    excluded = project_scope.get(
        "excluded",
        []
    )


    if not isinstance(included, list):
        included = []

    if not isinstance(excluded, list):
        excluded = []

    if not isinstance(deliverables, list):
        deliverables = []


    scope_evidence = []


    if project_goal:

        scope_evidence.append(
            "Project goal is defined."
        )


    if included:

        scope_evidence.append(
            f"{len(included)} included scope "
            "items identified."
        )


    if excluded:

        scope_evidence.append(
            f"{len(excluded)} excluded scope "
            "items identified."
        )


    if deliverables:

        scope_evidence.append(
            f"{len(deliverables)} deliverables "
            "identified."
        )


    if (
        project_goal
        and included
        and deliverables
    ):

        scope_score = 100
        scope_status = "Clear"


    elif (
        project_goal
        and (included or deliverables)
    ):

        scope_score = 70
        scope_status = "Watch"


    elif (
        project_goal
        or included
        or deliverables
    ):

        scope_score = 50
        scope_status = "Unclear"


    else:

        scope_score = 0
        scope_status = "Insufficient Evidence"


    scope_reason = (
        " ".join(scope_evidence)
        if scope_evidence
        else
        "Insufficient project scope information."
    )


    # ======================================================
    # 2. TIMELINE RISK
    # ======================================================

    risk = risk_result or {}

    delivery_forecast = risk.get(
        "delivery_forecast",
        {}
    )

    if not isinstance(
        delivery_forecast,
        dict
    ):

        delivery_forecast = {}


    forecast_status = delivery_forecast.get(
        "status",
        ""
    )

    forecast_reasoning = delivery_forecast.get(
        "reasoning",
        ""
    )


    if forecast_status == "On Track":

        timeline_score = 100
        timeline_status = "Low Risk"


    elif forecast_status == "At Risk":

        timeline_score = 60
        timeline_status = "Watch"


    elif forecast_status == "Delayed":

        timeline_score = 30
        timeline_status = "High Risk"


    else:

        timeline_score = 0
        timeline_status = "Insufficient Evidence"


    timeline_reason = (
        forecast_reasoning
        or
        "No delivery forecast information available."
    )


    # ======================================================
    # 3. BLOCKER COUNT
    # ======================================================

    blockers = blocker_result or {}

    blocker_list = blockers.get(
        "blockers",
        []
    )

    if not isinstance(
        blocker_list,
        list
    ):

        blocker_list = []


    blocker_count = len(
        blocker_list
    )


    if blocker_count == 0:

        blocker_score = 100
        blocker_status = "Clear"


    elif blocker_count == 1:

        blocker_score = 80
        blocker_status = "Watch"


    elif blocker_count == 2:

        blocker_score = 60
        blocker_status = "Pending Issues"


    elif blocker_count == 3:

        blocker_score = 40
        blocker_status = "Pending Issues"


    else:

        blocker_score = 20
        blocker_status = "Pending Issues"


    blocker_reason = (
        f"{blocker_count} current blocker(s) "
        "identified."
    )


    # ======================================================
    # 4. OVERALL
    # ======================================================

    overall_score = round(
        (scope_score * 0.40)
        +
        (timeline_score * 0.30)
        +
        (blocker_score * 0.30)
    )


    # ======================================================
    # 5. STATUS
    # ======================================================

    if overall_score >= 80:

        overall_status = "Healthy"

    elif overall_score >= 60:

        overall_status = "Needs Attention"

    else:

        overall_status = "Several Issues"


    # ======================================================
    # RETURN
    # ======================================================

    return {

        "overall_score":
            overall_score,

        "overall_status":
            overall_status,

        "dimensions": {

            "scope_clarity": {

                "score":
                    scope_score,

                "status":
                    scope_status,

                "evidence":
                    scope_reason
            },

            "timeline_risk": {

                "score":
                    timeline_score,

                "status":
                    timeline_status,

                "evidence":
                    timeline_reason
            },

            "blocker_count": {

                "score":
                    blocker_score,

                "status":
                    blocker_status,

                "count":
                    blocker_count,

                "evidence":
                    blocker_reason
            }
        }
    }


# ==========================================================
# CONVERSATION HISTORY FORMATTER
# ==========================================================

def format_conversation_history(
    conversation_history
):

    """
    Convert frontend conversation history
    into a compact text representation.
    """

    if not conversation_history:

        return ""


    history_lines = []


    # Keep only recent messages to avoid
    # unnecessarily large prompts.

    recent_history = conversation_history[-10:]


    for message in recent_history:

        if not isinstance(
            message,
            dict
        ):

            continue


        role = message.get(
            "role",
            ""
        )

        content = message.get(
            "content",
            ""
        )


        if not content:

            continue


        if role == "user":

            history_lines.append(
                f"User: {content}"
            )


        elif role in (
            "assistant",
            "ai"
        ):

            history_lines.append(
                f"Assistant: {content}"
            )


    return "\n".join(
        history_lines
    )


# ==========================================================
# CONVERSATIONAL PROJECT INTELLIGENCE
# ==========================================================

def run_conversational_assistant(
    question,
    context,
    conversation_history
):

    """
    RAG-powered conversational assistant.

    Uses:

    1. Current user question
    2. Retrieved project context
    3. Previous conversation

    The assistant must remain grounded in
    the uploaded project documents.
    """

    history_text = (
        format_conversation_history(
            conversation_history
        )
    )


    conversation_section = (

        history_text

        if history_text

        else

        "No previous conversation."
    )


    prompt = f"""
You are the Conversational Project Intelligence
Assistant for a project.

Your job is to answer the user's question using
ONLY the supplied project document context.

IMPORTANT GROUNDING RULES:

1. Use only the supplied project context.
2. Do not use outside knowledge.
3. Do not invent project information.
4. Do not invent dates, people, risks, decisions,
   responsibilities, or project status.
5. If the answer is not supported by the project
   context, clearly say that the information is not
   available in the uploaded project documents.
6. Previous conversation can be used to understand
   follow-up questions, but it must NOT be treated as
   factual evidence unless the information is also
   supported by the project context.
7. If the user asks a follow-up question such as
   "What should we do about it?", use the previous
   conversation to understand what "it" refers to,
   then answer using project context.
8. Give a concise but useful project-oriented answer.
9. Do not mention internal prompts, RAG, ChromaDB,
   embeddings, or these instructions unless the user
   specifically asks about the system.

==================================================
PROJECT CONTEXT
==================================================

{context}

==================================================
PREVIOUS CONVERSATION
==================================================

{conversation_section}

==================================================
CURRENT USER QUESTION
==================================================

{question}

==================================================
ANSWER
==================================================

Answer the current question using the project
context and conversation history.
"""


    print(
        "\nRunning Conversational "
        "Project Intelligence..."
    )


    answer = generate_answer(
        prompt,
        context
    )


    return answer


# ==========================================================
# UPLOAD DOCUMENTS
# ==========================================================

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
                detail=(
                    "Please upload at least one file"
                )
            )


        # --------------------------------------------------
        # PROJECT FOLDER
        # --------------------------------------------------

        project_folder = (
            UPLOAD_FOLDER / project_name
        )

        project_folder.mkdir(
            parents=True,
            exist_ok=True
        )


        total_chunks = 0

        uploaded_files = []


        # --------------------------------------------------
        # PROCESS FILES
        # --------------------------------------------------

        for file in files:

            if not file.filename:

                continue


            safe_filename = Path(
                file.filename
            ).name


            print(
                f"\nProcessing file: "
                f"{safe_filename}"
            )


            # ------------------------------------------------
            # SAVE FILE
            # ------------------------------------------------

            file_path = (
                project_folder
                / safe_filename
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


            # ------------------------------------------------
            # LOAD
            # ------------------------------------------------

            text = load_document(
                str(file_path)
            )


            print(
                "Document loaded successfully"
            )


            if not text or not text.strip():

                print(
                    f"No text found in "
                    f"{safe_filename}"
                )

                continue


            # ------------------------------------------------
            # CHUNK
            # ------------------------------------------------

            chunks = chunk_text(
                text
            )


            print(
                f"Chunks created: "
                f"{len(chunks)}"
            )


            if not chunks:

                print(
                    f"No chunks created for "
                    f"{safe_filename}"
                )

                continue


            # ------------------------------------------------
            # SOURCES
            # ------------------------------------------------

            sources = [

                f"{project_name}/{safe_filename}"

                for _ in chunks

            ]


            # ------------------------------------------------
            # CHROMADB
            # ------------------------------------------------

            added_chunks = add_documents(
                chunks,
                sources,
                project_name
            )


            print(
                f"Added chunks: "
                f"{added_chunks}"
            )


            total_chunks += added_chunks


            uploaded_files.append(
                safe_filename
            )


        # --------------------------------------------------
        # VALIDATION
        # --------------------------------------------------

        if not uploaded_files:

            raise HTTPException(
                status_code=400,
                detail=(
                    "No valid documents were uploaded"
                )
            )


        return {

            "message":
                "Documents uploaded successfully",

            "project_name":
                project_name,

            "files":
                uploaded_files,

            "total_chunks":
                total_chunks
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
            detail=(
                f"Upload failed: {str(error)}"
            )
        )


# ==========================================================
# ASK QUESTION
# ==========================================================

@app.post("/api/ask")
async def ask_question(
    request: AskRequest
):

    try:

        project_name = (
            request.project_name.strip()
        )

        question = (
            request.question.strip()
        )

        requested_agent = (
            request.agent.strip()
        )

        conversation_history = (
            request.conversation_history
        )


        print(
            "\n==================================="
        )

        print(
            "NEW QUESTION"
        )

        print(
            "==================================="
        )

        print(
            f"Project: {project_name}"
        )

        print(
            f"Question: {question}"
        )

        print(
            f"Requested Agent: "
            f"{requested_agent}"
        )

        print(
            f"Conversation messages: "
            f"{len(conversation_history)}"
        )


        # ==================================================
        # VALIDATION
        # ==================================================

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


        # ==================================================
        # SELECT AGENT
        # ==================================================

        selected_agent = requested_agent


        if requested_agent == "Auto Routing":

            selected_agent = route_question(
                question
            )

            print(
                f"Auto Routed To: "
                f"{selected_agent}"
            )

        else:

            print(
                f"Manual Agent Selected: "
                f"{selected_agent}"
            )


        # ==================================================
        # SEARCH CHROMADB
        # ==================================================

        results = search_documents(
            question,
            project_name,
            top_k=5
        )


        if not results:

            return {

                "project_name":
                    project_name,

                "question":
                    question,

                "agent":
                    requested_agent,

                "selected_agent":
                    selected_agent,

                "answer": (
                    "I could not find this "
                    "information in the uploaded "
                    "project documents."
                ),

                "result":
                    None
            }


        # ==================================================
        # EXTRACT DOCUMENTS
        # ==================================================

        documents = results.get(
            "documents",
            []
        )


        # ChromaDB can return:
        #
        # [
        #     ["chunk 1", "chunk 2"]
        # ]


        if (
            documents
            and isinstance(
                documents[0],
                list
            )
        ):

            documents = documents[0]


        if not documents:

            return {

                "project_name":
                    project_name,

                "question":
                    question,

                "agent":
                    requested_agent,

                "selected_agent":
                    selected_agent,

                "answer": (
                    "I could not find relevant "
                    "information in the uploaded "
                    "documents."
                ),

                "result":
                    None
            }


        # ==================================================
        # PREPARE CONTEXT
        # ==================================================

        context = "\n\n".join(

            str(document)

            for document in documents

            if document

        )


        print(
            "\nRelevant context retrieved "
            "successfully"
        )

        print(
            f"Context length: "
            f"{len(context)} characters"
        )


        # ==================================================
        # AGENT RESULT
        # ==================================================

        agent_result = None

        answer = ""


        # ==================================================
        # CONVERSATIONAL PROJECT INTELLIGENCE
        # ==================================================

        if (
            selected_agent
            ==
            "Conversational Project Intelligence"
        ):

            answer = (
                run_conversational_assistant(
                    question,
                    context,
                    conversation_history
                )
            )


            return {

                "project_name":
                    project_name,

                "question":
                    question,

                "agent":
                    requested_agent,

                "selected_agent":
                    selected_agent,

                "answer":
                    answer,

                "result":
                    None,

                "conversation_supported":
                    True
            }


        # ==================================================
        # PROJECT HEALTH SCORE
        # ==================================================

        elif (
            selected_agent
            ==
            "Project Health Score"
        ):

            print(
                "\nCalculating Project Health..."
            )


            # ----------------------------------------------
            # Run Scope
            # ----------------------------------------------

            print(
                "Running Scope Extraction "
                "for Health Score..."
            )

            scope_result = extract_scope(
                context
            )


            # ----------------------------------------------
            # Run Risk
            # ----------------------------------------------

            print(
                "Running Risk Detection "
                "for Health Score..."
            )

            risk_result = detect_risks(
                context
            )


            # ----------------------------------------------
            # Run Blocker
            # ----------------------------------------------

            print(
                "Running Blocker Detection "
                "for Health Score..."
            )

            blocker_result = (
                identify_blockers_and_actions(
                    context
                )
            )


            # ----------------------------------------------
            # Calculate
            # ----------------------------------------------

            agent_result = (
                calculate_project_health(
                    scope_result,
                    risk_result,
                    blocker_result
                )
            )


            answer = (
                "Project health score calculated "
                "successfully."
            )


        # ==================================================
        # SCOPE AGENT
        # ==================================================

        elif (
            selected_agent
            ==
            "Scope Extraction Agent"
        ):

            print(
                "Running Scope Extraction Agent..."
            )


            agent_result = extract_scope(
                context
            )


            answer = (
                "Scope and deliverable "
                "analysis completed."
            )


        # ==================================================
        # RISK AGENT
        # ==================================================

        elif (
            selected_agent
            ==
            "Risk Detection Agent"
        ):

            print(
                "Running Risk Detection Agent..."
            )


            agent_result = detect_risks(
                context
            )


            answer = (
                "Risk and delivery analysis "
                "completed."
            )


        # ==================================================
        # BLOCKER AGENT
        # ==================================================

        elif (
            selected_agent
            ==
            "Blocker & Action Item Agent"
        ):

            print(
                "Running Blocker & "
                "Action Item Agent..."
            )


            agent_result = (
                identify_blockers_and_actions(
                    context
                )
            )


            answer = (
                "Blocker and action-item "
                "analysis completed."
            )


        # ==================================================
        # DOCUMENTATION AGENT
        # ==================================================

        elif (
            selected_agent
            ==
            "Documentation Generation Agent"
        ):

            print(
                "Running Documentation "
                "Generation Agent..."
            )


            agent_result = (
                generate_documentation(
                    context
                )
            )


            answer = (
                "Project documentation "
                "generated successfully."
            )


        # ==================================================
        # GENERAL ASSISTANT
        # ==================================================

        else:

            print(
                "Running General "
                "Project Assistant..."
            )


            general_prompt = f"""
You are a project intelligence assistant.

Answer the user's question using ONLY
the supplied project context.

Do not invent information.
Do not use outside knowledge.

If the answer is not supported by the
project context, say that the information
is not available in the uploaded project
documents.

Project Context:
{context}

Question:
{question}
"""


            answer = generate_answer(
                general_prompt,
                context
            )


        # ==================================================
        # RETURN RESPONSE
        # ==================================================

        return {

            "project_name":
                project_name,

            "question":
                question,

            "agent":
                requested_agent,

            "selected_agent":
                selected_agent,

            "result":
                agent_result,

            "answer":
                answer
        }


    except HTTPException:

        raise


    except Exception as error:

        print(
            "\nQUESTION ERROR"
        )

        print(
            f"Error message: "
            f"{str(error)}"
        )

        traceback.print_exc()


        raise HTTPException(
            status_code=500,
            detail=(
                f"Question failed: "
                f"{str(error)}"
            )
        )


# ==========================================================
# RUN APPLICATION
# ==========================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=5000,
        reload=True
    )