import os
import streamlit as st

from ingestion.document_loader import load_document
from rag.chunking import chunk_text
from rag.chroma_store import add_documents, search_documents

from agents.scope_extraction_agent import extract_scope
from agents.risk_detection_agent import detect_risks
from agents.blocker_action_agent import identify_blockers_and_actions


# =========================================================
# PAGE CONFIG
# =========================================================

st.set_page_config(
    page_title="AI Project Intelligence & Risk Advisor",
    page_icon="🤖",
    layout="wide"
)


# =========================================================
# CUSTOM CSS
# =========================================================

st.markdown(
    """
    <style>

    .stApp {
        background-color: #0e1117;
    }

    h1, h2, h3 {
        color: white !important;
    }

    p, label {
        color: white !important;
    }

    .info-card,
    .risk-card,
    .blocker-card,
    .action-card,
    .decision-card,
    .issue-card,
    .status-box {

        background-color: white !important;
        color: #222222 !important;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 15px;
        border: 1px solid #dddddd;
    }

    .info-card h3,
    .risk-card h3,
    .blocker-card h3,
    .action-card h3,
    .decision-card h3,
    .issue-card h3,
    .status-box h2 {

        color: #222222 !important;
    }

    .info-card p,
    .risk-card p,
    .blocker-card p,
    .action-card p,
    .decision-card p,
    .issue-card p,
    .status-box p {

        color: #333333 !important;
    }

    .risk-card {
        border-left: 6px solid #f0ad4e;
    }

    .blocker-card {
        border-left: 6px solid #dc3545;
    }

    .action-card {
        border-left: 6px solid #198754;
    }

    .decision-card {
        border-left: 6px solid #6f42c1;
    }

    .issue-card {
        border-left: 6px solid #fd7e14;
    }

    .status-box {
        border-left: 6px solid #198754;
    }

    .streamlit-expanderHeader {
        color: white !important;
    }

    .stButton button {
        font-weight: 600;
    }

    </style>
    """,
    unsafe_allow_html=True
)


# =========================================================
# TITLE
# =========================================================

st.title("🤖 AI Project Intelligence & Risk Advisor")

st.write(
    "Upload project documents and use AI agents to extract "
    "scope, identify risks, blockers, action items and delivery status."
)


# =========================================================
# DOCUMENT UPLOAD
# =========================================================

st.subheader("📂 Upload Project Documents")

uploaded_files = st.file_uploader(
    "Upload PDF, DOCX, CSV or TXT files",
    type=["pdf", "docx", "csv", "txt"],
    accept_multiple_files=True
)


if uploaded_files:

    os.makedirs("uploads", exist_ok=True)

    total_chunks = 0

    for uploaded_file in uploaded_files:

        file_path = os.path.join(
            "uploads",
            uploaded_file.name
        )

        with open(file_path, "wb") as f:
            f.write(uploaded_file.getbuffer())

        try:

            text = load_document(file_path)

            chunks = chunk_text(text)

            sources = [uploaded_file.name] * len(chunks)

            added = add_documents(
                chunks,
                sources
            )

            total_chunks += added

        except Exception as e:

            st.error(
                f"Error processing {uploaded_file.name}: {e}"
            )

    st.success(
        f"Documents processed successfully. "
        f"{total_chunks} chunks added to the knowledge base."
    )


# =========================================================
# KNOWLEDGE BASE INFORMATION
# =========================================================

st.subheader("📊 Knowledge Base")

try:

    import chromadb

    client = chromadb.PersistentClient(
        path="knowledge_base/chroma_db"
    )

    collection = client.get_or_create_collection(
        name="project_documents"
    )

    count = collection.count()

    col1, col2 = st.columns(2)

    with col1:
        st.metric(
            "Knowledge Base Chunks",
            count
        )

    with col2:
        st.metric(
            "Embedding Model",
            "all-MiniLM-L6-v2"
        )

