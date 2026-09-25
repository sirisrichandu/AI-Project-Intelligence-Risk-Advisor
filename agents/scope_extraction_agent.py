import json
from llm import generate_answer


def extract_scope(context):

    question = """
You are the Scope and Deliverable Extraction Agent.

Analyze ONLY the project context provided below.

Your task is to extract structured project information.

==================================================
1. PROJECT GOAL
==================================================
Extract the main desired outcome of the project.

==================================================
2. PROJECT SCOPE
==================================================
Extract:
- included: work/features explicitly included in the project
- excluded: work/features explicitly excluded from the project

Do not invent included or excluded items.

==================================================
3. MAJOR DELIVERABLES
==================================================
Extract major outputs that the project must produce.

Do NOT confuse a deliverable with a milestone.

==================================================
4. MILESTONES
==================================================
A milestone is a project checkpoint or stage.

If a milestone table exists, extract EVERY row.

For every milestone extract:
- name
- target_date
- responsible_team
- status

Preserve the information exactly as given.

==================================================
5. TIMELINES
==================================================
Extract milestone and its corresponding date.

==================================================
6. RESPONSIBILITIES
==================================================
Extract explicit statements describing what a person or team
is responsible for doing.

Examples:

"Backend Team is responsible for API development."

"Frontend Team will integrate the APIs."

"QA Team is responsible for system testing."

"AI Team will implement the risk detection agent."

Convert them into:

{
    "team": "Backend Team",
    "responsibility": "API development"
}

IMPORTANT:
- Extract responsibilities ONLY when the context explicitly
  states or clearly describes who is responsible for what.
- Do NOT invent responsibilities.
- Do NOT assume a team's responsibility only from its name.
- A responsible_team in a milestone table can be used as a
  responsibility ONLY if the context also indicates what that
  team is responsible for doing.
- Do NOT use outside knowledge.

==================================================
STRICT GROUNDING RULES
==================================================
- Use ONLY the provided project context.
- Do NOT invent information.
- Preserve dates, team names, and status exactly as given.
- If information is not available, return an empty list or
  empty string.
- If a field cannot be supported by the context, do not guess.
- Return ONLY valid JSON.
- Do NOT use markdown fences.
- Do NOT add explanations.

Return EXACTLY this structure:

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
    "responsibilities": [
        {
            "team": "",
            "responsibility": ""
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