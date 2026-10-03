import re
from typing import List, Tuple
from backend.models import BlockerItem, ActionItem, TaskAtRisk, RiskItem

def extract_blockers_and_actions(text: str) -> Tuple[List[BlockerItem], List[ActionItem]]:
    if not text or not text.strip():
        return [], []

    lines = [l.strip() for l in text.split("\n") if l.strip()]
    blocker_lines = []
    action_lines = []

    for line in lines:
        lower = line.lower()
        cleaned = re.sub(r"^[-*•\d.]+\s*", "", line).strip()
        if any(term in lower for term in ["blocker", "blocked", "blocking", "impediment", "stopping", "halt"]):
            if len(cleaned) > 20:
                blocker_lines.append(cleaned)
        elif any(term in lower for term in ["action", "todo", "task", "mitigation", "follow-up", "resolve", "implement"]):
            if len(cleaned) > 20:
                action_lines.append(cleaned)

    # Build Blockers
    blockers: List[BlockerItem] = []
    for idx, b in enumerate(blocker_lines[:5]):
        bid = f"BLK-0{idx + 1}"
        words = b.split()
        title = " ".join(words[:7])
        priority = "Critical" if any(w in b.lower() for w in ["critical", "halt", "production", "crash"]) else "High"
        blockers.append(BlockerItem(
            id=bid,
            title=title,
            description=b,
            impact=f"Blocks delivery of key capabilities: {b[:80]}",
            priority=priority,
            status="Active",
            suggestedResolution=f"Schedule urgent technical sync to triage and remove blocker '{title}'."
        ))

    # Build Actions
    actions: List[ActionItem] = []
    for idx, a in enumerate(action_lines[:8]):
        aid = f"ACT-0{idx + 1}"
        words = a.split()
        task_desc = " ".join(words[:12])
        priority = "Critical" if idx == 0 else ("High" if idx < 3 else "Medium")
        actions.append(ActionItem(
            id=aid,
            task=task_desc,
            owner="Engineering Lead" if idx % 2 == 0 else "Project Lead",
            priority=priority,
            deadline="Immediate" if priority == "Critical" else "Sprint Cycle",
            status="Pending",
        ))

    return blockers, actions

def detect_tasks_at_risk(text: str, risks: List[RiskItem]) -> List[TaskAtRisk]:
    tasks: List[TaskAtRisk] = []
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # Extract task-like rows (e.g. from backlog CSV or task lists)
    for idx, line in enumerate(lines):
        lower = line.lower()
        if any(w in lower for w in ["task", "ticket", "t00", "hp-", "sprint"]) or "," in line:
            parts = [p.strip() for p in line.split(",") if p.strip()]
            if len(parts) >= 2:
                tid = parts[0]
                name = parts[1]
                if len(name) > 5 and len(tasks) < 5:
                    related_risk = risks[idx % len(risks)] if risks else None
                    reason = f"At risk due to {related_risk.title} ({related_risk.id})" if related_risk else "Blocked by technical dependencies."
                    tasks.append(TaskAtRisk(
                        id=tid if len(tid) < 12 else f"T-0{idx + 1}",
                        name=name[:40],
                        owner="Sprint Team",
                        dueDate="Target Sprint",
                        severity="Critical" if idx == 0 else "High",
                        riskReason=reason,
                        milestone="Milestone 1",
                    ))

    return tasks
