# AI Project Intelligence & Risk Advisor

An AI-powered project intelligence platform that analyzes software project documents using Retrieval-Augmented Generation (RAG) to provide project insights, risks, blockers, and delivery intelligence.

## Project Overview

Software project information is often scattered across multiple documents such as project proposals, reports, task lists, meeting notes, and status updates.

This project builds a unified knowledge base from these documents and uses RAG-based retrieval to identify relevant project information.

## Milestone 1

Milestone 1 focuses on building the document ingestion and RAG knowledge base.

### Implemented Features

- PDF document ingestion
- DOCX document ingestion
- CSV document ingestion
- TXT document ingestion
- Text extraction
- Text chunking
- Sentence Transformer embeddings
- 384-dimensional embeddings
- FAISS vector indexing
- Persistent knowledge base
- Semantic similarity search
- Multiple document upload
- Source-aware retrieval results
- Flask-based web interface

## RAG Architecture

```text
User
  ↓
Flask Web Interface
  ↓
Document Upload
  ↓
Document Ingestion
  ↓
PDF / DOCX / CSV / TXT
  ↓
Text Extraction
  ↓
Text Chunking
  ↓
Sentence Transformer
(all-MiniLM-L6-v2)
  ↓
384-Dimensional Embeddings
  ↓
FAISS Vector Store
  ↓
Semantic Retrieval
  ↓
Relevant Project Chunks