except Exception:

    st.info(
        "Knowledge base information unavailable."
    )


# =========================================================
# QUESTION
# =========================================================

st.subheader("🔎 Ask About Your Project")

question = st.text_input(
    "Enter your question",
    placeholder="Example: What are the current blockers and action items in the project?"
)


# =========================================================
# SEARCH PROJECT
# =========================================================

if st.button("🔍 Search Project") and question:

    with st.spinner("Analyzing project documents..."):

        # =================================================
        # RETRIEVE DOCUMENTS
        # =================================================

        results = search_documents(
            question,
            top_k=10
        )

        documents = results.get(
            "documents",
            [[]]
        )[0]

        combined_context = "\n\n".join(
            documents
        )


        # =================================================
        # RETRIEVED INFORMATION
        # =================================================

        with st.expander("📚 Retrieved Information"):

            for i, document in enumerate(documents):

                st.markdown(
                    f"""
<div class="info-card">
<h3>Retrieved Chunk {i + 1}</h3>
<p>{document}</p>
</div>
""",
                    unsafe_allow_html=True
                )


        # =================================================
        # SCOPE AGENT
        # =================================================

        st.markdown(
            "## 📋 Scope & Deliverable Extraction"
        )

        try:

            scope_data = extract_scope(
                combined_context
            )


            # -------------------------------------------------
            # PROJECT GOAL
            # -------------------------------------------------

            project_goal = scope_data.get(
                "project_goal",
                ""
            )

            if project_goal:

                st.markdown(
                    f"""
<div class="info-card">
<h3>🎯 Project Goal</h3>
<p>{project_goal}</p>
</div>
""",
                    unsafe_allow_html=True
                )


            # -------------------------------------------------
            # PROJECT SCOPE
            # -------------------------------------------------

            project_scope = scope_data.get(
                "project_scope",
                {}
            )

            included = project_scope.get(
                "included",
                []
            )

            excluded = project_scope.get(
                "excluded",
                []
            )

            if included or excluded:

                st.markdown(
                    "### 📌 Project Scope"
                )

                col1, col2 = st.columns(2)


                # INCLUDED

                with col1:

                    html = """
<div class="info-card">
<h3>✅ Included</h3>
"""

                    for item in included:

                        html += f"""
<p>• {item}</p>
"""

                    html += """
</div>
"""

                    st.markdown(
                        html,
                        unsafe_allow_html=True
                    )


                # EXCLUDED

                with col2:

                    html = """
<div class="info-card">
<h3>❌ Excluded</h3>
"""

                    for item in excluded:

                        html += f"""
<p>• {item}</p>
"""

                    html += """
</div>
"""

                    st.markdown(
                        html,
                        unsafe_allow_html=True
                    )


            # -------------------------------------------------
            # DELIVERABLES
            # -------------------------------------------------

            deliverables = scope_data.get(
                "deliverables",
                []
            )

            if deliverables:

                st.markdown(
                    "### 📦 Deliverables"
                )

                for item in deliverables:

                    if isinstance(item, dict):

                        name = item.get(
                            "deliverable",
                            item.get(
                                "name",
                                ""
                            )
                        )

                    else:

                        name = str(item)

                    st.markdown(
                        f"""
<div class="info-card">
<p>📦 {name}</p>
</div>
""",
                        unsafe_allow_html=True
                    )


            # -------------------------------------------------
            # MILESTONES
            # -------------------------------------------------

            milestones = scope_data.get(
                "milestones",
                []
            )

            if milestones:

                st.markdown(
                    "### 📅 Milestones & Timeline"
                )

                for milestone in milestones:

                    if isinstance(
                        milestone,
                        dict
                    ):

                        name = milestone.get(
                            "milestone",
                            milestone.get(
                                "name",
                                ""
                            )
                        )

                        target = milestone.get(
                            "target_date",
                            milestone.get(
                                "date",
                                ""
                            )
                        )

                        team = milestone.get(
                            "team",
                            ""
                        )

                        status = milestone.get(
                            "status",
                            ""
                        )

                    else:

                        name = str(
                            milestone
                        )

                        target = ""
                        team = ""
                        status = ""


                    st.markdown(
                        f"""
<div class="info-card">

<h3>📌 {name}</h3>

<p>
📅 <b>Target:</b> {target}
</p>

<p>
👥 <b>Team:</b> {team}
</p>

<p>
📍 <b>Status:</b> {status}
</p>

</div>
""",
                        unsafe_allow_html=True
                    )


            # -------------------------------------------------
            # RESPONSIBILITIES
            # -------------------------------------------------

            responsibilities = scope_data.get(
                "responsibilities",
                []
            )

            if responsibilities:

                st.markdown(
                    "### 👥 Team Responsibilities"
                )

                for responsibility in responsibilities:

                    if isinstance(
                        responsibility,
                        dict
                    ):

                        team = responsibility.get(
                            "team",
                            ""
                        )

                        responsibility_text = responsibility.get(
                            "responsibility",
                            ""
                        )

                    else:

                        team = ""

                        responsibility_text = str(
                            responsibility
                        )


                    st.markdown(
                        f"""
<div class="info-card">

<h3>👥 {team}</h3>

<p>
{responsibility_text}
</p>

</div>
""",
                        unsafe_allow_html=True
                    )


        except Exception as e:

            st.error(
                f"Scope Agent Error: {e}"
            )


        # =================================================
        # RISK AGENT
        # =================================================

        st.markdown(
            "## ⚠️ Risk Detection & Delivery Forecast"
        )

        try:

            risk_data = detect_risks(
                combined_context
            )

            risks = risk_data.get(
                "risks",
                []
            )

            if risks:

                for risk in risks:

                    risk_type = risk.get(
                        "risk_type",
                        ""
                    )

                    description = risk.get(
                        "description",
                        ""
                    )

                    probability = risk.get(
                        "probability",
                        ""
                    )

                    impact = risk.get(
                        "impact",
                        ""
                    )

                    affected_area = risk.get(
                        "affected_area",
                        ""
                    )

                    recommended_action = risk.get(
                        "recommended_action",
                        ""
                    )


                    st.markdown(
                        f"""
<div class="risk-card">

<h3>⚠️ {risk_type}</h3>

<p>
<b>Description:</b>
{description}
</p>

<p>
<b>Probability:</b>
{probability}
</p>

<p>
<b>Impact:</b>
{impact}
</p>

<p>
<b>Affected Area:</b>
{affected_area}
</p>

<p>
<b>Recommended Action:</b>
{recommended_action}
</p>

</div>
""",
                        unsafe_allow_html=True
                    )

            else:

                st.info(
                    "No significant risks identified."
                )


            # -------------------------------------------------
            # DELIVERY FORECAST
            # -------------------------------------------------

            forecast = risk_data.get(
                "delivery_forecast",
                {}
            )

            forecast_status = forecast.get(
                "status",
                ""
            )

            reasoning = forecast.get(
                "reasoning",
                ""
            )

            if forecast_status or reasoning:

                st.markdown(
                    f"""
<div class="status-box">

<h2>📈 Delivery Forecast</h2>

<p>
<b>Status:</b>
{forecast_status}
</p>

<p>
<b>Reasoning:</b>
{reasoning}
</p>

</div>
""",
                    unsafe_allow_html=True
                )


        except Exception as e:

            st.error(
                f"Risk Agent Error: {e}"
            )


        # =================================================
        # BLOCKER & ACTION AGENT
        # =================================================

        st.markdown(
            "## 🚧 Blockers & Action Items"
        )

        try:

            blocker_data = identify_blockers_and_actions(
                combined_context
            )


            # =================================================
            # BLOCKERS
            # =================================================

            blockers = blocker_data.get(
                "blockers",
                []
            )

            st.markdown(
                "### 🚧 Current Blockers"
            )

            if blockers:

                for blocker in blockers:

                    description = blocker.get(
                        "description",
                        ""
                    )

                    blocker_type = blocker.get(
                        "blocker_type",
                        ""
                    )

                    affected_area = blocker.get(
                        "affected_area",
                        ""
                    )

                    impact = blocker.get(
                        "impact",
                        ""
                    )


                    st.markdown(
                        f"""
<div class="blocker-card">

<h3>🚧 {blocker_type}</h3>

<p>
<b>Description:</b>
{description}
</p>

<p>
<b>Affected Area:</b>
{affected_area}
</p>

<p>
<b>Impact:</b>
{impact}
</p>

</div>
""",
                        unsafe_allow_html=True
                    )

            else:

                st.success(
                    "No current blockers identified."
                )


            # =================================================
            # ACTION ITEMS
            # =================================================

            action_items = blocker_data.get(
                "action_items",
                []
            )

            st.markdown(
                "### ✅ Action Items"
            )

            if action_items:

                for action in action_items:

                    action_text = action.get(
                        "action",
                        ""
                    )

                    responsible_team = action.get(
                        "responsible_team",
                        ""
                    )

                    due_date = action.get(
                        "due_date",
                        ""
                    )

                    priority = action.get(
                        "priority",
                        ""
                    )

                    status = action.get(
                        "status",
                        ""
                    )


                    st.markdown(
                        f"""
<div class="action-card">

<h3>✅ {action_text}</h3>

<p>
👥 <b>Team:</b>
{responsible_team}
</p>

<p>
📅 <b>Due Date:</b>
{due_date}
</p>

<p>
🔥 <b>Priority:</b>
{priority}
</p>

<p>
📍 <b>Status:</b>
{status}
</p>

</div>
""",
                        unsafe_allow_html=True
                    )

            else:

                st.info(
                    "No explicit action items identified."
                )


            # =================================================
            # PENDING DECISIONS
            # =================================================

            pending_decisions = blocker_data.get(
                "pending_decisions",
                []
            )

            st.markdown(
                "### 🟣 Pending Decisions"
            )

            if pending_decisions:

                for decision in pending_decisions:

                    decision_text = decision.get(
                        "decision",
                        ""
                    )

                    responsible_team = decision.get(
                        "responsible_team",
                        ""
                    )

                    impact = decision.get(
                        "impact",
                        ""
                    )


                    st.markdown(
                        f"""
<div class="decision-card">

<h3>🟣 Pending Decision</h3>

<p>
<b>Decision:</b>
{decision_text}
</p>

<p>
<b>Responsible:</b>
{responsible_team}
</p>

<p>
<b>Impact:</b>
{impact}
</p>

</div>
""",
                        unsafe_allow_html=True
                    )

            else:

                st.info(
                    "No pending decisions identified."
                )


            # =================================================
            # UNRESOLVED ISSUES
            # =================================================

            unresolved_issues = blocker_data.get(
                "unresolved_issues",
                []
            )

            st.markdown(
                "### 🟠 Unresolved Issues"
            )

            if unresolved_issues:

                for issue in unresolved_issues:

                    issue_text = issue.get(
                        "issue",
                        ""
                    )

                    affected_area = issue.get(
                        "affected_area",
                        ""
                    )

                    impact = issue.get(
                        "impact",
                        ""
                    )


                    st.markdown(
                        f"""
<div class="issue-card">

<h3>🟠 Unresolved Issue</h3>

<p>
<b>Issue:</b>
{issue_text}
</p>

<p>
<b>Affected Area:</b>
{affected_area}
</p>

<p>
<b>Impact:</b>
{impact}
</p>

</div>
""",
                        unsafe_allow_html=True
                    )

            else:

                st.info(
                    "No unresolved issues identified."
                )


        except Exception as e:

            st.error(
                f"Blocker & Action Agent Error: {e}"
            )