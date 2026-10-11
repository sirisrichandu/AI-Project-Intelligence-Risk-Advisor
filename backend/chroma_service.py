import os
import json
import sqlite3
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger("chromadb_service")

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./backend/storage/chroma_db")

class ChromaService:
    """
    Native ChromaDB Persistent Vector Store Service for Project Intelligence RAG.
    Creates and manages persistent embeddings in the configured directory (`./backend/storage/chroma_db` by default).
    Persists native ChromaDB collections, SQLite index, and human-readable metadata.
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
        """Initialize local metadata store if not present."""
        try:
            if not os.path.exists(self.json_path):
                self._write_json_store([])
        except Exception as e:
            logger.warning(f"Could not initialize local storage: {e}")

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
            seen_docs = {}
            for c in chunks:
                doc_id = c.get("document_id")
                if doc_id and doc_id not in seen_docs:
                    doc_name = c.get("document_name", "Document")
                    ext = doc_name.split(".")[-1].upper() if "." in doc_name else "TXT"
                    seen_docs[doc_id] = {
                        "id": doc_id,
                        "name": doc_name,
                        "type": ext,
                        "size": f"{max(1, round(len(c.get('text', '')) / 1024))} KB",
                        "category": c.get("category", "general"),
                        "chunkCount": 1,
                        "uploadDate": c.get("created_at", datetime.utcnow().isoformat())[:10],
                        "status": "COMPLETED",
                    }
                elif doc_id in seen_docs:
                    seen_docs[doc_id]["chunkCount"] += 1

            doc_list = list(seen_docs.values())
            store_data = {
                "collection": "project_knowledge_base",
                "storage_engine": "ChromaDB Persistent Store",
                "persist_directory": self.persist_dir,
                "total_chunks": len(chunks),
                "total_documents": len(doc_list),
                "last_updated": datetime.utcnow().isoformat() + "Z",
                "documents": doc_list,
                "chunks": chunks,
            }
            with open(self.json_path, "w", encoding="utf-8") as f:
                json.dump(store_data, f, indent=2)
        except Exception as e:
            logger.error(f"Error writing vector_store.json: {e}")

class IndexingResult(dict):
    """Result object containing indexing metrics and storage status, compatible with int."""
    def __init__(self, count: int, storage_mode: str, native_chroma_success: bool, error: Optional[str] = None):
        super().__init__(
            count=count,
            storage_mode=storage_mode,
            native_chroma_success=native_chroma_success,
            error=error,
        )
        self.count = count
        self.storage_mode = storage_mode
        self.native_chroma_success = native_chroma_success
        self.error = error

    def __int__(self):
        return self.count

    def __index__(self):
        return self.count

    def __add__(self, other):
        return self.count + int(other)

    def __radd__(self, other):
        return int(other) + self.count

    def __eq__(self, other):
        if isinstance(other, int):
            return self.count == other
        return super().__eq__(other)

    def __ge__(self, other):
        return self.count >= int(other)

    def __gt__(self, other):
        return self.count > int(other)

    def __le__(self, other):
        return self.count <= int(other)

    def __lt__(self, other):
        return self.count < int(other)

    def add_document_chunks(
        self,
        document_id: str,
        document_name: str,
        chunks: List[Dict[str, Any]],
        project_id: str = "default_project",
    ) -> IndexingResult:
        """
        Add text chunks with metadata to the vector store.
        Distinguishes native ChromaDB indexing from fallback JSON persistence.
        Does not falsely report native ChromaDB success if collection.add() fails.
        """
        if not chunks:
            return IndexingResult(0, "none", False, None)

        now_str = datetime.utcnow().isoformat() + "Z"
        chunk_records = []
        native_chroma_success = False
        chroma_error = None
        storage_mode = "json_fallback"

        # 1. Store in native ChromaDB if available
        if self.is_chroma_available and self.collection:
            try:
                ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
                documents = [c.get("text", "") for c in chunks]
                metadatas = [
                    {
                        "document_id": document_id,
                        "project_id": project_id,
                        "document_name": document_name,
                        "category": c.get("category", "general"),
                        "page": int(c.get("page", 1)),
                    }
                    for c in chunks
                ]
                self.collection.add(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas,
                )
                native_chroma_success = True
                storage_mode = "native_chromadb"
            except Exception as e:
                chroma_error = str(e)
                logger.error(
                    f"Native ChromaDB collection.add() failed for document '{document_name}': {e}. "
                    "Falling back to persistent JSON vector store."
                )
                native_chroma_success = False
                storage_mode = "json_fallback_after_chroma_error"
        else:
            storage_mode = "json_fallback"

        # 2. Prepare chunk records for human-readable mirror and persistence
        for i, c in enumerate(chunks):
            cid = f"{document_id}_chunk_{i}"
            text = c.get("text", "")
            cat = c.get("category", "general")
            page = int(c.get("page", 1))
            chunk_records.append({
                "id": cid,
                "document_id": document_id,
                "project_id": project_id,
                "document_name": document_name,
                "category": cat,
                "page": page,
                "text": text,
                "created_at": now_str,
            })

        # 3. Update human-readable vector_store.json
        try:
            existing_chunks = [ch for ch in self._read_json_store() if ch.get("document_id") != document_id]
            existing_chunks.extend(chunk_records)
            self._write_json_store(existing_chunks)
        except Exception as e:
            logger.error(f"Error persisting vector_store.json: {e}")

        return IndexingResult(
            count=len(chunks),
            storage_mode=storage_mode,
            native_chroma_success=native_chroma_success,
            error=chroma_error,
        )

    def query_similarity(
        self,
        query: str,
        top_k: int = 5,
        project_id: Optional[str] = None,
        category_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Query top_k semantically similar chunks for RAG grounding with optional project/category isolation."""
        if not query or not query.strip():
            all_chunks = self._read_json_store()
            if project_id:
                all_chunks = [c for c in all_chunks if c.get("project_id") == project_id]
            if category_filter:
                all_chunks = [c for c in all_chunks if c.get("category") == category_filter]
            return [
                {
                    "id": c.get("id"),
                    "text": c.get("text", ""),
                    "document_id": c.get("document_id", ""),
                    "document_name": c.get("document_name", "Unknown"),
                    "category": c.get("category", "general"),
                    "page": c.get("page", 1),
                    "score": 0.8,
                    "similarity_score": 0.8,
                }
                for c in all_chunks[:top_k]
            ]

        # 1. Native ChromaDB semantic search
        if self.is_chroma_available and self.collection:
            try:
                where_filter = {}
                if project_id:
                    where_filter["project_id"] = project_id
                if category_filter:
                    where_filter["category"] = category_filter

                query_params: Dict[str, Any] = {
                    "query_texts": [query],
                    "n_results": min(top_k, max(1, self.collection.count() or 1)),
                }
                if where_filter:
                    if len(where_filter) == 1:
                        query_params["where"] = where_filter
                    else:
                        query_params["where"] = {"$and": [{k: v} for k, v in where_filter.items()]}

                results = self.collection.query(**query_params)
                formatted = []
                if results and "documents" in results and results["documents"]:
                    docs = results["documents"][0]
                    metas = results["metadatas"][0] if "metadatas" in results else []
                    ids = results["ids"][0] if "ids" in results else []
                    distances = results["distances"][0] if "distances" in results and results["distances"] else []
                    
                    for i, doc_text in enumerate(docs):
                        meta = metas[i] if i < len(metas) else {}
                        cid = ids[i] if i < len(ids) else f"chunk_{i}"
                        dist = distances[i] if i < len(distances) else 0.3
                        # Chroma cosine distance to similarity
                        sim_score = max(0.01, min(0.99, round(1.0 - (dist / 2.0), 3)))

                        formatted.append({
                            "id": cid,
                            "text": doc_text,
                            "document_id": meta.get("document_id", ""),
                            "project_id": meta.get("project_id", project_id or "default_project"),
                            "document_name": meta.get("document_name", "Unknown"),
                            "category": meta.get("category", "general"),
                            "page": meta.get("page", 1),
                            "score": sim_score,
                            "similarity_score": sim_score,
                        })
                if formatted:
                    return formatted
            except Exception as e:
                logger.error(f"Error querying ChromaDB: {e}")

        # 2. Tokenized keyword + phrase ranking fallback over persistent store
        all_chunks = self._read_json_store()
        if not all_chunks:
            return []

        if project_id:
            all_chunks = [c for c in all_chunks if c.get("project_id", "default_project") == project_id]
        if category_filter:
            all_chunks = [c for c in all_chunks if c.get("category") == category_filter]

        q_lower = query.lower()
        q_tokens = [w for w in q_lower.split() if len(w) > 1]
        scored = []
        for c in all_chunks:
            text = c.get("text", "").lower()
            name = c.get("document_name", "").lower()
            matches = sum(10 for w in q_tokens if w in text)
            if q_lower in text:
                matches += 40
            if any(w in name for w in q_tokens):
                matches += 20
            if matches > 0:
                score = min(0.99, round(matches / (len(q_tokens) * 20 + 40), 2))
                scored.append((score, c))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {
                "id": item[1].get("id"),
                "text": item[1].get("text", ""),
                "document_id": item[1].get("document_id", ""),
                "project_id": item[1].get("project_id", project_id or "default_project"),
                "document_name": item[1].get("document_name", "Unknown"),
                "category": item[1].get("category", "general"),
                "page": item[1].get("page", 1),
                "score": item[0],
                "similarity_score": item[0],
            }
            for item in scored[:top_k]
        ]

    def delete_document(self, document_id: str) -> bool:
        """Remove all chunks associated with a document ID from ChromaDB and persistent store."""
        if self.is_chroma_available and self.collection:
            try:
                self.collection.delete(where={"document_id": document_id})
            except Exception as e:
                logger.error(f"Error deleting from native ChromaDB: {e}")

        try:
            remaining = [ch for ch in self._read_json_store() if ch.get("document_id") != document_id]
            self._write_json_store(remaining)
            return True
        except Exception as e:
            logger.error(f"Error deleting document from local store: {e}")
            return False

    def clear_collection_records(self, project_id: Optional[str] = None) -> int:
        """
        Clears records from the active ChromaDB collection using collection.delete(ids=...).
        Preserves the collection instance, embedding function, metadata, and schema.
        Raises RuntimeError on failure to prevent reporting false success.
        """
        if not self.is_chroma_available or not self.collection:
            raise RuntimeError("ChromaDB persistent collection is not available.")

        cleared_count = 0
        try:
            if project_id:
                existing = self.collection.get(where={"project_id": project_id})
                ids = existing.get("ids", [])
                if ids:
                    self.collection.delete(ids=ids)
                    cleared_count = len(ids)
            else:
                existing = self.collection.get()
                ids = existing.get("ids", [])
                if ids:
                    self.collection.delete(ids=ids)
                    cleared_count = len(ids)
        except Exception as e:
            logger.error(f"Failed to delete records from ChromaDB collection: {e}")
            raise RuntimeError(f"ChromaDB collection deletion failed: {e}") from e

        # Synchronize human-readable vector_store.json mirror
        try:
            current_chunks = self._read_json_store()
            if project_id:
                remaining = [ch for ch in current_chunks if ch.get("project_id") != project_id]
                self._write_json_store(remaining)
            else:
                self._write_json_store([])
        except Exception as e:
            logger.error(f"Failed to update vector_store.json mirror: {e}")
            raise RuntimeError(f"Failed to synchronize vector store mirror: {e}") from e

        return cleared_count

    def reset_collection(self, project_id: Optional[str] = None) -> int:
        """Purge and reset the vector collection records while preserving collection schema."""
        return self.clear_collection_records(project_id=project_id)

chroma_service = ChromaService()
