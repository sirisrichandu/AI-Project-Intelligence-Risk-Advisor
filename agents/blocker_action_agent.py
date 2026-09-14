import json
from llm import generate_answer


def identify_blockers_and_actions(context):

    question = """
You are the Blocker and Action Item Identification Agent.

Analyze ONLY the provided project context.

Identify:

1. Current Blockers
2. Action Items
3. Pending Decisions
4. Unresolved Issues

IMPORTANT DEFINITIONS:

BLOCKER:
A current problem that is actively preventing a person, team, task, or milestone from continuing.

Do NOT classify a potential future risk as a blocker.

ACTION ITEM:
A specific task that needs to be completed.

Prefer to identify:
- action
- responsible_team
- due_date
- status

PENDING DECISION:
A decision that is explicitly stated as not yet made or awaiting approval.

Do NOT convert a dependency or risk into a pending decision.

UNRESOLVED ISSUE:
A problem that currently exists and has not been resolved.

IMPORTANT RULES:

- Use ONLY information explicitly available in the context.
- Do NOT invent blockers.
- Do NOT invent pending decisions.
- Do NOT invent unresolved issues.
- A risk is NOT automatically a blocker.
- A dependency is NOT automatically a blocker.
- A future possibility is NOT a blocker.
- An upcoming task is an ACTION ITEM, not a blocker.
- If the context does not explicitly contain a blocker, return an empty blockers list.
- If the context does not explicitly contain a pending decision, return an empty pending_decisions list.
- Do NOT use outside knowledge.

Return ONLY valid JSON.
Do NOT use ```json or ``` markdown fences.
Do NOT add explanations.

Return exactly:

{
    "blockers": [
        {
            "description": "",
            "affected_area": "",
            "impact": ""
        }
    ],
    "action_items": [
        {
            "action": "",
            "responsible_team": "",
            "due_date": "",
            "status": ""
        }
    ],
    "pending_decisions": [
        {
            "decision": "",
            "responsible_team": "",
            "impact": ""
        }
    ],
    "unresolved_issues": [
        {
            "issue": "",
            "affected_area": "",
            "impact": ""
        }
    ]
}
"""

    answer = generate_answer(question, context)

    answer = answer.strip()

    if answer.startswith("```json"):
        answer = answer[7:].strip()
    elif answer.startswith("```"):
        answer = answer[3:].strip()

    if answer.endswith("```"):
        answer = answer[:-3].strip()

    try:
        return json.loads(answer)

    except json.JSONDecodeError:
        return {
            "blockers": [],
            "action_items": [],
            "pending_decisions": [],
            "unresolved_issues": [],
            "raw_response": answer
        }