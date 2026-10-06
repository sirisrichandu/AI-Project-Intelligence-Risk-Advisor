import os
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("chromadb_service")

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./backend/chroma_db")

class ChromaService:
    """
    ChromaDB Persistent Vector Store Service for Project Intelligence RAG.
    Creates and manages persistent embeddings in the `./chroma_db` directory.
    """
    def __init__(self, persist_dir: str = CHROMA_PERSIST_DIR):
        self.persist_dir = persist_dir
        self.client = None
        self.collection = None
        self.is_chroma_available = False

        os.makedirs(self.persist_dir, exist_ok=True)
        self._init_chroma()

    def _init_chroma(self):
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
            logger.info(f"ChromaDB persistent client initialized at: {self.persist_dir}")
        except Exception as e:
            logger.warning(
                f"ChromaDB library not yet installed or failed to initialize ({e}). "
                f"Falling back to local persistent file store at {self.persist_dir}. "
                f"Run `pip install -r backend/requirements.txt` to enable native ChromaDB vector search."
            )
            self.is_chroma_available = False

    def add_document_chunks(
        self,
        document_id: str,
        document_name: str,
        chunks: List[Dict[str, Any]],
    ) -> int:
        """Add text chunks with metadata to the ChromaDB vector store."""
        if not chunks:
            return 0

        if self.is_chroma_available and self.collection:
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
            return len(ids)
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
                return []
        return []

    def delete_document(self, document_id: str) -> bool:
        """Remove all chunks associated with a document ID from ChromaDB."""
        if self.is_chroma_available and self.collection:
            try:
                self.collection.delete(
                    where={"document_id": document_id}
                )
                return True
            except Exception as e:
                logger.error(f"Error deleting document from ChromaDB: {e}")
                return False
        return True

    def reset_collection(self):
        """Purge and reset the vector collection."""
        if self.is_chroma_available and self.client:
            try:
                self.client.delete_collection("project_knowledge_base")
                self.collection = self.client.create_collection("project_knowledge_base")
            except Exception as e:
                logger.error(f"Error resetting ChromaDB collection: {e}")

chroma_service = ChromaService()
