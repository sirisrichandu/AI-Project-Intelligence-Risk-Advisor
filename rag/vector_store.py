import faiss
import numpy as np


def create_vector_index(embeddings):

    embeddings = np.asarray(
        embeddings
    ).astype("float32")

    dimension = embeddings.shape[1]

    index = faiss.IndexFlatL2(
        dimension
    )

    index.add(
        embeddings
    )

    return index


def save_vector_index(
    index,
    file_path
):

    faiss.write_index(
        index,
        file_path
    )


def load_vector_index(
    file_path
):

    return faiss.read_index(
        file_path
    )


def search_vector_index(
    index,
    query_embedding,
    top_k=3
):

    query_embedding = np.asarray(
        query_embedding
    ).astype("float32")

    distances, indices = index.search(
        query_embedding,
        top_k
    )

    return distances, indices