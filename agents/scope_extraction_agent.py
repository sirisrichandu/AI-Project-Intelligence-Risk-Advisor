import json
from llm import generate_answer


def extract_scope(context):

    question = """
You are the Scope and Deliverable Extraction Agent.

Extract ONLY information explicitly present in the project context.

Extract:

1. Project Goal
2. Project Scope
   - included
   - excluded
3. Major Deliverables
4. Milestones
   - name
   - target_date
   - responsible_team
   - status
5. Timelines
   - milestone
   - date
6. Responsibilities

IMPORTANT RULES:
- Use ONLY the provided context.
- Do NOT invent information.
- Preserve dates, team names, and status exactly as given.
- A milestone is a project checkpoint/stage with a target date.
- If a milestone table is present, extract EVERY row.
- Do NOT skip milestone rows.
- Do NOT confuse deliverables with milestones.
- Return ONLY JSON.
- Do NOT use ```json or ``` markdown fences.
- Do NOT add explanations.

Return exactly this structure:

{
    "project_goal": "",
    "project_scope": {
        "included": [],
        "excluded": []
    },
    "deliverables": [],
    "milestones": [
        {
            "name": "",
            "target_date": "",
            "responsible_team": "",
            "status": ""
        }
    ],
    "timelines": [
        {
            "milestone": "",
            "date": ""
        }
    ],
    "responsibilities": []
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
            "project_goal": "",
            "project_scope": {
                "included": [],
                "excluded": []
            },
            "deliverables": [],
            "milestones": [],
            "timelines": [],
            "responsibilities": [],
            "raw_response": answer
        }