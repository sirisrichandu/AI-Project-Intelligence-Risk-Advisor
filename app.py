from flask import Flask, render_template, request
import os
import json
import faiss
from markupsafe import escape

from ingestion.document_loader import load_document
from rag.chunking import chunk_text
from rag.embeddings import generate_embeddings
from rag.vector_store import (
    create_vector_index,
    save_vector_index,
    search_vector_index
)


app = Flask(__name__)

# =========================================================
# FOLDERS
# =========================================================

UPLOAD_FOLDER = "uploads"
KNOWLEDGE_BASE_FOLDER = "knowledge_base"

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(KNOWLEDGE_BASE_FOLDER, exist_ok=True)


# =========================================================
# KNOWLEDGE BASE FILES
# =========================================================

INDEX_PATH = "knowledge_base/project_index.faiss"
CHUNKS_PATH = "knowledge_base/chunks.json"


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():

    return render_template(
        "index.html",
        uploaded_files=[],
        chunks=[],
        chunk_count=0,
        embedding_dimension=384,
        total_chunks=0,
        upload_message=None,
        results=[],
        question=None
    )


# =========================================================
# UPLOAD DOCUMENTS
# =========================================================

@app.route("/upload", methods=["POST"])
def upload_files():

    uploaded_files = request.files.getlist("files")

    if not uploaded_files:

        return render_template(
            "index.html",
            uploaded_files=[],
            chunks=[],
            chunk_count=0,
            embedding_dimension=384,
            total_chunks=0,
            upload_message="No files selected.",
            results=[],
            question=None
        )


    all_new_chunks = []

    uploaded_file_names = []


    # -----------------------------------------------------
    # PROCESS EACH UPLOADED FILE
    # -----------------------------------------------------

    for uploaded_file in uploaded_files:

        if uploaded_file.filename == "":
            continue


        filename = uploaded_file.filename

        uploaded_file_names.append(filename)


        # Save uploaded file
        file_path = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )

        uploaded_file.save(file_path)


        try:

            # Extract text
            text = load_document(file_path)


            if not text.strip():
                continue


            # Create chunks
            new_chunks = chunk_text(text)


            # Store chunk + source
            for chunk in new_chunks:

                all_new_chunks.append(
                    {
                        "text": chunk,
                        "source": filename
                    }
                )


        except Exception as error:

            return render_template(
                "index.html",
                uploaded_files=uploaded_file_names,
                chunks=[],
                chunk_count=0,
                embedding_dimension=384,
                total_chunks=0,
                upload_message=f"Error processing {filename}: {error}",
                results=[],
                question=None
            )


    # -----------------------------------------------------
    # CHECK CONTENT
    # -----------------------------------------------------

    if not all_new_chunks:

        return render_template(
            "index.html",
            uploaded_files=uploaded_file_names,
            chunks=[],
            chunk_count=0,
            embedding_dimension=384,
            total_chunks=0,
            upload_message="No readable text found in the uploaded files.",
            results=[],
            question=None
        )


    # =====================================================
    # LOAD EXISTING KNOWLEDGE BASE
    # =====================================================

    existing_chunks = []


    if os.path.exists(CHUNKS_PATH):

        try:

            with open(
                CHUNKS_PATH,
                "r",
                encoding="utf-8"
            ) as json_file:

                existing_chunks = json.load(json_file)

        except Exception:

            existing_chunks = []


    # =====================================================
    # CONVERT OLD STRING FORMAT
    # =====================================================

    normalized_existing_chunks = []


    for item in existing_chunks:

        # Old format:
        # "some chunk text"

        if isinstance(item, str):

            normalized_existing_chunks.append(
                {
                    "text": item,
                    "source": "Previously uploaded document"
                }
            )

        # New format:
        # {"text": "...", "source": "..."}
        elif isinstance(item, dict):

            normalized_existing_chunks.append(item)


    existing_chunks = normalized_existing_chunks


    # =====================================================
    # REMOVE EXACT DUPLICATES
    # =====================================================

    existing_texts = set(
        item["text"]
        for item in existing_chunks
    )


    unique_new_chunks = []


    for item in all_new_chunks:

        if item["text"] not in existing_texts:

            unique_new_chunks.append(item)

            existing_texts.add(
                item["text"]
            )


    # =====================================================
    # COMBINE KNOWLEDGE BASE
    # =====================================================

    all_chunks = (
        existing_chunks +
        unique_new_chunks
    )


    # =====================================================
    # GENERATE EMBEDDINGS
    # =====================================================

    all_texts = [
        item["text"]
        for item in all_chunks
    ]


    embeddings = generate_embeddings(
        all_texts
    )


    # =====================================================
    # CREATE FAISS INDEX
    # =====================================================

    index = create_vector_index(
        embeddings
    )


    # =====================================================
    # SAVE FAISS INDEX
    # =====================================================

    save_vector_index(
        index,
        INDEX_PATH
    )


    # =====================================================
    # SAVE CHUNKS
    # =====================================================

    with open(
        CHUNKS_PATH,
        "w",
        encoding="utf-8"
    ) as json_file:

        json.dump(
            all_chunks,
            json_file,
            indent=4,
            ensure_ascii=False
        )


    # =====================================================
    # EMBEDDING DIMENSION
    # =====================================================

    embedding_dimension = embeddings.shape[1]


    # =====================================================
    # SUCCESS MESSAGE
    # =====================================================

    upload_message = (
        "Document processing completed successfully."
    )


    # =====================================================
    # SHOW ONLY CURRENT UPLOAD CHUNKS
    # =====================================================

    current_chunks = unique_new_chunks


    # If everything was duplicate, show the uploaded
    # chunks anyway for demonstration.
    if not current_chunks:

        current_chunks = all_new_chunks


    # =====================================================
    # RENDER PAGE
    # =====================================================

    return render_template(

        "index.html",

        uploaded_files=uploaded_file_names,

        chunks=current_chunks,

        chunk_count=len(current_chunks),

        embedding_dimension=embedding_dimension,

        total_chunks=len(all_chunks),

        upload_message=upload_message,

        results=[],

        question=None
    )


