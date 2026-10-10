import logging
from typing import Dict, Any, List, Optional
try:
    from typing import TypedDict
except ImportError:
    from typing_extensions import TypedDict

from backend.models import (
    ProjectScope,
    RiskItem,
    BlockerItem,
    ActionItem,
    TaskAtRisk,
    HealthBreakdown,
)
from backend.agents.scope_agent import extract_project_scope
from backend.agents.risk_agent import detect_project_risks
from backend.agents.blocker_action_agent import extract_blockers_and_actions, detect_tasks_at_risk
from backend.agents.health_engine import compute_health_score
from backend.agents.doc_gen_agent import build_tabular_doc_output, generate_dossier_markdown

logger = logging.getLogger("langgraph_workflow")

# 1. State Definition
class LangGraphProjectState(TypedDict):
    combined_content: str
    documents: List[Dict[str, Any]]
    scope: ProjectScope
    risks: List[RiskItem]
    blockers: List[BlockerItem]
    actions: List[ActionItem]
    tasks_at_risk: List[TaskAtRisk]
    health: HealthBreakdown
    documentation_output: str
    dossier_markdown: str
    needs_deep_risk_scan: bool
    execution_trace: List[str]

# 2. Agent Node Functions
def scope_agent_node(state: LangGraphProjectState) -> Dict[str, Any]:
    content = state.get("combined_content", "")
    scope = extract_project_scope(content)
    trace = state.get("execution_trace", []) + ["[LangGraph:Python] scope_agent_node: Extracted scope & deliverables."]
    return {"scope": scope, "execution_trace": trace}

def risk_agent_node(state: LangGraphProjectState) -> Dict[str, Any]:
    content = state.get("combined_content", "")
    risks = detect_project_risks(content)
    trace = state.get("execution_trace", []) + [f"[LangGraph:Python] risk_agent_node: Identified {len(risks)} categorized risks."]
    return {"risks": risks, "execution_trace": trace}

def blocker_action_node(state: LangGraphProjectState) -> Dict[str, Any]:
    content = state.get("combined_content", "")
    blockers, actions = extract_blockers_and_actions(content)
    trace = state.get("execution_trace", []) + [f"[LangGraph:Python] blocker_action_node: Extracted {len(blockers)} blockers and {len(actions)} actions."]
    return {"blockers": blockers, "actions": actions, "execution_trace": trace}

def task_risk_node(state: LangGraphProjectState) -> Dict[str, Any]:
    content = state.get("combined_content", "")
    risks = state.get("risks", [])
    tasks_at_risk = detect_tasks_at_risk(content, risks)
    trace = state.get("execution_trace", []) + [f"[LangGraph:Python] task_risk_node: Flagged {len(tasks_at_risk)} tasks at risk."]
    return {"tasks_at_risk": tasks_at_risk, "execution_trace": trace}

def health_engine_node(state: LangGraphProjectState) -> Dict[str, Any]:
    risks = state.get("risks", [])
    blockers = state.get("blockers", [])
    actions = state.get("actions", [])
    history = state.get("health", HealthBreakdown()).history if isinstance(state.get("health"), HealthBreakdown) else []
    
    health = compute_health_score(risks, blockers, actions, history)
    trace = state.get("execution_trace", []) + [f"[LangGraph:Python] health_engine_node: Computed composite health {health.overall}% [{health.status}]."]
    return {"health": health, "execution_trace": trace}

def supervisor_evaluator_node(state: LangGraphProjectState) -> Dict[str, Any]:
    health = state.get("health")
    overall = health.overall if health else 100
    risks = state.get("risks", [])
    crit_risks = [r for r in risks if r.severity == "Critical"]
    
    should_deep_scan = overall < 70 or len(crit_risks) >= 1
    branch = "deep_risk_mitigation" if should_deep_scan else "doc_gen_agent"
    trace = state.get("execution_trace", []) + [f"[LangGraph:Python] supervisor_evaluator_node: Branching to {branch}."]
    return {"needs_deep_risk_scan": should_deep_scan, "execution_trace": trace}

