import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import (
    documents,
    pipeline,
    risks,
    blockers,
    actions,
    health,
    reports,
    assistant,
    knowledge_base,
)

app = FastAPI(
    title="AI Project Intelligence & Risk Advisor API",
    description="High-performance FastAPI backend for multi-agent project document intelligence, risk registers, and automated documentation dossiers.",
    version="1.0.0",
)

# Enable CORS for Vite frontend and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all feature routers
app.include_router(documents.router)
app.include_router(pipeline.router)
app.include_router(risks.router)
app.include_router(blockers.router)
app.include_router(actions.router)
app.include_router(health.router)
app.include_router(reports.router)
app.include_router(assistant.router)
app.include_router(knowledge_base.router)

@app.get("/api/project/summary")
async def get_project_summary():
    from backend.store import project_store
    active_blockers = len([b for b in project_store.blockers if getattr(b, 'status', 'Active') == "Active"])
    pending_actions = len([a for a in project_store.actions if getattr(a, 'status', 'Pending') in ["Pending", "In Progress"]])
    critical_risks = len([r for r in project_store.risks if r.severity == "Critical"])
    high_risks = len([r for r in project_store.risks if r.severity == "High"])

    project_name = (
        project_store.documents[0].name.rsplit(".", 1)[0].replace("-", " ").replace("_", " ")
        if project_store.documents
        else "Project Workspace"
    )
    project_deadline = (
        project_store.scope.deadlines[0]
        if project_store.scope.deadlines
        else ("Under Evaluation" if project_store.documents else "Ready For Upload")
    )

    return {
        "projectName": project_name,
        "projectDeadline": project_deadline,
        "healthScore": project_store.health.overall,
        "healthStatus": project_store.health.status,
        "totalDocuments": len(project_store.documents),
        "totalRisks": len(project_store.risks),
        "criticalRisks": critical_risks,
        "highRisks": high_risks,
        "activeBlockers": active_blockers,
        "pendingActions": pending_actions,
        "upcomingDeadlines": len(project_store.scope.deadlines),
    }

@app.post("/api/project/reset")
async def reset_project():
    from backend.store import project_store
    project_store.clear_all()
    return {
        "message": "Project workspace reset to clean initial state.",
        "health": project_store.health.model_dump(),
    }

@app.get("/api/conflicts")
async def get_conflicts():
    return {"conflicts": []}

@app.get("/api/chat/history")
async def get_chat_history():
    from backend.store import project_store
    return {"messages": [m.model_dump() for m in project_store.chat_history]}

@app.post("/api/chat/clear")
async def clear_chat_history():
    from backend.store import project_store
    project_store.chat_history = []
    return {"message": "Chat history cleared"}

@app.get("/api/health-check")
async def health_check():
    return {
        "status": "online",
        "runtime": "FastAPI (Python 3.10)",
        "framework": "FastAPI + Pydantic v2",
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
