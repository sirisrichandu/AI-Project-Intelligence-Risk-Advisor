
import chromadb
from sentence_transformers import SentenceTransformer
import hashlib
import os


# -----------------------------
# 1. Load Embedding Model
# -----------------------------
print("Loading embedding model...")

model = SentenceTransformer("all-MiniLM-L6-v2")

print("Embedding model loaded successfully.")


# -----------------------------
# 2. ChromaDB Persistent Client
# -----------------------------
CHROMA_PATH = "knowledge_base/chroma_db"

os.makedirs(CHROMA_PATH, exist_ok=True)

client = chromadb.PersistentClient(
    path=CHROMA_PATH
)


# -----------------------------
# 3. Get Project Collection
# -----------------------------
def get_collection(project_name: str):

    project_name = project_name.strip().lower()

    collection_id = hashlib.md5(
        project_name.encode("utf-8")
    ).hexdigest()

    collection = client.get_or_create_collection(
        name=f"project_{collection_id}"
    )

    return collection


# -----------------------------
# 4. Add Documents to ChromaDB
# -----------------------------
def add_documents(
    chunks,
    sources,
    project_name
):

    if not chunks:
        print("No chunks received.")

        return 0

    if not project_name:
        raise ValueError(
            "Project name is required."
        )

    collection = get_collection(
        project_name
    )

    ids = []
    unique_chunks = []
    unique_sources = []

    for chunk, source in zip(
        chunks,
        sources
    ):

        if not chunk or not chunk.strip():
            continue

        chunk_id = hashlib.md5(
            f"{project_name}:{source}:{chunk}".encode(
                "utf-8"
            )
        ).hexdigest()

        if chunk_id not in ids:

            ids.append(chunk_id)

            unique_chunks.append(
                chunk
            )

            unique_sources.append(
                source
            )

    if not unique_chunks:

        print("No unique chunks to add.")

        return 0

    print(
        f"Creating embeddings for {len(unique_chunks)} chunks..."
    )

    # Convert chunks into embeddings
    embeddings = model.encode(
        unique_chunks,
        show_progress_bar=False
    ).tolist()

    # Store documents and embeddings
    collection.upsert(
        ids=ids,

        documents=unique_chunks,

        embeddings=embeddings,

        metadatas=[
            {
                "source": source,
                "project_name": project_name
            }

            for source in unique_sources
        ]
    )

    print(
        f"Added {len(unique_chunks)} chunks to ChromaDB."
    )

    print(
        f"Total chunks in project: {collection.count()}"
    )

    return len(unique_chunks)


# -----------------------------
# 5. Search Documents
# -----------------------------
def search_documents(
    question,
    project_name,
    top_k=5
):

    if not question or not question.strip():

        print("Question is empty.")

        return None

    if not project_name:

        print("Project name is missing.")

        return None

    collection = get_collection(
        project_name
    )

    total_documents = collection.count()

    print(
        f"Searching project: {project_name}"
    )

    print(
        f"Available chunks: {total_documents}"
    )

    if total_documents == 0:

        print(
            "No documents found for this project."
        )

        return None

    # Convert question into embedding
    question_embedding = model.encode(
        [question],
        show_progress_bar=False
    ).tolist()

    # Search similar chunks
    results = collection.query(
        query_embeddings=question_embedding,

        n_results=min(
            top_k,
            total_documents
        ),

        include=[
            "documents",
            "metadatas",
            "distances"
        ]
    )

    print("Relevant chunks retrieved successfully.")

    print("Retrieved documents:")
    print(results["documents"])

    return results


# -----------------------------
# 6. Get Collection Information
# -----------------------------
def get_project_info(project_name):

    collection = get_collection(
        project_name
    )

    return {
        "project_name": project_name,
        "total_chunks": collection.count()
    }