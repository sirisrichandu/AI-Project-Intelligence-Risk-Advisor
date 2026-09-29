import json
from llm import generate_answer


def generate_documentation(context):

    question = """
You are the Documentation Generation Agent for an AI Project
Intelligence and Risk Advisor.

Analyze ONLY the project context provided below.

Generate the following project documentation:

1. USER STORIES
2. RISK REGISTER
3. ACTION ITEM LIST


==================================================
1. USER STORIES
==================================================

Generate user stories ONLY from functionality, requirements,
features, or responsibilities explicitly supported by the context.

Format:

{
    "user_story": "As a ..., I want ..., so that ..."
}

Do NOT invent features or requirements.

If no supported functionality exists, return an empty list.


==================================================
2. RISK REGISTER
==================================================

Create a structured risk register using ONLY risks supported
by the context.

For each risk include:

- risk
- risk_type
- probability
- impact
- mitigation

Do NOT invent risks.

If no risk is supported by the context, return an empty list.

The mitigation must be directly related to the documented risk.

Do NOT invent teams, resources, dates, or requirements.


==================================================
3. ACTION ITEMS
==================================================

Extract or generate structured action items based ONLY on
explicit pending work, tasks, or next steps in the context.

For each action item include:

- action
- responsible_team
- due_date
- priority
- status

Do NOT invent missing information.

Use "" when information is not available.


==================================================
GROUNDING RULES
==================================================

- Use ONLY the provided project context.
- Do NOT use outside knowledge.
- Do NOT invent project features.
- Do NOT invent teams.
- Do NOT invent dates.
- Do NOT invent requirements.
- Do NOT create unsupported risks.
- Do NOT assume responsibilities.
- Do NOT infer missing deadlines.
- Do NOT infer priority.
- Do NOT infer status.
- Preserve information from the context.
- If information is unavailable, use an empty string or empty list.


==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

Do NOT use markdown code fences.
Do NOT add explanations.

Return exactly:

{
    "user_stories": [
        {
            "user_story": ""
        }
    ],
    "risk_register": [
        {
            "risk": "",
            "risk_type": "",
            "probability": "",
            "impact": "",
            "mitigation": ""
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
    ]
}
"""

    # ==========================================
    # GENERATE RESPONSE
    # ==========================================

    answer = generate_answer(
        question,
        context,
        json_mode=True
    )

    # ==========================================
    # HANDLE EMPTY RESPONSE
    # ==========================================

    if not answer:
        return {
            "user_stories": [],
            "risk_register": [],
            "action_items": []
        }

    answer = answer.strip()

    # ==========================================
    # REMOVE MARKDOWN CODE FENCES
    # ==========================================

    if answer.startswith("```json"):
        answer = answer[7:].strip()

    elif answer.startswith("```"):
        answer = answer[3:].strip()

    if answer.endswith("```"):
        answer = answer[:-3].strip()

    # ==========================================
    # PARSE JSON
    # ==========================================

    try:

        result = json.loads(answer)

        return {
            "user_stories": result.get(
                "user_stories",
                []
            ),
            "risk_register": result.get(
                "risk_register",
                []
            ),
            "action_items": result.get(
                "action_items",
                []
            )
        }

    except json.JSONDecodeError:

        print(
            "\nDocumentation Agent returned invalid JSON:"
        )

        print(answer)

        return {
            "user_stories": [],
            "risk_register": [],
            "action_items": [],
            "raw_response": answer
        }