# =========================================================
# ASK QUESTION
# =========================================================

@app.route("/ask", methods=["POST"])
def ask_question():

    question = request.form.get(
        "question",
        ""
    ).strip()


    if not question:

        return render_template(
            "index.html",
            uploaded_files=[],
            chunks=[],
            chunk_count=0,
            embedding_dimension=384,
            total_chunks=0,
            upload_message=None,
            results=[],
            question=None
        )


    # =====================================================
    # CHECK KNOWLEDGE BASE
    # =====================================================

    if not os.path.exists(INDEX_PATH):

        return render_template(
            "index.html",
            uploaded_files=[],
            chunks=[],
            chunk_count=0,
            embedding_dimension=384,
            total_chunks=0,
            upload_message="Please upload project documents first.",
            results=[],
            question=question
        )


    if not os.path.exists(CHUNKS_PATH):

        return render_template(
            "index.html",
            uploaded_files=[],
            chunks=[],
            chunk_count=0,
            embedding_dimension=384,
            total_chunks=0,
            upload_message="Project knowledge base not found.",
            results=[],
            question=question
        )


    # =====================================================
    # LOAD CHUNKS
    # =====================================================

    with open(
        CHUNKS_PATH,
        "r",
        encoding="utf-8"
    ) as json_file:

        stored_chunks = json.load(
            json_file
        )


    # =====================================================
    # NORMALIZE OLD CHUNK FORMAT
    # =====================================================

    chunks = []


    for item in stored_chunks:

        if isinstance(item, str):

            chunks.append(
                {
                    "text": item,
                    "source": "Previously uploaded document"
                }
            )

        elif isinstance(item, dict):

            chunks.append(item)


    # =====================================================
    # LOAD FAISS
    # =====================================================

    index = faiss.read_index(
        INDEX_PATH
    )


    # =====================================================
    # CREATE QUESTION EMBEDDING
    # =====================================================

    query_embedding = generate_embeddings(
        [question]
    )


    # =====================================================
    # SEARCH VECTOR DATABASE
    # =====================================================

    distances, indices = search_vector_index(

        index,

        query_embedding,

        top_k=min(5, len(chunks))
    )


    # =====================================================
    # CREATE SEARCH RESULTS
    # =====================================================

    results = []


    for rank, index_number in enumerate(
        indices[0],
        start=1
    ):

        if index_number == -1:
            continue


        if index_number >= len(chunks):
            continue


        chunk = chunks[index_number]


        # Avoid duplicate result text
        already_exists = any(
            result["text"] == chunk["text"]
            for result in results
        )


        if already_exists:
            continue


        results.append(
            {
                "rank": rank,
                "text": chunk["text"],
                "source": chunk.get(
                    "source",
                    "Unknown document"
                ),
                "distance": round(
                    float(
                        distances[0][rank - 1]
                    ),
                    4
                )
            }
        )


    # =====================================================
    # TOTAL CHUNKS
    # =====================================================

    total_chunks = len(chunks)


    # =====================================================
    # RENDER RESULTS
    # =====================================================

    return render_template(

        "index.html",

        uploaded_files=[],

        chunks=[],

        chunk_count=0,

        embedding_dimension=384,

        total_chunks=total_chunks,

        upload_message=None,

        results=results,

        question=question
    )


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True
    )