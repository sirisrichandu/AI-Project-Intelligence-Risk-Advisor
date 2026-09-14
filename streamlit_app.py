import os
import streamlit as st

from ingestion.document_loader import load_document

from rag.chunking import chunk_text

from rag.chroma_store import (
    add_documents,
    search_documents,
    collection
)

from agents.scope_extraction_agent import extract_scope

from agents.risk_detection_agent import detect_risks

from agents.blocker_action_agent import (
    identify_blockers_and_actions
)


# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="AI Project Intelligence & Risk Advisor",
    page_icon="🤖",
    layout="wide"
)


# ============================================================
# APPLICATION HEADER
# ============================================================

st.title(
    "🤖 AI Project Intelligence & Risk Advisor"
)

st.write(
    "Upload project documents and analyze them using "
    "RAG, Scope Extraction, Risk Detection, and "
    "Blocker & Action Item Agents."
)


# ============================================================
# DOCUMENT UPLOAD
# ============================================================

st.subheader(
    "📂 Upload Project Documents"
)

uploaded_files = st.file_uploader(
    "Upload PDF, DOCX, CSV or TXT files",
    type=[
        "pdf",
        "docx",
        "csv",
        "txt"
    ],
    accept_multiple_files=True
)


# ============================================================
# PROCESS UPLOADED DOCUMENTS
# ============================================================

if uploaded_files:

    os.makedirs(
        "uploads",
        exist_ok=True
    )

    for uploaded_file in uploaded_files:

        file_path = os.path.join(
            "uploads",
            uploaded_file.name
        )

        # --------------------------------------------------------
        # Save uploaded document
        # --------------------------------------------------------

        with open(
            file_path,
            "wb"
        ) as file:

            file.write(
                uploaded_file.getbuffer()
            )

        try:

            # ====================================================
            # STEP 1: EXTRACT TEXT
            # ====================================================

            text = load_document(
                file_path
            )

            if not text.strip():

                st.warning(
                    f"⚠️ No readable text found in "
                    f"{uploaded_file.name}"
                )

                continue


            # ====================================================
            # STEP 2: CREATE CHUNKS
            # ====================================================

            chunks = chunk_text(
                text
            )

            if not chunks:

                st.warning(
                    f"⚠️ No chunks created for "
                    f"{uploaded_file.name}"
                )

                continue


            # ====================================================
            # STEP 3: PREPARE SOURCE METADATA
            # ====================================================

            sources = [
                uploaded_file.name
                for _ in chunks
            ]


            # ====================================================
            # STEP 4: STORE DOCUMENTS IN CHROMADB
            # ====================================================

            added_count = add_documents(
                chunks,
                sources
            )


            # ====================================================
            # SUCCESS MESSAGE
            # ====================================================

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


# ============================================================
# KNOWLEDGE BASE STATISTICS
# ============================================================

st.subheader(
    "📊 Knowledge Base"
)

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
        f"❌ Unable to read ChromaDB: {error}"
    )


# ============================================================
# PROJECT QUESTION
# ============================================================

st.subheader(
    "💬 Ask About Your Project"
)

question = st.text_input(
    "Enter your question",
    placeholder="Example: What are the major risks in the project?"
)


# ============================================================
# SEARCH BUTTON
# ============================================================

if st.button(
    "🔍 Search Project"
):

    # ========================================================
    # VALIDATE QUESTION
    # ========================================================

    if not question.strip():

        st.warning(
            "⚠️ Please enter a question."
        )


    # ========================================================
    # VALIDATE KNOWLEDGE BASE
    # ========================================================

    elif collection.count() == 0:

        st.warning(
            "⚠️ Please upload project documents first."
        )


    else:

        try:

            # ====================================================
            # STEP 1: GENERAL SEMANTIC SEARCH
            # ====================================================

            results = search_documents(
                question,
                top_k=10
            )


            # ====================================================
            # STEP 2: GET RETRIEVED DOCUMENTS
            # ====================================================

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


            # ====================================================
            # STEP 3: DISPLAY RETRIEVED INFORMATION
            # ====================================================

            st.subheader(
                "📚 Retrieved Information"
            )

            if documents:

                for i, document in enumerate(
                    documents
                ):

                    if i < len(metadatas):

                        source = metadatas[i].get(
                            "source",
                            "Unknown document"
                        )

                    else:

                        source = "Unknown document"


                    st.markdown(
                        f"### Result {i + 1}"
                    )

                    st.write(
                        document
                    )

                    if i < len(distances):

                        st.caption(
                            f"📄 Source: {source} | "
                            f"Distance: {distances[i]:.4f}"
                        )

                    else:

                        st.caption(
                            f"📄 Source: {source}"
                        )


                # ====================================================
                # STEP 4: GENERAL RETRIEVED CONTEXT
                # ====================================================

                combined_context = "\n\n".join(
                    documents
                )


                # ====================================================
                # STEP 5: ADDITIONAL SCOPE-SPECIFIC RETRIEVAL
                # ====================================================

                scope_query = """
Project goal, project scope, included scope,
excluded scope, major deliverables, milestones,
milestone dates, project timeline, deadlines,
team responsibilities, team roles, and ownership.
"""

                scope_results = search_documents(
                    scope_query,
                    top_k=10
                )

                scope_documents = scope_results.get(
                    "documents",
                    [[]]
                )[0]

                scope_context = "\n\n".join(
                    scope_documents
                )


                # ====================================================
                # STEP 6: COMBINE GENERAL + SCOPE CONTEXT
                # ====================================================

                scope_combined_context = (
                    combined_context
                    + "\n\n"
                    + scope_context
                )


                # ====================================================
                # STEP 7: SCOPE EXTRACTION AGENT
                # ====================================================

                st.subheader(
                    "📋 Scope & Deliverable Extraction"
                )

                try:

                    scope_data = extract_scope(
                        scope_combined_context
                    )

                    st.json(
                        scope_data
                    )

                except Exception as error:

                    st.error(
                        f"❌ Scope extraction failed: {error}"
                    )


                # ====================================================
                # STEP 8: RISK DETECTION AGENT
                # ====================================================

                st.subheader(
                    "⚠️ Risk Detection & Delivery Forecast"
                )

                try:

                    risk_data = detect_risks(
                        combined_context
                    )

                    st.json(
                        risk_data
                    )

                except Exception as error:

                    st.error(
                        f"❌ Risk detection failed: {error}"
                    )


                # ====================================================
                # STEP 9: BLOCKER & ACTION ITEM AGENT
                # ====================================================

                st.subheader(
                    "🚧 Blockers & Action Items"
                )

                try:

                    blocker_action_data = (
                        identify_blockers_and_actions(
                            combined_context
                        )
                    )

                    st.json(
                        blocker_action_data
                    )

                except Exception as error:

                    st.error(
                        "❌ Blocker & Action Item "
                        f"detection failed: {error}"
                    )


            # ========================================================
            # NO DOCUMENTS FOUND
            # ========================================================

            else:

                st.info(
                    "ℹ️ No relevant information found."
                )


        # ========================================================
        # SEARCH ERROR
        # ========================================================

        except Exception as error:

            st.error(
                f"❌ Search failed: {error}"
            )