# AI Project Intelligence & Risk Advisor

Autonomous multi-agent project intelligence system powered by **Python FastAPI**, **LangGraph StateGraph**, and **Native Persistent ChromaDB**, paired with a **React + Vite** frontend.

---

## 🏛️ Architecture: Single Source of Truth Backend

The backend is exclusively powered by Python FastAPI (`backend/main.py`). The previous TypeScript server implementation has been deprecated and retired.

- **Backend Runtime:** Python 3.10+ with FastAPI & Uvicorn
- **Agent Orchestration:** Python LangGraph (`backend/agents/langgraph_workflow.py`)
- **Vector Database:** Native Persistent ChromaDB (`backend/storage/chroma_db`)
- **Document Processing:** Python PDF, DOCX, CSV, TXT, JSON parser (`backend/document_parser.py`)
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS

---

## 🚀 Getting Started

### 1. Install Backend Dependencies
```bash
python3 -m pip install -r backend/requirements.txt
```

### 2. Start the FastAPI Backend
```bash
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload
```
Interactive API docs available at: `http://localhost:8001/docs`

### 3. Start the Frontend
```bash
# In another terminal:
npm install
npm run dev
```
The frontend starts on port 3000 and proxies `/api` requests directly to FastAPI (`http://127.0.0.1:8001`), or can be configured with:
```bash
VITE_API_BASE_URL=http://localhost:8001
```

---

## 🧪 Automated Testing

Run the full pytest suite verifying endpoints, ChromaDB indexing, LangGraph workflows, and RAG retrieval:
```bash
python3 -m pytest backend/tests/test_backend.py -v
```

---

## 📡 Core API Endpoints (FastAPI)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health-check` | System status & runtime verification |
| `GET` | `/api/project/summary` | Executive dashboard KPI metrics |
| `GET` | `/api/documents` | Ingested documents list & chunk counts |
| `POST` | `/api/upload-json` | Document ingestion with ChromaDB vectorization |
| `POST` | `/api/upload` | Multipart file upload (PDF/DOCX/CSV/TXT) |
| `DELETE` | `/api/documents/{id}` | Delete document & cascade remove vectors |
| `GET` | `/api/documents/{id}/download` | Download original document content |
| `POST` | `/api/knowledge-base/search` | ChromaDB semantic vector search |
| `POST` | `/api/pipeline/run` | Python LangGraph multi-agent pipeline |
| `GET` | `/api/scope` | Extracted deliverables, milestones, deadlines |
| `GET` | `/api/risks` | Risk register and 5x5 priority matrix |
| `GET` | `/api/blockers` | Active project impediments |
| `GET` | `/api/actions` | Action items and tasks at risk |
| `GET` | `/api/health` | 5-dimension composite health breakdown |
| `GET` | `/api/reports` | Dossiers and intelligence reports |
| `POST` | `/api/reports/generate` | Generate executive dossier |
| `POST` | `/api/ask` | Conversational RAG Q&A with source citations |
| `POST` | `/api/project/reset` | Purge workspace and reset ChromaDB |
