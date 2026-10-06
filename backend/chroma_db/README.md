# ChromaDB Persistent Vector Database

This directory (`backend/chroma_db/`) stores the persistent **ChromaDB vector store**:
- `chroma.sqlite3`: Metadata, collections, and inverted indices.
- Vector embeddings generated using `Sentence Transformers (all-MiniLM-L6-v2)`.
- Semantic search collection: `project_knowledge_base`.

### Initializing with Python:
```bash
pip install -r backend/requirements.txt
python -m backend.main
```
ChromaDB will automatically write its persistent index files into this folder.
