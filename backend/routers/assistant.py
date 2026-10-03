from fastapi import APIRouter
from backend.store import project_store
from backend.models import AskRequest, AskResponse

router = APIRouter(prefix="/api", tags=["assistant"])

@router.get("/scope")
async def get_scope():
    return project_store.scope.model_dump()

@router.post("/ask", response_model=AskResponse)
async def ask_assistant(req: AskRequest):
    question = req.question
    q_lower = question.lower()

    agent_used = "Conversational Router Agent"
    answer = ""
    sources = []

    if any(k in q_lower for k in ["risk", "threat", "severity", "fail", "vulnerability"]):
        agent_used = "Risk Detection Agent"
        if project_store.risks:
            r_list = "\n".join([f"- **{r.id}: {r.title}** ({r.severity}, {r.category}) — Mitigation: {r.mitigation}" for r in project_store.risks[:4]])
            answer = f"Based on analyzed project artifacts, here are key identified risks:\n\n{r_list}\n\nReview the Risk Priority Matrix for full distribution."
            sources = [d.name for d in project_store.documents[:2]]
        else:
            answer = "No active risks are currently detected. Upload your project documents to extract and track project risks."

    elif any(k in q_lower for k in ["blocker", "blocked", "halt", "impediment"]):
        agent_used = "Blocker Agent"
        if project_store.blockers:
            b_list = "\n".join([f"- **{b.id}: {b.title}** ({b.priority}) — {b.description}" for b in project_store.blockers])
            answer = f"Current active project blockers:\n\n{b_list}"
            sources = [d.name for d in project_store.documents[:2]]
        else:
            answer = "No critical blockers are currently logged in the project knowledge base."

    elif any(k in q_lower for k in ["health", "score", "status"]):
        agent_used = "Health Scoring Engine"
        h = project_store.health
        answer = f"The composite project health score is **{h.overall}/100** ({h.status}).\n\n- Risk Score: {h.metrics.riskScore}%\n- Schedule Score: {h.metrics.scheduleScore}%\n- Scope Score: {h.metrics.scopeScore}%\n- Blocker Score: {h.metrics.blockerScore}%\n- Resource Score: {h.metrics.resourceScore}%\n\n{h.summary}"

    else:
        agent_used = "Scope Extraction Agent"
        s = project_store.scope
        answer = f"### Project Intelligence Summary\n\n{s.summary or s.scope or 'Project intelligence compiled from uploaded artifacts.'}\n\n**Key Objectives:**\n" + "\n".join([f"- {o}" for o in s.objectives[:4]])
        sources = [d.name for d in project_store.documents[:2]]

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
