import chromadb
from sentence_transformers import SentenceTransformer
import hashlib


# --------------------------------------------------
# Embedding Model
# --------------------------------------------------

model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)


# --------------------------------------------------
# ChromaDB Client
# --------------------------------------------------

client = chromadb.PersistentClient(
    path="knowledge_base/chroma_db"
)


# --------------------------------------------------
# Collection
# --------------------------------------------------

collection = client.get_or_create_collection(
    name="project_documents"
)


# --------------------------------------------------
# Add Documents
# --------------------------------------------------

def add_documents(chunks, sources):

    ids = []
    unique_chunks = []
    unique_sources = []

    for chunk, source in zip(chunks, sources):

        chunk_id = hashlib.md5(
            f"{source}:{chunk}".encode("utf-8")
        ).hexdigest()

        if chunk_id not in ids:

            ids.append(chunk_id)
            unique_chunks.append(chunk)
            unique_sources.append(source)


    if not unique_chunks:

        return 0


    # Generate embeddings
    embeddings = model.encode(
        unique_chunks
    ).tolist()


    # Store in ChromaDB
    collection.upsert(
        ids=ids,
        documents=unique_chunks,
        embeddings=embeddings,
        metadatas=[
            {"source": source}
            for source in unique_sources
        ]
    )


    return len(unique_chunks)


# --------------------------------------------------
# Search Documents
# --------------------------------------------------

def search_documents(question, top_k=5):

    question_embedding = model.encode(
        [question]
    ).tolist()


    results = collection.query(
        query_embeddings=question_embedding,
        n_results=min(
            top_k,
            collection.count()
        )
    )


    return results