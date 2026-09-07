import streamlit as st
import os

from ingestion.document_loader import load_document
from rag.chunking import chunk_text
from rag.chroma_store import (
    add_documents,
    search_documents,
    collection
)


# --------------------------------------------------
# Page Configuration
# --------------------------------------------------

st.set_page_config(
    page_title="AI Project Intelligence & Risk Advisor",
    page_icon="🤖",
    layout="wide"
)


# --------------------------------------------------
# Application Header
# --------------------------------------------------

st.title("🤖 AI Project Intelligence & Risk Advisor")

st.write(
    "Upload project documents and build a RAG knowledge base "
    "using ChromaDB."
)


# --------------------------------------------------
# Document Upload
# --------------------------------------------------

st.subheader("📂 Upload Project Documents")

uploaded_files = st.file_uploader(
    "Upload PDF, DOCX, CSV or TXT files",
    type=["pdf", "docx", "csv", "txt"],
    accept_multiple_files=True
)


if uploaded_files:

    os.makedirs("uploads", exist_ok=True)

    for uploaded_file in uploaded_files:

        file_path = os.path.join(
            "uploads",
            uploaded_file.name
        )

        # Save uploaded file
        with open(file_path, "wb") as file:
            file.write(uploaded_file.getbuffer())

        try:

            # --------------------------------------------------
            # Step 1: Extract Text
            # --------------------------------------------------

            text = load_document(file_path)

            if not text.strip():

                st.warning(
                    f"⚠️ No readable text found in "
                    f"{uploaded_file.name}"
                )

                continue


            # --------------------------------------------------
            # Step 2: Create Chunks
            # --------------------------------------------------

            chunks = chunk_text(text)

            if not chunks:

                st.warning(
                    f"⚠️ No chunks created for "
                    f"{uploaded_file.name}"
                )

                continue


            # --------------------------------------------------
            # Step 3: Prepare Source Metadata
            # --------------------------------------------------

            sources = [
                uploaded_file.name
                for _ in chunks
            ]


            # --------------------------------------------------
            # Step 4: Store in ChromaDB
            # --------------------------------------------------

            added_count = add_documents(
                chunks,
                sources
            )


            # --------------------------------------------------
            # Success Message
            # --------------------------------------------------

            st.success(
                f"✅ {uploaded_file.name} "
                f"processed successfully."
            )

            st.info(
                f"📄 Chunks created: {len(chunks)} | "
                f"🗄️ Chunks added to ChromaDB: {added_count}"
            )


        except Exception as error:

            st.error(
                f"❌ Error processing "
                f"{uploaded_file.name}: {error}"
            )


# --------------------------------------------------
# Knowledge Base Statistics
# --------------------------------------------------

st.subheader("📊 Knowledge Base")

try:

    total_chunks = collection.count()

    col1, col2 = st.columns(2)

    with col1:

        st.metric(
            "Knowledge Base Chunks",
            total_chunks
        )

    with col2:

        st.metric(
            "Embedding Dimensions",
            384
        )


except Exception as error:

    st.error(
        f"Unable to read ChromaDB: {error}"
    )


# --------------------------------------------------
# Project Question Answering
# --------------------------------------------------

st.subheader("💬 Ask About Your Project")

question = st.text_input(
    "Enter your question",
    placeholder="Example: What is the project about?"
)


# --------------------------------------------------
# Search Button
# --------------------------------------------------

if st.button("🔍 Search Project"):

    if not question.strip():

        st.warning(
            "⚠️ Please enter a question."
        )

    elif collection.count() == 0:

        st.warning(
            "⚠️ Please upload project documents first."
        )

    else:

        try:

            # --------------------------------------------------
            # Semantic Search using ChromaDB
            # --------------------------------------------------

            results = search_documents(
                question,
                top_k=5
            )


            # --------------------------------------------------
            # Display Retrieved Information
            # --------------------------------------------------

            st.subheader("📚 Retrieved Information")

            documents = results.get(
                "documents",
                [[]]
            )[0]

            metadatas = results.get(
                "metadatas",
                [[]]
            )[0]

            distances = results.get(
                "distances",
                [[]]
            )[0]


            if documents:

                for i, document in enumerate(documents):

                    source = metadatas[i].get(
                        "source",
                        "Unknown document"
                    )

                    st.markdown(
                        f"### Result {i + 1}"
                    )

                    st.write(document)

                    if distances:

                        st.caption(
                            f"📄 Source: {source} | "
                            f"Distance: {distances[i]:.4f}"
                        )

                    else:

                        st.caption(
                            f"📄 Source: {source}"
                        )


            else:

                st.info(
                    "No relevant information found."
                )


        except Exception as error:

            st.error(
                f"❌ Search failed: {error}"
            )