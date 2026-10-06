# ChromaDB Vector Store Directory

This folder (`chroma_db/`) is the local persistent storage directory for **ChromaDB**.

When the FastAPI backend processes uploaded project artifacts (PDF, DOCX, CSV, TXT), it stores:
1. **`chroma.sqlite3`**: SQLite database maintaining vector collection metadata, documents, and inverted indices.
2. **Dense Embeddings Index**: Vector indices generated using `sentence-transformers` for fast top-k cosine similarity queries and RAG retrieval.

### How to use with Python:
```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --port 8000
```
ChromaDB will automatically write its persistent collections to this directory.
