# 🤖 AI Project Intelligence & Risk Advisor

An AI-powered project intelligence system that uses **Retrieval-Augmented Generation (RAG)** to analyze software project documents and provide relevant project information.

The system accepts project documents in multiple formats, extracts their content, divides the content into smaller chunks, generates vector embeddings, stores them in ChromaDB, and retrieves relevant information based on user queries.

---

## 🎯 Project Objective

Software project information is often distributed across different documents such as project proposals, reports, task lists, meeting notes, and status updates.

The objective of this project is to build a centralized AI-powered platform that can:

- Ingest project documents
- Build a searchable project knowledge base
- Retrieve relevant project information
- Identify project risks and blockers
- Provide project intelligence
- Support project health analysis
- Provide a conversational project assistant

---

## 🚀 Current Milestone 1

The current milestone focuses on implementing the core **RAG knowledge base pipeline**.

### Completed

- PDF document ingestion
- DOCX document ingestion
- CSV document ingestion
- TXT document ingestion
- Text extraction
- Text chunking with overlap
- Sentence Transformer embeddings
- 384-dimensional vector representations
- ChromaDB vector storage
- Semantic similarity retrieval
- Multiple document upload
- Source document tracking
- Streamlit-based user interface

---

## 🧠 RAG Architecture

```text
                Project Documents
                       │
             ┌─────────┴─────────┐
             │                   │
            PDF                DOCX
            CSV                 TXT
             │                   │
             └─────────┬─────────┘
                       ↓
              Document Ingestion
                       ↓
                Text Extraction
                       ↓
                   Chunking
                       ↓
        Sentence Transformer Model
             all-MiniLM-L6-v2
                       ↓
             384D Embeddings
                       ↓
                  ChromaDB
                       ↓
              Semantic Retrieval
                       ↓
             Relevant Project Chunks