def deep_risk_mitigation_node(state: LangGraphProjectState) -> Dict[str, Any]:
    risks = state.get("risks", [])
    for r in risks:
        if r.severity in ["Critical", "High"] and not r.mitigation.startswith("[Priority Contingency]"):
            r.mitigation = f"[Priority Contingency] Automated SLA buffer + Redundant fallback: {r.mitigation}"
    trace = state.get("execution_trace", []) + ["[LangGraph:Python] deep_risk_mitigation_node: Escalated contingency protocols for critical/high risks."]
    return {"risks": risks, "execution_trace": trace}

def doc_gen_agent_node(state: LangGraphProjectState) -> Dict[str, Any]:
    scope = state.get("scope", ProjectScope())
    risks = state.get("risks", [])
    blockers = state.get("blockers", [])
    actions = state.get("actions", [])
    health = state.get("health", HealthBreakdown())

    tabular = build_tabular_doc_output(scope, risks, actions)
    dossier = generate_dossier_markdown(scope, risks, blockers, actions, health)
    trace = state.get("execution_trace", []) + ["[LangGraph:Python] doc_gen_agent_node: Master documentation synthesized."]
    return {
        "documentation_output": tabular,
        "dossier_markdown": dossier.get("content", ""),
        "execution_trace": trace,
    }

# 3. LangGraph StateGraph Compilation
def build_python_langgraph_pipeline():
    try:
        from langgraph.graph import StateGraph, END, START # type: ignore
        workflow = StateGraph(LangGraphProjectState)
        
        workflow.add_node("scope_agent", scope_agent_node)
        workflow.add_node("risk_agent", risk_agent_node)
        workflow.add_node("blocker_action_agent", blocker_action_node)
        workflow.add_node("task_risk_agent", task_risk_node)
        workflow.add_node("health_engine", health_engine_node)
        workflow.add_node("supervisor_evaluator", supervisor_evaluator_node)
        workflow.add_node("deep_risk_mitigation", deep_risk_mitigation_node)
        workflow.add_node("doc_gen_agent", doc_gen_agent_node)

        workflow.set_entry_point("scope_agent")
        workflow.add_edge("scope_agent", "risk_agent")
        workflow.add_edge("risk_agent", "blocker_action_agent")
        workflow.add_edge("blocker_action_agent", "task_risk_agent")
        workflow.add_edge("task_risk_agent", "health_engine")
        workflow.add_edge("health_engine", "supervisor_evaluator")

        def route_evaluator(state: LangGraphProjectState):
            if state.get("needs_deep_risk_scan", False):
                return "deep_risk_mitigation"
            return "doc_gen_agent"

        workflow.add_conditional_edges("supervisor_evaluator", route_evaluator, {
            "deep_risk_mitigation": "deep_risk_mitigation",
            "doc_gen_agent": "doc_gen_agent",
        })
        workflow.add_edge("deep_risk_mitigation", "doc_gen_agent")
        workflow.add_edge("doc_gen_agent", END)

        return workflow.compile()
    except Exception as e:
        logger.warning(f"Could not initialize native Python langgraph module ({e}). Using graph-node dispatcher fallback.")
        return None

compiled_python_langgraph = build_python_langgraph_pipeline()

def run_langgraph_pipeline(combined_content: str, documents: List[Dict[str, Any]] = None) -> LangGraphProjectState:
    """Execute the multi-agent pipeline using LangGraph StateGraph semantics."""
    initial_state: LangGraphProjectState = {
        "combined_content": combined_content,
        "documents": documents or [],
        "scope": ProjectScope(),
        "risks": [],
        "blockers": [],
        "actions": [],
        "tasks_at_risk": [],
        "health": HealthBreakdown(),
        "documentation_output": "",
        "dossier_markdown": "",
        "needs_deep_risk_scan": False,
        "execution_trace": ["[LangGraph] StateGraph Pipeline Invocation Started"],
    }

    if compiled_python_langgraph:
        return compiled_python_langgraph.invoke(initial_state)

    # Deterministic sequential dispatcher preserving exact LangGraph State transitions
    state = dict(initial_state)
    state.update(scope_agent_node(state))
    state.update(risk_agent_node(state))
    state.update(blocker_action_node(state))
    state.update(task_risk_node(state))
    state.update(health_engine_node(state))
    state.update(supervisor_evaluator_node(state))
    if state.get("needs_deep_risk_scan"):
        state.update(deep_risk_mitigation_node(state))
    state.update(doc_gen_agent_node(state))
    return state
