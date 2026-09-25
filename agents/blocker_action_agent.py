import json
from llm import generate_answer


def identify_blockers_and_actions(context):

    question = """
You are the Blocker and Action Item Identification Agent.

Analyze ONLY the provided project context.

Your task is to identify:

1. Current Blockers
2. Action Items
3. Pending Decisions
4. Unresolved Issues


========================
BLOCKER DEFINITION
========================

A blocker is a CURRENT problem that is actively preventing
a person, team, task, or milestone from continuing.

Detect both explicit and implicit blockers.

Examples:

- "Payment credentials have not been provided."
- "Frontend is waiting for the final API response format."
- "QA cannot begin until backend APIs are available."
- "The team cannot continue until access is granted."

These are blockers because current work is being prevented.


BLOCKER TYPES

Use ONLY one of these types:

- Technical
- Dependency
- Resource
- Requirement
- Access / Environment
- Decision

Examples:

Missing API → Dependency
Missing credentials → Access / Environment
Integration error → Technical
Missing requirement clarification → Requirement
Waiting for approval → Decision


IMPORTANT:

A dependency becomes a BLOCKER only when it is currently
preventing work.

A future dependency or possible future problem is NOT a blocker.


========================
ACTION ITEM DEFINITION
========================

An action item is a SPECIFIC TASK that is explicitly assigned
or stated as something that needs to be done.

Extract:

- action
- responsible_team
- due_date
- priority
- status

IMPORTANT:

ONLY extract action items when the context explicitly identifies
them as actions/tasks/next steps/follow-ups.

DO NOT convert the following into action items:

- Project milestones
- Upcoming milestones
- Deliverables
- General responsibilities
- Future risks
- Dependencies
- Project goals

For example:

"Risk detection and forecasting — September 20, 2026 — AI Team — Pending"

This is a MILESTONE, NOT an action item.

Therefore, DO NOT include it in action_items unless the document
explicitly states it as an action item.


Do NOT infer:

- responsible team
- due date
- priority
- status

If information is not explicitly available, use "".


========================
PENDING DECISION
========================

A pending decision is an actual decision that has NOT yet been
made or is explicitly awaiting approval.

Examples:

- "Client is undecided about guest checkout."
- "Waiting for client approval on the requirement."
- "The team has not decided which option to use."

IMPORTANT:

The following are NOT pending decisions:

- A blocker
- A dependency
- A milestone
- A deadline
- A future risk
- "Cannot begin until API is available"

For example:

"QA cannot begin until backend APIs are available."

This is a DEPENDENCY BLOCKER, NOT a pending decision.


========================
UNRESOLVED ISSUE
========================

An unresolved issue is a CURRENT problem that exists and has
not yet been resolved.

Examples:

- "API response format is not finalized."
- "Integration error is still unresolved."
- "The team is still investigating the integration problem."


========================
IMPORTANT RULES
========================

1. Use ONLY information explicitly available in the context.

2. Do NOT use outside knowledge.

3. Do NOT invent information.

4. Do NOT convert milestones into action items.

5. Do NOT convert project responsibilities into action items.

6. Do NOT convert future risks into blockers.

7. Do NOT convert dependencies into pending decisions.

8. If a dependency is CURRENTLY preventing work, classify it
   as a blocker.

9. "waiting for", "cannot begin until", "unable to continue",
   "blocked by", and similar phrases may indicate implicit blockers.

10. A milestone with a date is NOT automatically an action item.

11. Do NOT infer due dates from milestone dates.

12. Do NOT infer priority.

13. Do NOT infer responsible teams.

14. Do NOT infer status.

15. Preserve dates and team names exactly as provided.

16. If there are no blockers, return an empty blockers list.

17. If there are no explicit action items, return an empty
    action_items list.

18. If there are no pending decisions, return an empty
    pending_decisions list.

19. If there are no unresolved issues, return an empty
    unresolved_issues list.


========================
OUTPUT FORMAT
========================

Return ONLY valid JSON.

Do NOT use markdown fences.
Do NOT add explanations.

Return exactly:

{
    "blockers": [
        {
            "description": "",
            "blocker_type": "",
            "affected_area": "",
            "impact": ""
        }
    ],
    "action_items": [
        {
            "action": "",
            "responsible_team": "",
            "due_date": "",
            "priority": "",
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