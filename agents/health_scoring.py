def calculate_project_health(
    scope_result,
    risk_result,
    blocker_result
):
    """
    Calculate overall project health using outputs
    from existing project intelligence agents.

    Dimensions:
    1. Scope Clarity - 40%
    2. Timeline Risk - 30%
    3. Blocker Count - 30%
    """

    # ======================================================
    # 1. SCOPE CLARITY
    # ======================================================

    scope = scope_result or {}

    project_goal = scope.get("project_goal", "")
    project_scope = scope.get("project_scope", {})
    deliverables = scope.get("deliverables", [])

    included = project_scope.get("included", [])
    excluded = project_scope.get("excluded", [])

    scope_evidence = []

    if project_goal:
        scope_evidence.append("Project goal is defined.")

    if included:
        scope_evidence.append(
            f"{len(included)} included scope items identified."
        )

    if excluded:
        scope_evidence.append(
            f"{len(excluded)} excluded scope items identified."
        )

    if deliverables:
        scope_evidence.append(
            f"{len(deliverables)} deliverables identified."
        )

    # Score scope clarity
    if project_goal and included and deliverables:
        scope_score = 100
        scope_status = "Clear"

    elif project_goal and (included or deliverables):
        scope_score = 70
        scope_status = "Watch"

    elif project_goal or included or deliverables:
        scope_score = 50
        scope_status = "Unclear"

    else:
        scope_score = 0
        scope_status = "Insufficient Evidence"

    scope_reason = (
        " ".join(scope_evidence)
        if scope_evidence
        else "Insufficient project scope information."
    )

    # ======================================================
    # 2. TIMELINE RISK
    # ======================================================

    risk = risk_result or {}

    delivery_forecast = risk.get(
        "delivery_forecast",
        {}
    )

    forecast_status = delivery_forecast.get(
        "status",
        ""
    )

    forecast_reasoning = delivery_forecast.get(
        "reasoning",
        ""
    )

    if forecast_status == "On Track":

        timeline_score = 100
        timeline_status = "Low Risk"

    elif forecast_status == "At Risk":

        timeline_score = 60
        timeline_status = "Watch"

    elif forecast_status == "Delayed":

        timeline_score = 30
        timeline_status = "High Risk"

    else:

        timeline_score = 0
        timeline_status = "Insufficient Evidence"

    timeline_reason = forecast_reasoning or (
        "No delivery forecast information available."
    )

    # ======================================================
    # 3. BLOCKER COUNT
    # ======================================================

    blockers = blocker_result or {}

    blocker_list = blockers.get(
        "blockers",
        []
    )

    if not isinstance(blocker_list, list):
        blocker_list = []

    blocker_count = len(blocker_list)

    if blocker_count == 0:

        blocker_score = 100
        blocker_status = "Clear"

    elif blocker_count == 1:

        blocker_score = 80
        blocker_status = "Watch"

    elif blocker_count == 2:

        blocker_score = 60
        blocker_status = "Pending Issues"

    elif blocker_count == 3:

        blocker_score = 40
        blocker_status = "Pending Issues"

    else:

        blocker_score = 20
        blocker_status = "Pending Issues"

    blocker_reason = (
        f"{blocker_count} current blocker(s) identified."
    )

    # ======================================================
    # 4. OVERALL SCORE
    # ======================================================

    # Weighted scoring
    overall_score = round(
        (scope_score * 0.40)
        + (timeline_score * 0.30)
        + (blocker_score * 0.30)
    )

    # ======================================================
    # 5. OVERALL STATUS
    # ======================================================

    if overall_score >= 80:

        overall_status = "Healthy"

    elif overall_score >= 60:

        overall_status = "Needs Attention"

    else:

        overall_status = "Several Issues"

    # ======================================================
    # 6. RETURN RESULT
    # ======================================================

    return {
        "overall_score": overall_score,

        "overall_status": overall_status,

        "dimensions": {

            "scope_clarity": {
                "score": scope_score,
                "status": scope_status,
                "evidence": scope_reason
            },

            "timeline_risk": {
                "score": timeline_score,
                "status": timeline_status,
                "evidence": timeline_reason
            },

            "blocker_count": {
                "score": blocker_score,
                "status": blocker_status,
                "count": blocker_count,
                "evidence": blocker_reason
            }
        }
    }