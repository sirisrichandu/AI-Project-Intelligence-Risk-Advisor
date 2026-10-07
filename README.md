# 🤖 AI Project Intelligence & Risk Advisor

An AI-powered project intelligence system that analyzes software project documents and transforms scattered project information into **actionable insights**.

The system uses **Retrieval-Augmented Generation (RAG), document processing, and AI agents** to extract project scope, identify risks and blockers, generate action items, calculate project health, generate project documents, and provide a conversational project assistant.

---

## 🎯 Project Objective

Software project information is often scattered across multiple documents such as:

- Project proposals
- Requirements documents
- Task lists
- Meeting notes
- Status reports
- Risk documents
- Project updates

Manually reviewing these documents makes it difficult to quickly understand the current state of a project.

The objective of this project is to build a centralized AI-powered platform that can:

- 📄 Ingest project documents
- 🔍 Extract and organize project information
- 🧠 Build a searchable project knowledge base
- 🎯 Extract project scope and requirements
- ⚠️ Detect project risks
- 🚧 Identify blockers
- ✅ Generate action items
- 📊 Calculate project health
- 📝 Generate project-related documents
- 💬 Provide a conversational project assistant

---

# 🚀 Key Features

## 1. 📄 Multi-Format Document Ingestion

The system supports project documents in multiple formats:

- PDF
- DOCX
- CSV
- TXT

Uploaded documents are processed automatically and their content is extracted for further analysis.

---

## 2. 🧠 RAG-Based Knowledge Retrieval

The project uses **Retrieval-Augmented Generation (RAG)** to retrieve relevant information from uploaded project documents.

The RAG pipeline includes:

1. Document ingestion
2. Text extraction
3. Text chunking
4. Embedding generation
5. Vector storage
6. Semantic retrieval
7. Relevant context generation

This allows the system to answer project-related questions based on the uploaded documents.

---

## 3. 🤖 AI-Powered Project Analysis

The system automatically analyzes project documents to extract important project intelligence.

### Scope Extraction

Identifies information such as:

- Project scope
- Requirements
- Deliverables
- User stories
- Project milestones

### Risk Detection

Identifies potential project risks such as:

- Schedule risks
- Resource risks
- Technical risks
- Dependency risks
- Requirement-related risks

### Blocker & Action Item Detection

Identifies:

- Current blockers
- Pending tasks
- Action items
- Responsible owners
- Status information

---

## 4. 📊 Project Health Score

The system provides an overall **Project Health Score** based on the information extracted from project documents.

The health analysis helps provide a quick understanding of whether a project is:

- 🟢 Healthy
- 🟡 At Risk
- 🔴 Critical

The score is generated using project indicators such as risks, blockers, actions, and project status.

---

## 5. 📝 Document Generation

The system can generate structured project documents from the analyzed project information.

Examples include:

- User Stories
- Risk Register
- Action Items

This reduces the need to manually prepare project documentation from multiple source files.

---

## 6. 💬 Conversational Project Assistant

The system provides a conversational interface where users can ask questions about their project.

Example questions:

```text
What is the project deadline?

What are the current project risks?

What are the major blockers?

What action items are pending?

Who is responsible for the pending actions?

What is the current project health?
```

The assistant retrieves relevant information from the project knowledge base and provides contextual answers.

---

# 🏗️ System Architecture

```text
                    Project Documents
                           │
             ┌─────────────┼─────────────┐
             │             │             │
            PDF           DOCX          CSV/TXT
             │             │             │
             └─────────────┴─────────────┘
                           │
                           ▼
                 Document Ingestion
                           │
                           ▼
                  Text Extraction
                           │
                           ▼
                      Chunking
                           │
                           ▼
                Embedding Generation
                           │
                           ▼
                    Vector Store
                           │
                           ▼
                  Semantic Retrieval
                           │
                           ▼
                  ┌─────────────────┐
                  │   AI Analysis   │
                  └─────────────────┘
                           │
       ┌───────────┬───────┼────────┬────────────┐
       ▼           ▼       ▼        ▼            ▼
     Scope       Risk    Blockers  Health     Document
    Analysis   Detection  & Actions Score     Generation
       │           │       │        │            │
       └───────────┴───────┴────────┴────────────┘
                           │
                           ▼
                Conversational Assistant
                           │
                           ▼
                     User Interface
```

