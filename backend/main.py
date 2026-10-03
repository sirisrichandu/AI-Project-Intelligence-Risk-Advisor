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
