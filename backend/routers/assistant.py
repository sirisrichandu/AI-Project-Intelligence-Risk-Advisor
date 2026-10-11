import re
from typing import List, Optional
from fastapi import APIRouter
from backend.store import project_store
from backend.models import AskRequest, AskResponse
from backend.chroma_service import chroma_service

router = APIRouter(prefix="/api", tags=["assistant"])

@router.get("/scope")
async def get_scope():
    if not project_store.scope.objectives and project_store.documents:
        from backend.routers.documents import auto_extract_project_intelligence
        auto_extract_project_intelligence()
    return project_store.scope.model_dump()

@router.post("/ask", response_model=AskResponse)
async def ask_assistant(req: AskRequest):
    question = (req.query or req.question or "").strip()
    if not question:
        return AskResponse(
            answer="Please provide a question or search query regarding your project documents.",
            agentUsed="Conversational Router Agent",
            sources=[],
            suggestedFollowUps=["What are the highest priority risks?", "Summarize project scope and milestones."]
        )

    q_lower = question.lower()
    q_tokens = [w for w in re.findall(r"[a-zA-Z0-9_-]+", q_lower) if len(w) > 2 and w not in {"the", "and", "for", "with", "what", "how", "are", "about", "this", "that"}]

    # 1. Semantic & lexical RAG context retrieval via ChromaDB persistent store
    retrieved_chunks = chroma_service.query_similarity(question, top_k=5)
    sources = []
    if retrieved_chunks:
        for chunk in retrieved_chunks:
            doc_name = chunk.get("document_name")
            if doc_name and doc_name not in sources and doc_name != "Unknown":
                sources.append(doc_name)

    # Filter chunks that have genuine token overlap or sufficient similarity score
    matched_chunks = []
    for c in retrieved_chunks:
        c_text = c.get("text", "")
        c_lower = c_text.lower()
        score = c.get("similarity_score", 0) or c.get("score", 0)
        token_matches = sum(1 for tok in q_tokens if tok in c_lower) if q_tokens else 0
        if token_matches > 0 or score >= 0.40:
            matched_chunks.append({
                "chunk": c,
                "token_matches": token_matches,
                "score": score,
            })

    matched_chunks.sort(key=lambda x: (x["token_matches"], x["score"]), reverse=True)

    # 2. Evidence-grounded answer generation
    if matched_chunks:
        agent_used = "Extractive RAG Evidence Agent"
        evidence_sections = []
        for idx, item in enumerate(matched_chunks[:3]):
            chunk_data = item["chunk"]
            c_text = chunk_data.get("text", "").strip()
            doc_name = chunk_data.get("document_name", "Indexed Document")
            page = chunk_data.get("page", 1)

            # Extract the most relevant sentences
            sentences = re.split(r"(?<=[.!?\n])\s+", c_text)
            relevant_sentences = [
                s.strip() for s in sentences
                if any(tok in s.lower() for tok in q_tokens)
            ] if q_tokens else sentences[:2]

            key_excerpt = " ".join(relevant_sentences[:3]) if relevant_sentences else c_text[:280]
            if len(key_excerpt) < 40 and len(c_text) >= 40:
                key_excerpt = c_text[:280]

            evidence_sections.append(
                f"**Evidence Excerpt {idx + 1}** *(from `{doc_name}`, Page {page})*:\n"
                f"> \"{key_excerpt.strip()}\""
            )

        answer = (
            f"### Extractive Document Evidence\n\n"
            f"Based on the retrieved content from your uploaded project artifacts, here is the relevant factual evidence:\n\n"
            + "\n\n".join(evidence_sections)
            + f"\n\n---\n*Grounded directly in {len(evidence_sections)} indexed knowledge chunk(s). No unverified external facts were introduced.*"
        )

    elif any(k in q_lower for k in ["health", "composite health", "health score"]) and not q_tokens - {"health", "score", "status", "project"}:
        agent_used = "Health Scoring Engine"
        h = project_store.health
        answer = (
            f"### Composite Project Health Assessment\n\n"
            f"Overall Health: **{h.overall}/100** ({h.status})\n\n"
            f"- Risk Factor Score: {h.metrics.riskScore}%\n"
            f"- Schedule Adherence: {h.metrics.scheduleScore}%\n"
            f"- Scope Clarity: {h.metrics.scopeScore}%\n"
            f"- Blocker Resolution: {h.metrics.blockerScore}%\n"
            f"- Resource Capacity: {h.metrics.resourceScore}%\n\n"
            f"**Executive Assessment:** {h.summary}"
        )
        if not sources and project_store.documents:
            sources = [d.name for d in project_store.documents[:2]]

    elif any(k in q_lower for k in ["risk", "risks", "threat"]) and not (set(q_tokens) - {"risk", "risks", "threat", "what", "project"}):
        agent_used = "Risk Detection Agent"
        if project_store.risks:
            r_list = "\n".join([f"- **{r.id}: {r.title}** ({r.severity}, {r.category}) — Mitigation: {r.mitigation}" for r in project_store.risks[:5]])
            answer = f"### Active Project Risk Register\n\nBased on ingested project artifacts, the following risks are registered:\n\n{r_list}\n\nReview the Risk Priority Matrix for full distribution."
            if not sources:
                sources = [d.name for d in project_store.documents[:2]]
        else:
            answer = "No active risks are currently registered in the project store. Upload project documents to extract and track risks."

    elif any(k in q_lower for k in ["blocker", "blockers", "impediment"]) and not (set(q_tokens) - {"blocker", "blockers", "what", "project"}):
        agent_used = "Blocker Identification Agent"
        if project_store.blockers:
            b_list = "\n".join([f"- **{b.id}: {b.title}** ({b.priority}) — Owner: {b.owner}\n  *Description:* {b.description}\n  *Resolution:* {b.suggestedResolution}" for b in project_store.blockers[:4]])
            answer = f"### Active Project Blockers\n\nIdentified delivery impediments:\n\n{b_list}"
            if not sources:
                sources = [d.name for d in project_store.documents[:2]]
        else:
            answer = "No active blockers are currently recorded in the project store."

    else:
        # No relevant evidence found in the uploaded documents
        agent_used = "Extractive RAG Retrieval Engine"
        if not project_store.documents:
            answer = (
                "The project knowledge base is currently empty. "
                "Upload your project documents (PDF, DOCX, XLSX, CSV, TXT) to extract verifiable facts and ask questions."
            )
        else:
            answer = (
                f"No relevant evidence was found in the indexed project documents for query: **\"{question}\"**.\n\n"
                f"The indexed artifacts ({', '.join([d.name for d in project_store.documents[:3]])}) "
                f"do not contain matching statements. Please verify that the pertinent document section is uploaded."
            )
        sources = []

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
