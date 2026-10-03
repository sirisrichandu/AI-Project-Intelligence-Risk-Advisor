# AI Project Intelligence & Risk Advisor — FastAPI Backend

High-performance Python backend built with **FastAPI**, **Pydantic v2**, and **Uvicorn**, providing autonomous multi-agent project intelligence, vector RAG document processing, risk registers, and automated documentation dossier generation.

---

## 🚀 Quickstart

### 1. Prerequisites
- Python 3.10+
- `pip` or virtualenv

### 2. Install Dependencies
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run Development Server
```bash
# From workspace root:
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The server will be live at:
- **API Base:** `http://localhost:8000/api`
- **Interactive Swagger UI:** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`

---

## 📁 Architecture Overview

```
backend/
├── main.py                     # FastAPI entrypoint & CORS configuration
├── models.py                   # Pydantic v2 data schemas
├── store.py                    # Thread-safe in-memory project intelligence store
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Production container definition
├── agents/                     # Multi-Agent Intelligence Engines
│   ├── scope_agent.py          # Scope, objectives & requirements extraction
│   ├── risk_agent.py           # Risk detection, probability/impact scoring
│   ├── blocker_action_agent.py # Blocker & mitigation action item extraction
│   ├── health_engine.py        # 5-dimension composite health score engine
│   └── doc_gen_agent.py        # User stories & master dossier synthesizer
└── routers/                    # REST API Endpoints
    ├── documents.py            # Upload, list, delete, and clear documents
    ├── pipeline.py             # Multi-agent autonomous pipeline execution
    ├── risks.py                # Risk registers & priority matrix coordinates
    ├── blockers.py             # Active project impediments
    ├── actions.py              # Mitigation actions & tasks at risk
    ├── health.py               # Composite health metrics & historical trend
    ├── reports.py              # Synthesized dossiers & report generation
    └── assistant.py            # Conversational AI assistant with agent routing
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/documents` | Retrieve all ingested project documents |
| `POST` | `/api/upload-json` | Upload and vectorize batch project documents |
| `DELETE` | `/api/documents` | Clear all documents from the knowledge base |
| `POST` | `/api/pipeline/run` | Execute autonomous multi-agent analysis pipeline |
| `GET` | `/api/risks` | Retrieve risks & priority matrix coordinates |
| `GET` | `/api/blockers` | Retrieve active project blockers |
| `GET` | `/api/actions` | Retrieve assigned action items & tasks at risk |
| `GET` | `/api/health` | Get composite 0-100 project health breakdown |
| `GET` | `/api/documentation/latest` | Retrieve synthesized User Stories & Risk Dossier |
| `POST` | `/api/ask` | Natural language conversational Q&A with agent routing |

---

## 🐳 Docker Deployment

```bash
docker build -t project-intelligence-fastapi -f backend/Dockerfile .
docker run -p 8000:8000 project-intelligence-fastapi
```
