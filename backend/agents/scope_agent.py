import re
from typing import List
from backend.models import ProjectScope

def extract_project_scope(text: str) -> ProjectScope:
    if not text or not text.strip():
        return ProjectScope(
            summary="Knowledge base is currently empty. Upload your project documents to extract real project intelligence."
        )

    lines = [line.strip() for line in text.split("\n") if line.strip()]
    objectives: List[str] = []
    requirements: List[str] = []
    deliverables: List[str] = []
    milestones: List[str] = []
    constraints: List[str] = []

    # Heuristic extraction from document sections
    current_section = None
    for line in lines:
        lower = line.lower()
        if any(h in lower for h in ["objective", "goal", "purpose"]):
            current_section = "objectives"
            continue
        elif any(h in lower for h in ["requirement", "scope", "specification"]):
            current_section = "requirements"
            continue
        elif any(h in lower for h in ["deliverable", "output"]):
            current_section = "deliverables"
            continue
        elif any(h in lower for h in ["milestone", "timeline", "schedule", "deadline"]):
            current_section = "milestones"
            continue
        elif any(h in lower for h in ["constraint", "limitation", "dependency"]):
            current_section = "constraints"
            continue

        if re.match(r"^[-*•\d.]+\s+", line):
            cleaned = re.sub(r"^[-*•\d.]+\s*", "", line).strip()
            if len(cleaned) > 10:
                if current_section == "objectives" and len(objectives) < 8:
                    objectives.append(cleaned)
                elif current_section == "requirements" and len(requirements) < 10:
                    requirements.append(cleaned)
                elif current_section == "deliverables" and len(deliverables) < 8:
                    deliverables.append(cleaned)
                elif current_section == "milestones" and len(milestones) < 8:
                    milestones.append(cleaned)
                elif current_section == "constraints" and len(constraints) < 6:
                    constraints.append(cleaned)

    # Defaults if section headers weren't found
    if not objectives:
        for line in lines:
            if any(k in line.lower() for k in ["shall", "must", "deliver", "support", "provide", "integrate"]):
                cleaned = re.sub(r"^[-*•\d.]+\s*", "", line).strip()
                if 15 < len(cleaned) < 140:
                    objectives.append(cleaned)
                    if len(objectives) >= 5:
                        break

    if not objectives:
        objectives = [
            "Centralize and index uploaded project specifications",
            "Identify key delivery bottlenecks and dependency risks",
            "Track project timeline milestones and action items"
        ]

    first_para = next((l for l in lines if len(l) > 60 and not l.startswith("#")), lines[0] if lines else "")
    summary = f"Project intelligence extracted from uploaded documents. Found {len(objectives)} key objective(s)."
    if first_para:
        summary = f"{first_para[:180]}... Synthesized from ingested documents."

    return ProjectScope(
        objectives=objectives,
        scope=summary,
        requirements=requirements or objectives,
        deliverables=deliverables or ["Verified Project Release", "Quality Acceptance Sign-off"],
        milestones=milestones or ["Phase 1: Ingestion", "Phase 2: Integration", "Phase 3: UAT & Sign-off"],
        deadlines=[],
        constraints=constraints,
        summary=summary,
    )
