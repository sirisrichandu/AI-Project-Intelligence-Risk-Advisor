import re
from typing import List
from backend.models import RiskItem

def detect_project_risks(text: str) -> List[RiskItem]:
    if not text or not text.strip():
        return []

    lines = [l.strip() for l in text.split("\n") if l.strip()]
    candidate_sentences = []

    # Heuristic detection of risk statements
    for line in lines:
        lower = line.lower()
        if any(term in lower for term in ["risk", "delay", "vulnerability", "blocker", "failure", "defect", "bottleneck", "slippage", "overdue", "concern", "issue"]):
            cleaned = re.sub(r"^[-*•\d.]+\s*", "", line).strip()
            if 20 < len(cleaned) < 220:
                candidate_sentences.append(cleaned)

    # De-duplicate
    unique_candidates = []
    seen = set()
    for s in candidate_sentences:
        key = s[:35].lower()
        if key not in seen:
            seen.add(key)
            unique_candidates.append(s)

    # Limit to top 8 risks
    unique_candidates = unique_candidates[:8]

    risks: List[RiskItem] = []
    for idx, sentence in enumerate(unique_candidates):
        num = f"RSK-0{idx + 1}" if idx < 9 else f"RSK-{idx + 1}"
        lower = sentence.lower()

        category = "Technical"
        if any(w in lower for w in ["schedule", "delay", "timeline", "milestone", "uat"]):
            category = "Schedule"
        elif any(w in lower for w in ["personnel", "team", "staff", "resource", "developer"]):
            category = "Resource"
        elif any(w in lower for w in ["vendor", "api", "integration", "third-party", "dependency"]):
            category = "Dependency"
        elif any(w in lower for w in ["cost", "budget", "license"]):
            category = "Budget"
        elif any(w in lower for w in ["quality", "defect", "bug", "ocr", "accuracy"]):
            category = "Quality"

        severity = "Moderate"
        if any(w in lower for w in ["critical", "blocker", "crash", "urgent", "fatal"]):
            severity = "Critical"
        elif any(w in lower for w in ["high", "severe", "failure"]):
            severity = "High"

        words = re.sub(r"^[-*•\d.]+\s*", "", sentence).split()
        title = " ".join(words[:8])
        if len(title) > 55:
            title = title[:52] + "..."

        # Calculate differentiated probability & impact
        p_var = ((idx * 7) % 15) - 7
        i_var = ((idx * 11) % 17) - 8
        base_p = 88 if severity == "Critical" else (72 if severity == "High" else 52)
        base_i = 90 if severity == "Critical" else (76 if severity == "High" else 54)

        risks.append(RiskItem(
            id=num,
            title=title,
            category=category,
            severity=severity,
            probability=max(15, min(95, base_p + p_var)),
            impact=max(15, min(95, base_i + i_var)),
            description=sentence,
            evidence=f'From uploaded document: "{sentence[:120]}"',
            mitigation=f'Assign dedicated sprint action to resolve "{title}". Enforce continuous monitoring and contingency review.',
            status="Open",
        ))

    return risks