---

# 🤖 AI Analysis Modules

The project includes specialized analysis modules for different project intelligence tasks.

| Module | Responsibility |
|---|---|
| Scope Analysis | Extract project scope, requirements and deliverables |
| Risk Detection | Identify potential project risks |
| Blocker & Action Analysis | Identify blockers and pending actions |
| Health Engine | Calculate overall project health |
| Document Generation | Generate structured project documents |
| Conversational Assistant | Answer project-related questions |

---

# 💻 Technology Stack

## Frontend

- React
- TypeScript
- Vite
- HTML
- CSS

## Backend

- Node.js
- TypeScript
- Express / API services
- Python-based AI components where required

## AI / Machine Learning

- Retrieval-Augmented Generation (RAG)
- Sentence Transformers
- `all-MiniLM-L6-v2`
- Vector embeddings
- Semantic search
- ChromaDB / vector storage

## Document Processing

- PDF processing
- DOCX processing
- CSV processing
- TXT processing

## Development Tools

- Git
- GitHub
- VS Code
- npm

---

# 📂 Project Structure

```text
AI-Project-Intelligence-Risk-Advisor/
│
├── backend/
│   ├── agents/
│   │   ├── scope_agent.py
│   │   ├── risk_agent.py
│   │   ├── blocker_action_agent.py
│   │   ├── doc_gen_agent.py
│   │   └── health_engine.py
│   │
│   ├── main.py
│   ├── models.py
│   ├── store.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── components/
│   └── ...
│
├── ingestion/
│
├── rag/
│
├── server.ts
├── package.json
├── README.md
└── ...
```

> The exact folder structure may change as the project evolves.

---

# 🔄 Project Workflow

```text
Upload Project Documents
          ↓
Document Processing
          ↓
Content Extraction
          ↓
Knowledge Base Creation
          ↓
AI Analysis Pipeline
          ↓
 ┌────────┼─────────┬──────────┐
 ↓        ↓         ↓          ↓
Scope    Risks    Blockers   Actions
          ↓
     Health Analysis
          ↓
  Document Generation
          ↓
Conversational Assistant
          ↓
      Project Insights
```

---

# 📈 Project Intelligence Output

The platform converts unstructured project documents into structured information such as:

### Project Scope

- Requirements
- Deliverables
- User stories
- Milestones

### Risk Register

- Risk description
- Risk category
- Impact
- Priority
- Mitigation information

### Action Items

- Action description
- Owner
- Status
- Priority
- Due information

### Project Health

- Overall health score
- Risk indicators
- Blocker indicators
- Project status

---

# 🎯 Why This Project?

Traditional project management requires team members to manually read multiple documents to understand project status.

This system aims to reduce that effort by using AI to:

> **Read → Understand → Analyze → Summarize → Generate → Assist**

Instead of searching through multiple documents manually, users can interact with a centralized AI-powered project intelligence platform.

---

# 🚀 Future Enhancements

Possible future improvements include:

- Advanced project analytics
- More document formats
- Improved risk prediction
- Historical project comparison
- Role-based access control
- Real-time project monitoring
- Advanced dashboard visualizations
- Integration with project management platforms

---

# 👨‍💻 Project Status

**Status:** 🚧 Under Active Development

The project has progressed from a basic RAG knowledge-base prototype to an AI-powered project intelligence platform with automated project analysis and multiple AI capabilities.

---

# 📌 Project Highlights

- ✅ Multi-format document ingestion
- ✅ RAG-based knowledge retrieval
- ✅ Semantic search
- ✅ Automated scope extraction
- ✅ Risk detection
- ✅ Blocker identification
- ✅ Action item generation
- ✅ Project health scoring
- ✅ Project document generation
- ✅ Conversational project assistant
- ✅ React-based user interface
- ✅ Modular AI architecture

---


