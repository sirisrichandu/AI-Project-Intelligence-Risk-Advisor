import os
import json
import base64
import requests
import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

# ==============================================================================
# STREAMLIT CONFIGURATION & CUSTOM STYLING
# ==============================================================================
st.set_page_config(
    page_title="AI Project Intelligence & Risk Advisor",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for dark-mode SaaS appearance
st.markdown("""
<style>
    .metric-card {
        background-color: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 12px;
    }
    .status-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        font-family: monospace;
        text-transform: uppercase;
    }
    .badge-critical { background-color: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .badge-high { background-color: rgba(249, 115, 22, 0.2); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.4); }
    .badge-medium { background-color: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4); }
    .badge-low { background-color: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
    .badge-healthy { background-color: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
</style>
""", unsafe_allow_html=True)

# ==============================================================================
# FASTAPI BACKEND CLIENT
# ==============================================================================
FASTAPI_DEFAULT_URL = os.getenv("FASTAPI_URL", "http://localhost:8000")

# Initialize Session State
if "fastapi_url" not in st.session_state:
    st.session_state.fastapi_url = FASTAPI_DEFAULT_URL
if "messages" not in st.session_state:
    st.session_state.messages = []

def get_api_url(endpoint: str) -> str:
    base = st.session_state.fastapi_url.rstrip("/")
    if not endpoint.startswith("/"):
        endpoint = "/" + endpoint
    return f"{base}{endpoint}"

def check_backend_connection() -> bool:
    try:
        res = requests.get(get_api_url("/api/health-check"), timeout=2)
        return res.status_code == 200
    except Exception:
        return False

def api_get(endpoint: str):
    try:
        res = requests.get(get_api_url(endpoint), timeout=15)
        if res.status_code == 200:
            return res.json()
        return None
    except Exception as e:
        st.error(f"API Error ({endpoint}): {str(e)}")
        return None

def api_post(endpoint: str, payload: dict = None):
    try:
        res = requests.post(get_api_url(endpoint), json=payload or {}, timeout=30)
        if res.status_code == 200:
            return res.json()
        st.error(f"Request failed ({res.status_code}): {res.text}")
        return None
    except Exception as e:
        st.error(f"API Connection Error: {str(e)}")
        return None

def api_delete(endpoint: str):
    try:
        res = requests.delete(get_api_url(endpoint), timeout=10)
        return res.status_code == 200
    except Exception as e:
        st.error(f"API Delete Error: {str(e)}")
        return False

# ==============================================================================
# SIDEBAR NAVIGATION & BACKEND SETTINGS
# ==============================================================================
with st.sidebar:
    st.image("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60", width=48)
    st.title("Project Advisor")
    st.caption("Autonomous Multi-Agent Intelligence")

    # FastAPI Connection Status
    st.markdown("---")
    backend_online = check_backend_connection()
    if backend_online:
        st.success(f"● FastAPI Backend: Connected ({st.session_state.fastapi_url})")
    else:
        st.warning(f"○ Backend Disconnected: {st.session_state.fastapi_url}")
        with st.expander("Configure Backend URL"):
            new_url = st.text_input("FastAPI Endpoint", value=st.session_state.fastapi_url)
            if st.button("Reconnect"):
                st.session_state.fastapi_url = new_url
                st.rerun()

    st.markdown("---")
    page = st.radio(
        "Navigation",
        [
            "📊 Dashboard",
            "📁 Ingest Documents",
            "⚡ Multi-Agent Pipeline",
            "⚠️ Risk Register & Matrix",
            "🛑 Blockers & Action Items",
            "🩺 Health Score Breakdown",
            "📄 Documentation & Dossier",
            "💬 Project Advisor Chat"
        ]
    )

    st.markdown("---")
    st.markdown("""
    **Multi-Agent Engines:**
    - 🎯 *Scope Agent*
    - 🔍 *Risk Detection Agent*
    - 🚧 *Blocker & Action Agent*
    - 🩺 *Health Scoring Engine*
    - 📄 *DocGen Agent*
    """)

# ==============================================================================
# PAGE 1: DASHBOARD
# ==============================================================================
if page == "📊 Dashboard":
    st.title("Project Intelligence Dashboard")
    st.markdown("Autonomous multi-agent oversight of project scope, technical risks, schedule bottlenecks, and team blockers.")

    docs_data = api_get("/api/documents")
    docs = docs_data.get("documents", []) if docs_data else []
    health_data = api_get("/api/health") or {}
    risks_data = api_get("/api/risks") or {}
    blockers_data = api_get("/api/blockers") or {}
    actions_data = api_get("/api/actions") or {}

    # Key Metrics Bar
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        overall_health = health_data.get("overall", 0)
        st.metric(label="Overall Health", value=f"{overall_health} / 100", delta=health_data.get("trend", "Stable"))
    with col2:
        st.metric(label="Ingested Docs", value=len(docs))
    with col3:
        risks_count = len(risks_data.get("risks", []))
        critical_count = sum(1 for r in risks_data.get("risks", []) if r.get("severity") == "Critical")
        st.metric(label="Total Risks", value=risks_count, delta=f"{critical_count} Critical" if critical_count else None, delta_color="inverse")
    with col4:
        blockers_count = sum(1 for b in blockers_data.get("blockers", []) if b.get("status") == "Active")
        st.metric(label="Active Blockers", value=blockers_count, delta_color="inverse")
    with col5:
        actions_count = len(actions_data.get("actions", []))
        st.metric(label="Pending Actions", value=actions_count)

    st.markdown("---")

    col_left, col_right = st.columns([3, 2])

    with col_left:
        st.subheader("🎯 Project Scope & Deliverables")
        scope_data = api_get("/api/scope") or {}
        if scope_data.get("summary"):
            st.info(scope_data.get("summary"))
        else:
            st.write("No scope extracted yet. Ingest documents and run the multi-agent pipeline.")

        objectives = scope_data.get("objectives", [])
        if objectives:
            st.markdown("#### Core Strategic Objectives")
            for obj in objectives[:5]:
                st.markdown(f"- {obj}")

    with col_right:
        st.subheader("🩺 Health Dimension Scores")
        metrics = health_data.get("metrics", {})
        if metrics:
            categories = ['Risk Index', 'Schedule', 'Scope', 'Blockers', 'Resources']
            values = [
                metrics.get('riskScore', 0),
                metrics.get('scheduleScore', 0),
                metrics.get('scopeScore', 0),
                metrics.get('blockerScore', 0),
                metrics.get('resourceScore', 0)
            ]
            fig = go.Figure()
            fig.add_trace(go.Scatterpolar(
                r=values + [values[0]],
                theta=categories + [categories[0]],
                fill='toself',
                fillcolor='rgba(20, 184, 166, 0.3)',
                line=dict(color='#14b8a6', width=2),
                name='Health'
            ))
            fig.update_layout(
                polar=dict(radialaxis=dict(visible=True, range=[0, 100])),
                showlegend=False,
                margin=dict(l=30, r=30, t=20, b=20),
                height=260
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.write("Awaiting document analysis.")

# ==============================================================================
# PAGE 2: INGEST DOCUMENTS
# ==============================================================================
elif page == "📁 Ingest Documents":
    st.title("Project Document Ingestion")
    st.markdown("Upload project specifications, SRS, Jira export backlogs, architecture blueprints, or team meeting minutes.")

    uploaded_files = st.file_uploader(
        "Choose project files (PDF, DOCX, XLSX, CSV, TXT)",
        type=["pdf", "docx", "xlsx", "csv", "txt", "md"],
        accept_multiple_files=True
    )

    if uploaded_files:
        if st.button("Ingest Uploaded Documents into FastAPI Knowledge Base", type="primary"):
            payload = []
            for f in uploaded_files:
                file_bytes = f.read()
                b64_str = base64.b64encode(file_bytes).decode("utf-8")
                
                # Determine document category
                cat = "General"
                fname = f.name.lower()
                if "srs" in fname or "req" in fname or "spec" in fname:
                    cat = "Requirements"
                elif "arch" in fname or "design" in fname or "infra" in fname:
                    cat = "Architecture"
                elif "sprint" in fname or "meet" in fname or "note" in fname:
                    cat = "Meeting Notes"
                elif "task" in fname or "jira" in fname or "backlog" in fname:
                    cat = "Task Tracker"

                payload.append({
                    "name": f.name,
                    "type": cat,
                    "size": f"{len(file_bytes) / 1024:.1f} KB",
                    "base64": b64_str
                })

            with st.spinner("Indexing and chunking documents in FastAPI..."):
                res = api_post("/api/upload-json", {"files": payload})
                if res:
                    st.success(f"Successfully ingested {len(payload)} documents! Run the pipeline to analyze them.")
                    st.rerun()

    st.markdown("---")
    st.subheader("Currently Ingested Project Documents")

    docs_data = api_get("/api/documents")
    docs = docs_data.get("documents", []) if docs_data else []

    if docs:
        col_act1, col_act2 = st.columns([1, 4])
        with col_act1:
            if st.button("🗑️ Clear All Documents", type="secondary"):
                if api_delete("/api/documents"):
                    st.success("Knowledge base cleared.")
                    st.rerun()

        doc_rows = []
        for d in docs:
            doc_rows.append({
                "Document Name": d.get("name"),
                "Category": d.get("category"),
                "Size": d.get("size"),
                "Indexed Chunks": d.get("chunkCount", 0),
                "Upload Date": d.get("uploadDate", "")[:10]
            })
        st.dataframe(pd.DataFrame(doc_rows), use_container_width=True)
    else:
        st.info("No project documents uploaded yet. Upload your files above to begin.")

# ==============================================================================
# PAGE 3: MULTI-AGENT PIPELINE
# ==============================================================================
elif page == "⚡ Multi-Agent Pipeline":
    st.title("Autonomous Multi-Agent Pipeline")
    st.markdown("Trigger sequential agent analysis across all ingested project documents.")

    docs_data = api_get("/api/documents")
    docs = docs_data.get("documents", []) if docs_data else []

    if not docs:
        st.warning("⚠️ No documents in knowledge base! Please ingest project documents in the 'Ingest Documents' tab before executing the pipeline.")
    else:
        st.info(f"Ready to analyze **{len(docs)} documents** using the multi-agent intelligence suite.")
        
        if st.button("🚀 Execute Autonomous Pipeline", type="primary"):
            progress_bar = st.progress(0)
            status_text = st.empty()

            status_text.text("1/5: Scope Extraction Agent analyzing objectives and constraints...")
            progress_bar.progress(20)

            status_text.text("2/5: Risk Detection Agent identifying technical debt, architecture, and team risks...")
            progress_bar.progress(40)

            status_text.text("3/5: Blocker & Action Agent cataloging active delivery impediments...")
            progress_bar.progress(60)

            status_text.text("4/5: Health Engine computing composite 0-100 score across 5 dimensions...")
            progress_bar.progress(80)

            res = api_post("/api/pipeline/run")
            progress_bar.progress(100)

            if res:
                status_text.text("5/5: Pipeline completed successfully!")
                st.success("All 5 agents finished execution and updated project intelligence.")
                
                # Show quick summary
                health_score = res.get("health", {}).get("overall", 0)
                risks_found = len(res.get("risks", []))
                blockers_found = len(res.get("blockers", []))
                
                col1, col2, col3 = st.columns(3)
                col1.metric("Calculated Health Score", f"{health_score} / 100")
                col2.metric("Risks Detected", risks_found)
                col3.metric("Blockers Identified", blockers_found)
            else:
                st.error("Pipeline run failed. Check backend connection.")

# ==============================================================================
# PAGE 4: RISK REGISTER & MATRIX
# ==============================================================================
elif page == "⚠️ Risk Register & Matrix":
    st.title("Project Risk Register & Priority Matrix")
    
    risks_data = api_get("/api/risks") or {}
    risks = risks_data.get("risks", [])

    if not risks:
        st.info("No risks detected. Ingest documents and run the Multi-Agent Pipeline.")
    else:
        # Plotly 2D Scatter Matrix
        st.subheader("Probability vs. Impact Risk Matrix")
        plot_data = []
        for r in risks:
            plot_data.append({
                "Risk ID": r.get("id"),
                "Title": r.get("title"),
                "Category": r.get("category"),
                "Probability (%)": r.get("probability", 50),
                "Impact (%)": r.get("impact", 50),
                "Severity": r.get("severity", "Medium"),
                "Mitigation": r.get("mitigation", "")
            })
        
        df_risks = pd.DataFrame(plot_data)
        
        color_map = {
            "Critical": "#ef4444",
            "High": "#f97316",
            "Medium": "#eab308",
            "Low": "#3b82f6"
        }
        
        fig = px.scatter(
            df_risks,
            x="Probability (%)",
            y="Impact (%)",
            color="Severity",
            hover_name="Title",
            hover_data=["Risk ID", "Category", "Mitigation"],
            color_discrete_map=color_map,
            size=[14] * len(df_risks),
            range_x=[0, 105],
            range_y=[0, 105]
        )
        
        # Add quadrant divider lines
        fig.add_hline(y=50, line_dash="dash", line_color="#334155")
        fig.add_vline(x=50, line_dash="dash", line_color="#334155")
        fig.update_layout(height=400, margin=dict(l=40, r=40, t=20, b=40))
        st.plotly_chart(fig, use_container_width=True)

        st.subheader("Enterprise Risk Register Table")
        st.dataframe(df_risks[["Risk ID", "Title", "Category", "Severity", "Probability (%)", "Impact (%)", "Mitigation"]], use_container_width=True)

# ==============================================================================
# PAGE 5: BLOCKERS & ACTION ITEMS
# ==============================================================================
elif page == "🛑 Blockers & Action Items":
    st.title("Delivery Blockers & Assigned Action Items")

    tab1, tab2 = st.tabs(["Active Blockers", "Mitigation Action Items"])

    with tab1:
        blockers_data = api_get("/api/blockers") or {}
        blockers = blockers_data.get("blockers", [])
        if blockers:
            b_list = []
            for b in blockers:
                b_list.append({
                    "ID": b.get("id"),
                    "Description": b.get("description"),
                    "Severity": b.get("severity"),
                    "Status": b.get("status"),
                    "Affected Modules": ", ".join(b.get("affectedModules", [])),
                    "Raised Date": b.get("identifiedDate", "")
                })
            st.dataframe(pd.DataFrame(b_list), use_container_width=True)
        else:
            st.info("No active blockers detected.")

    with tab2:
        actions_data = api_get("/api/actions") or {}
        actions = actions_data.get("actions", [])
        if actions:
            a_list = []
            for a in actions:
                a_list.append({
                    "ID": a.get("id"),
                    "Action Task": a.get("task"),
                    "Responsible Team / Owner": a.get("owner"),
                    "Deadline": a.get("deadline"),
                    "Priority": a.get("priority"),
                    "Status": a.get("status")
                })
            st.dataframe(pd.DataFrame(a_list), use_container_width=True)
        else:
            st.info("No action items assigned.")

# ==============================================================================
# PAGE 6: HEALTH SCORE BREAKDOWN
# ==============================================================================
elif page == "🩺 Health Score Breakdown":
    st.title("Project Health Scoring Engine")

    health_data = api_get("/api/health") or {}
    overall = health_data.get("overall", 0)
    status_label = health_data.get("status", "Evaluating")
    metrics = health_data.get("metrics", {})

    col1, col2 = st.columns([1, 2])
    with col1:
        fig_gauge = go.Figure(go.Indicator(
            mode="gauge+number",
            value=overall,
            domain={'x': [0, 1], 'y': [0, 1]},
            title={'text': f"Status: {status_label}", 'font': {'size': 18}},
            gauge={
                'axis': {'range': [0, 100]},
                'bar': {'color': "#14b8a6"},
                'steps': [
                    {'range': [0, 50], 'color': "rgba(239, 68, 68, 0.2)"},
                    {'range': [50, 75], 'color': "rgba(234, 179, 8, 0.2)"},
                    {'range': [75, 100], 'color': "rgba(16, 185, 129, 0.2)"}
                ]
            }
        ))
        fig_gauge.update_layout(height=260, margin=dict(l=20, r=20, t=30, b=20))
        st.plotly_chart(fig_gauge, use_container_width=True)

    with col2:
        st.markdown(f"**Diagnostic Summary:** {health_data.get('summary', 'Upload documents to evaluate project health.')}")
        st.markdown(f"**Historical Trend:** `{health_data.get('trend', 'Stable')}`")

    st.markdown("---")
    st.subheader("Sub-Score Metrics")
    m_col1, m_col2, m_col3, m_col4, m_col5 = st.columns(5)
    m_col1.metric("Risk Score", f"{metrics.get('riskScore', 0)}/100")
    m_col2.metric("Schedule Score", f"{metrics.get('scheduleScore', 0)}/100")
    m_col3.metric("Scope Score", f"{metrics.get('scopeScore', 0)}/100")
    m_col4.metric("Blocker Score", f"{metrics.get('blockerScore', 0)}/100")
    m_col5.metric("Resource Score", f"{metrics.get('resourceScore', 0)}/100")

# ==============================================================================
# PAGE 7: DOCUMENTATION GENERATION & DOSSIER
# ==============================================================================
elif page == "📄 Documentation & Dossier":
    st.title("Project Documentation & Master Dossier")
    st.markdown("Synthesized User Stories, Risk Register, and Action Items generated by the Documentation Agent.")

    doc_res = api_get("/api/documentation/latest") or {}
    doc_output = doc_res.get("documentationOutput", "")
    has_docs = doc_res.get("hasDocuments", False)

    if not has_docs or not doc_output or doc_output.strip() == "":
        st.warning("⚠️ No documents uploaded yet. Please ingest your project documents in the 'Ingest Documents' tab to synthesize genuine User Stories and Risk Registers.")
    else:
        st.success("Documentation synthesized from uploaded project artifacts.")
        
        # Download Buttons
        col_dl1, col_dl2 = st.columns([1, 4])
        with col_dl1:
            st.download_button(
                label="📥 Download Tabular .TXT",
                data=doc_output,
                file_name="Project_Documentation_UserStories_RiskRegister.txt",
                mime="text/plain"
            )

        st.text_area("Synthesized Master Output (Tab-Delimited)", doc_output, height=450)

# ==============================================================================
# PAGE 8: NATURAL LANGUAGE PROJECT ADVISOR (CHAT)
# ==============================================================================
elif page == "💬 Project Advisor Chat":
    st.title("Conversational Project Advisor")
    st.markdown("Ask anything regarding project scope, delivery risks, blockers, deadlines, or health status.")

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if "agent" in msg:
                st.caption(f"Engine: {msg['agent']} | Sources: {', '.join(msg.get('sources', []))}")

    prompt = st.chat_input("E.g., What are the highest risks to our target deadline?")
    if prompt:
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.spinner("Consulting intelligence agents..."):
                res = api_post("/api/ask", {"query": prompt})
                if res:
                    answer = res.get("answer", "No answer received.")
                    agent_used = res.get("agentUsed", "Routing Agent")
                    sources = res.get("sources", [])
                    st.markdown(answer)
                    st.caption(f"Engine: {agent_used} | Sources: {', '.join(sources)}")
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": answer,
                        "agent": agent_used,
                        "sources": sources
                    })
                else:
                    st.error("Failed to get response from backend.")
