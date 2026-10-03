from typing import List, Dict, Any
from datetime import datetime
from backend.models import (
    ProjectScope,
    RiskItem,
    BlockerItem,
    ActionItem,
    HealthBreakdown,
)

def build_tabular_doc_output(
    scope: ProjectScope,
    risks: List[RiskItem],
    actions: List[ActionItem],
) -> str:
    # 1. User Stories
    raw_objectives = scope.objectives if (scope and scope.objectives) else []

    if not raw_objectives and not risks and not actions:
        return ""

    user_stories = []
    for i, obj in enumerate(raw_objectives):
        num = f"US-0{i + 1}"
        clean_obj = obj.lstrip("-*• 0123456789.").strip()
        user_stories.append(
            f"{num}\tAs a Project Member, I want to {clean_obj}, so that project delivery milestones are achieved on schedule."
        )

    # 2. Risk Register
    risk_rows = []
    for i, r in enumerate(risks or []):
        rid = r.id or f"R-0{i + 1}"
        p = f"{r.probability}%" if r.probability else "50%"
        imp = f"{r.impact}%" if r.impact else "50%"
        clean_title = (r.title or "Identified project constraint").replace("\t", " ").replace("\n", " ")
        clean_mit = (r.mitigation or "Continuous monitoring").replace("\t", " ").replace("\n", " ")
        risk_rows.append(f"{rid}\t{clean_title}\t{r.category or 'Technical'}\t{p}\t{imp}\t{clean_mit}")

    if not risk_rows:
        risk_rows.append("R-01\tNo critical risks detected in current documents\tGeneral\t—\t—\tContinue continuous monitoring")

    # 3. Action Items
    action_rows = []
    for i, a in enumerate(actions or []):
        aid = a.id or f"A-0{i + 1}"
        clean_task = (a.task or "Review project status").replace("\t", " ").replace("\n", " ")
        owner = a.owner or "Project Lead"
        deadline = a.deadline or "Upcoming"
        priority = a.priority or "High"
        status = a.status or "Pending"
        action_rows.append(f"{aid}\t{clean_task}\t{owner}\t{deadline}\t{priority}\t{status}")

    if not action_rows:
        action_rows.append("A-01\tReview and verify uploaded project documentation\tProject Lead\tImmediate\tHigh\tPending")

    return "\n".join([
        "1. User Stories",
        "ID\tUser Story",
        *user_stories,
        "",
        "2. Risk Register",
        "ID\tRisk\tType\tProbability\tImpact\tMitigation",
        *risk_rows,
        "",
        "3. Action Items",
        "ID\tAction\tResponsible Team\tDue Date\tPriority\tStatus",
        *action_rows,
    ])

def generate_dossier_markdown(
    scope: ProjectScope,
    risks: List[RiskItem],
    blockers: List[BlockerItem],
    actions: List[ActionItem],
    health: HealthBreakdown,
) -> Dict[str, Any]:
    current_date = datetime.now().strftime("%B %d, %Y")

    risk_lines = "\n".join(
        [f"| **{r.id}** | {r.category} | {r.title} | **{r.severity.upper()}** | {r.probability}% | {r.impact}% | {r.mitigation} | {r.status} |" for r in risks]
    ) if risks else "| — | — | No risks detected in current documents | — | — | — | Active monitoring | Healthy |"

    blocker_lines = "\n".join(
        [f"| **{b.id}** | {b.title} | **{b.priority.upper()}** | {b.impact} | {b.suggestedResolution} | {b.status} |" for b in blockers]
    ) if blockers else "| — | No active blockers | — | All streams operational | Continue execution | Resolved |"

    action_lines = "\n".join(
        [f"| **{a.id}** | {a.task} | {a.owner} | {a.priority} | {a.deadline} | {a.status} |" for a in actions]
    ) if actions else "| — | Review latest project status | Project Lead | High | Upcoming | Pending |"

    content = f"""# Master Project Intelligence & Risk Dossier
**Assessment Date:** {current_date}  
**Project Health Rating:** **{health.overall} / 100 — {health.status.upper()}**

---

### 1. Executive Intelligence Briefing
{scope.summary or scope.scope or 'Project intelligence compiled from uploaded documentation.'}

---

### 2. Project Health Score Breakdown
- **Overall Composite Health Score:** **{health.overall} / 100** ({health.status})
- **Summary:** {health.summary}

---

### 3. Scope & Strategic Objectives
{chr(10).join([f'{i+1}. {o}' for i, o in enumerate(scope.objectives)]) if scope.objectives else '- Objectives defined in uploaded documents.'}

---

### 4. Enterprise Risk Register
| Risk ID | Category | Risk Description | Severity | Prob (%) | Imp (%) | Assigned Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
{risk_lines}

---

### 5. Active Blockers
| Blocker ID | Description | Priority | Impact | Resolution Strategy | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
{blocker_lines}

---

### 6. Assigned Action Items
| Action ID | Task Description | Owner | Priority | Target Date | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
{action_lines}"""

    return {
        "title": "Master Project Intelligence & Risk Dossier",
        "format": "MARKDOWN",
        "content": content,
    }
