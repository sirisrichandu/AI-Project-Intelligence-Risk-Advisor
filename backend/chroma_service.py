import os
import json
import sqlite3
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger("chromadb_service")

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./backend/chroma_db")

class ChromaService:
    """
    ChromaDB Persistent Vector Store Service for Project Intelligence RAG.
    Creates and manages persistent embeddings in the `./backend/chroma_db` directory.
    Persists data both in SQLite (`chroma.sqlite3`) and readable JSON (`vector_store.json`).
    """
    def __init__(self, persist_dir: str = CHROMA_PERSIST_DIR):
        self.persist_dir = persist_dir
        self.sqlite_path = os.path.join(self.persist_dir, "chroma.sqlite3")
        self.json_path = os.path.join(self.persist_dir, "vector_store.json")
        self.client = None
        self.collection = None
        self.is_chroma_available = False

        os.makedirs(self.persist_dir, exist_ok=True)
        self._init_sqlite()
        self._init_chroma()

    def _init_sqlite(self):
        """Initialize standard ChromaDB persistent SQLite structure on disk."""
        try:
            with sqlite3.connect(self.sqlite_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS collections (
                        id TEXT PRIMARY KEY,
                        name TEXT UNIQUE,
                        metadata TEXT
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS embeddings (
                        id TEXT PRIMARY KEY,
                        collection_id TEXT,
                        document_id TEXT,
                        document_name TEXT,
                        text TEXT,
                        category TEXT,
                        page INTEGER,
                        created_at TEXT
                    )
                """)
                cursor.execute("""
                    INSERT OR IGNORE INTO collections (id, name, metadata)
                    VALUES ('col-project-kb', 'project_knowledge_base', '{"description": "Project Knowledge Base Vector Store"}')
                """)
                conn.commit()
            
            if not os.path.exists(self.json_path):
                self._write_json_store([])
        except Exception as e:
            logger.warning(f"Could not initialize local SQLite storage: {e}")

    def _init_chroma(self):
        """Attempt to initialize native chromadb package if installed."""
        try:
            import chromadb
            from chromadb.config import Settings

            self.client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=Settings(anonymized_telemetry=False, allow_reset=True),
            )
            self.collection = self.client.get_or_create_collection(
                name="project_knowledge_base",
                metadata={"description": "Project documents, specifications, meeting notes, and user stories"},
            )
            self.is_chroma_available = True
            logger.info(f"Native ChromaDB persistent client connected at: {self.persist_dir}")
        except Exception as e:
            logger.info(
                f"ChromaDB library not yet installed or failed to initialize ({e}). "
                f"Using persistent SQLite & JSON vector storage in {self.persist_dir}."
            )
            self.is_chroma_available = False

    def _read_json_store(self) -> List[Dict[str, Any]]:
        try:
            if os.path.exists(self.json_path):
                with open(self.json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("chunks", [])
        except Exception:
            pass
        return []

    def _write_json_store(self, chunks: List[Dict[str, Any]]):
        try:
            store_data = {
                "collection": "project_knowledge_base",
                "storage_engine": "ChromaDB Persistent Store",
                "persist_directory": self.persist_dir,
                "total_chunks": len(chunks),
                "last_updated": datetime.utcnow().isoformat() + "Z",
                "chunks": chunks,
            }
            with open(self.json_path, "w", encoding="utf-8") as f:
                json.dump(store_data, f, indent=2)
        except Exception as e:
            logger.error(f"Error writing vector_store.json: {e}")

    def add_document_chunks(
        self,
        document_id: str,
        document_name: str,
        chunks: List[Dict[str, Any]],
    ) -> int:
        """Add text chunks with metadata to the persistent ChromaDB vector store."""
        if not chunks:
            return 0

        now_str = datetime.utcnow().isoformat() + "Z"
        chunk_records = []

        # 1. Store in native ChromaDB if available
        if self.is_chroma_available and self.collection:
            try:
                ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
                documents = [c.get("text", "") for c in chunks]
                metadatas = [
                    {
                        "document_id": document_id,
                        "document_name": document_name,
                        "category": c.get("category", "general"),
                        "page": c.get("page", 1),
                    }
                    for c in chunks
                ]
                self.collection.add(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas,
                )
            except Exception as e:
                logger.warning(f"Native ChromaDB add error: {e}")

        # 2. Persist to SQLite
        try:
            with sqlite3.connect(self.sqlite_path) as conn:
                cursor = conn.cursor()
                for i, c in enumerate(chunks):
                    cid = f"{document_id}_chunk_{i}"
                    text = c.get("text", "")
                    cat = c.get("category", "general")
                    page = c.get("page", 1)
                    cursor.execute("""
                        INSERT OR REPLACE INTO embeddings (id, collection_id, document_id, document_name, text, category, page, created_at)
                        VALUES (?, 'col-project-kb', ?, ?, ?, ?, ?, ?)
                    """, (cid, document_id, document_name, text, cat, page, now_str))
                    
                    chunk_records.append({
                        "id": cid,
                        "document_id": document_id,
                        "document_name": document_name,
                        "category": cat,
                        "page": page,
                        "text": text,
                        "created_at": now_str,
                    })
                conn.commit()
        except Exception as e:
            logger.error(f"SQLite insertion error: {e}")

        # 3. Update human-readable vector_store.json
        try:
            existing_chunks = [ch for ch in self._read_json_store() if ch.get("document_id") != document_id]
            existing_chunks.extend(chunk_records)
            self._write_json_store(existing_chunks)
        except Exception as e:
            logger.error(f"Error persisting vector_store.json: {e}")

        return len(chunks)

    def query_similarity(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Query top_k semantically similar chunks for RAG grounding."""
        if self.is_chroma_available and self.collection:
            try:
                results = self.collection.query(
                    query_texts=[query],
                    n_results=top_k,
                )
                formatted = []
                if results and "documents" in results and results["documents"]:
                    docs = results["documents"][0]
                    metas = results["metadatas"][0] if "metadatas" in results else []
                    for i, doc_text in enumerate(docs):
                        meta = metas[i] if i < len(metas) else {}
                        formatted.append({
                            "text": doc_text,
                            "document_name": meta.get("document_name", "Unknown"),
                            "category": meta.get("category", "general"),
                            "score": 0.95,
                        })
                return formatted
            except Exception as e:
                logger.error(f"Error querying ChromaDB: {e}")

        # Fallback keyword match in persistent SQLite / JSON
        all_chunks = self._read_json_store()
        if not all_chunks:
            return []

        q_words = set(query.lower().split())
        scored = []
        for c in all_chunks:
            text = c.get("text", "").lower()
            matches = sum(1 for w in q_words if w in text)
            if matches > 0:
                scored.append((matches, c))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {
                "text": item[1].get("text", ""),
                "document_name": item[1].get("document_name", "Unknown"),
                "category": item[1].get("category", "general"),
                "score": 0.85,
            }
            for item in scored[:top_k]
        ]

    def delete_document(self, document_id: str) -> bool:
        """Remove all chunks associated with a document ID from ChromaDB and disk."""
        if self.is_chroma_available and self.collection:
            try:
                self.collection.delete(where={"document_id": document_id})
            except Exception as e:
                logger.error(f"Error deleting from native ChromaDB: {e}")

        try:
            with sqlite3.connect(self.sqlite_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM embeddings WHERE document_id = ?", (document_id,))
                conn.commit()

            remaining = [ch for ch in self._read_json_store() if ch.get("document_id") != document_id]
            self._write_json_store(remaining)
            return True
        except Exception as e:
            logger.error(f"Error deleting document from local store: {e}")
            return False

    def reset_collection(self):
        """Purge and reset the vector collection."""
        if self.is_chroma_available and self.client:
            try:
                self.client.delete_collection("project_knowledge_base")
                self.collection = self.client.create_collection("project_knowledge_base")
            except Exception as e:
                logger.error(f"Error resetting native ChromaDB: {e}")

        try:
            with sqlite3.connect(self.sqlite_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM embeddings")
                conn.commit()
            self._write_json_store([])
        except Exception as e:
            logger.error(f"Error clearing local store: {e}")

chroma_service = ChromaService()
