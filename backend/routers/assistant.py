from fastapi import APIRouter
from backend.store import project_store
from backend.models import AskRequest, AskResponse
from backend.chroma_service import chroma_service

router = APIRouter(prefix="/api", tags=["assistant"])

@router.get("/scope")
async def get_scope():
    return project_store.scope.model_dump()

@router.post("/ask", response_model=AskResponse)
async def ask_assistant(req: AskRequest):
    question = (req.query or req.question or "").strip()
    q_lower = question.lower()

    agent_used = "Conversational Router Agent"
    answer = ""
    sources = []

    # 1. Semantic RAG context retrieval via native ChromaDB
    retrieved_chunks = chroma_service.query_similarity(question, top_k=4)
    if retrieved_chunks:
        for chunk in retrieved_chunks:
            doc_name = chunk.get("document_name")
            if doc_name and doc_name not in sources and doc_name != "Unknown":
                sources.append(doc_name)

    if any(k in q_lower for k in ["risk", "threat", "severity", "fail", "vulnerability"]):
        agent_used = "Risk Detection Agent"
        if project_store.risks:
            r_list = "\n".join([f"- **{r.id}: {r.title}** ({r.severity}, {r.category}) — Mitigation: {r.mitigation}" for r in project_store.risks[:4]])
            answer = f"Based on analyzed project artifacts, here are key identified risks:\n\n{r_list}\n\nReview the Risk Priority Matrix for full distribution."
            if not sources:
                sources = [d.name for d in project_store.documents[:2]]
        else:
            answer = "No active risks are currently detected. Upload your project documents to extract and track project risks."

    elif any(k in q_lower for k in ["blocker", "blocked", "halt", "impediment"]):
        agent_used = "Blocker Agent"
        if project_store.blockers:
            b_list = "\n".join([f"- **{b.id}: {b.title}** ({b.priority}) — {b.description}" for b in project_store.blockers])
            answer = f"Current active project blockers:\n\n{b_list}"
            if not sources:
                sources = [d.name for d in project_store.documents[:2]]
        else:
            answer = "No critical blockers are currently logged in the project knowledge base."

    elif any(k in q_lower for k in ["health", "score", "status"]):
        agent_used = "Health Scoring Engine"
        h = project_store.health
        answer = f"The composite project health score is **{h.overall}/100** ({h.status}).\n\n- Risk Score: {h.metrics.riskScore}%\n- Schedule Score: {h.metrics.scheduleScore}%\n- Scope Score: {h.metrics.scopeScore}%\n- Blocker Score: {h.metrics.blockerScore}%\n- Resource Score: {h.metrics.resourceScore}%\n\n{h.summary}"
        if not sources and project_store.documents:
            sources = [d.name for d in project_store.documents[:2]]

    elif retrieved_chunks and any(c.get("similarity_score", 0) > 0.4 for c in retrieved_chunks):
        agent_used = "RAG Context Synthesizer Agent"
        top_chunk = retrieved_chunks[0]
        context_preview = "\n\n".join([f"> *\"{c.get('text', '')[:160]}...\"* (from **{c.get('document_name', 'Artifact')}**)" for c in retrieved_chunks[:2]])
        answer = f"Found relevant project information matching your inquiry:\n\n{context_preview}\n\nAll relevant deliverables and specifications are cataloged in the knowledge base."

    else:
        agent_used = "Scope Extraction Agent"
        s = project_store.scope
        answer = f"### Project Intelligence Summary\n\n{s.summary or s.scope or 'Project intelligence compiled from uploaded artifacts.'}\n\n**Key Objectives:**\n" + "\n".join([f"- {o}" for o in s.objectives[:4]])
        if not sources and project_store.documents:
            sources = [d.name for d in project_store.documents[:2]]

    # Store in chat history
    from backend.models import ChatMessageItem
    from datetime import datetime
    chat_item = ChatMessageItem(
        id=f"msg-{len(project_store.chat_history) + 1}",
        sender="assistant",
        text=answer,
        timestamp=datetime.now().strftime("%H:%M"),
        agentUsed=agent_used,
        sources=sources,
    )
    project_store.chat_history.append(chat_item)

    return AskResponse(
        answer=answer,
        agentUsed=agent_used,
        sources=sources,
        suggestedFollowUps=[
            "What are the top 3 critical risks?",
            "How can we improve the composite health score?",
            "What blockers need immediate escalation?",
        ]
    )
