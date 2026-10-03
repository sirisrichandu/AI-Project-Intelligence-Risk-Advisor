from typing import List
from datetime import datetime
from backend.models import (
    RiskItem,
    BlockerItem,
    ActionItem,
    HealthBreakdown,
    HealthScoreMetrics,
    HealthHistoryPoint,
)

def compute_health_score(
    risks: List[RiskItem],
    blockers: List[BlockerItem],
    actions: List[ActionItem],
    previous_history: List[HealthHistoryPoint] = None,
) -> HealthBreakdown:
    if previous_history is None:
        previous_history = []

    # If no data at all
    if not risks and not blockers and not actions:
        return HealthBreakdown(
            overall=0,
            status="Awaiting Documents",
            metrics=HealthScoreMetrics(),
            summary="Upload your real project documents (PDF, DOCX, XLSX, CSV, TXT) and run the pipeline to calculate the health score.",
            trend="Stable",
            history=previous_history,
        )

    # 1. Risk Score: 100 base minus penalties
    critical_risks = [r for r in risks if r.severity.lower() == "critical"]
    high_risks = [r for r in risks if r.severity.lower() == "high"]
    moderate_risks = [r for r in risks if r.severity.lower() in ["moderate", "medium"]]

    risk_penalty = (len(critical_risks) * 18) + (len(high_risks) * 9) + (len(moderate_risks) * 4)
    risk_score = max(20, min(100, 100 - risk_penalty))

    # 2. Blocker Score: 100 base minus active blockers
    critical_blockers = [b for b in blockers if b.priority.lower() == "critical"]
    high_blockers = [b for b in blockers if b.priority.lower() == "high"]
    blocker_penalty = (len(critical_blockers) * 22) + (len(high_blockers) * 12) + (max(0, len(blockers) - len(critical_blockers) - len(high_blockers)) * 6)
    blocker_score = max(15, min(100, 100 - blocker_penalty))

    # 3. Schedule Score
    schedule_risks = [r for r in risks if r.category.lower() == "schedule"]
    overdue_actions = [a for a in actions if a.status.lower() == "overdue"]
    schedule_penalty = (len(schedule_risks) * 14) + (len(overdue_actions) * 16)
    schedule_score = max(25, min(100, 100 - schedule_penalty))

    # 4. Scope Score
    req_risks = [r for r in risks if r.category.lower() in ["requirement", "dependency"]]
    scope_score = max(30, min(100, 100 - (len(req_risks) * 12)))

    # 5. Resource Score
    res_risks = [r for r in risks if r.category.lower() in ["resource", "quality", "technical"]]
    resource_score = max(30, min(100, 100 - (len(res_risks) * 10)))

    # Composite weighted health
    # Risk (25%), Blocker (25%), Schedule (20%), Scope (15%), Resource (15%)
    overall = int(round(
        (risk_score * 0.25) +
        (blocker_score * 0.25) +
        (schedule_score * 0.20) +
        (scope_score * 0.15) +
        (resource_score * 0.15)
    ))
    overall = max(10, min(100, overall))

    status = "Healthy" if overall >= 75 else "At Risk" if overall >= 50 else "Critical"

    summary = (
        f"Project health calculated at {overall}/100 ({status}). "
        f"Assessed {len(risks)} risk(s) and {len(blockers)} active blocker(s) across ingested documentation."
    )

    new_history = list(previous_history)
    current_date = datetime.now().strftime("%Y-%m-%d")
    new_history.append(HealthHistoryPoint(date=current_date, score=overall, note=f"Pipeline assessment: {status}"))

    return HealthBreakdown(
        overall=overall,
        status=status,
        metrics=HealthScoreMetrics(
            riskScore=risk_score,
            scheduleScore=schedule_score,
            scopeScore=scope_score,
            blockerScore=blocker_score,
            resourceScore=resource_score,
        ),
        summary=summary,
        trend="Stable" if len(new_history) < 2 else ("Improving" if overall >= new_history[-2].score else "Declining"),
        history=new_history[-10:],
    )
