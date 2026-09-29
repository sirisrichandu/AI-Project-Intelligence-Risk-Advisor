import json
import re
from llm import generate_answer


# ==========================================================
# CLEAN GEMINI RESPONSE
# ==========================================================

def _clean_json_response(answer):
    if not answer:
        return ""

    answer = answer.strip()

    # Remove markdown fences
    answer = re.sub(
        r"^```json\s*",
        "",
        answer,
        flags=re.IGNORECASE
    )

    answer = re.sub(
        r"^```\s*",
        "",
        answer
    )

    answer = re.sub(
        r"\s*```$",
        "",
        answer
    )

    answer = answer.strip()

    # Extract JSON object
    start = answer.find("{")
    end = answer.rfind("}")

    if start != -1 and end != -1 and end > start:
        answer = answer[start:end + 1]

    return answer.strip()


# ==========================================================
# EMPTY RESULT
# ==========================================================

def _empty_result():

    return {
        "project_goal": "",
        "project_scope": {
            "included": [],
            "excluded": []
        },
        "deliverables": [],
        "milestones": [],
        "timelines": [],
        "responsibilities": []
    }


# ==========================================================
# NORMALIZE RESULT
# ==========================================================

def _normalize_result(result):

    if not isinstance(result, dict):
        return _empty_result()

    # Project goal
    if not isinstance(
        result.get("project_goal", ""),
        str
    ):
        result["project_goal"] = ""

    # Project scope
    project_scope = result.get(
        "project_scope",
        {}
    )

    if not isinstance(project_scope, dict):
        project_scope = {}

    included = project_scope.get(
        "included",
        []
    )

    excluded = project_scope.get(
        "excluded",
        []
    )

    if not isinstance(included, list):
        included = []

    if not isinstance(excluded, list):
        excluded = []

    result["project_scope"] = {
        "included": included,
        "excluded": excluded
    }

    # Lists
    for field in [
        "deliverables",
        "milestones",
        "timelines",
        "responsibilities"
    ]:

        if not isinstance(
            result.get(field, []),
            list
        ):
            result[field] = []

    return result


# ==========================================================
# SCOPE EXTRACTION AGENT
# ==========================================================

def extract_scope(context):

    if not context or not context.strip():

        result = _empty_result()

        result["raw_response"] = (
            "No project context was provided."
        )

        return result

    # ======================================================
    # PROMPT
    # ======================================================

    question = """
You are the Scope Extraction Agent for an AI Project
Intelligence and Risk Advisor.

Analyze ONLY the project context provided to you.

Your task is to extract structured project scope information.

Do NOT use outside knowledge.
Do NOT invent information.
Do NOT assume missing information.

--------------------------------------------------
1. PROJECT GOAL
--------------------------------------------------

Extract the main goal of the project.

If not explicitly available, use:

""

--------------------------------------------------
2. PROJECT SCOPE
--------------------------------------------------

Extract explicitly included project work, features,
activities, and components.

Extract explicitly excluded project work, features,
activities, and components.

IMPORTANT:

Only include something in "excluded" if the context
explicitly says it is out of scope, excluded, or not
part of the project.

--------------------------------------------------
3. DELIVERABLES
--------------------------------------------------

Extract major project outputs explicitly supported
by the context.

Examples include:

- application
- API
- dashboard
- documentation
- report
- model
- prototype

Do not invent deliverables.

--------------------------------------------------
4. MILESTONES
--------------------------------------------------

Extract milestones or project checkpoints explicitly
mentioned in the context.

For each milestone return:

- name
- target_date
- responsible_team
- status

If a value is unavailable, use "".

--------------------------------------------------
5. TIMELINES
--------------------------------------------------

Extract explicit milestone/date relationships.

For example:

{
    "milestone": "Milestone 1",
    "date": "September 15, 2026"
}

Do not invent dates.

--------------------------------------------------
6. RESPONSIBILITIES
--------------------------------------------------

Extract explicit team/person responsibilities.

For example, if the context says:

"Frontend team is responsible for UI development."

return:

{
    "team": "Frontend team",
    "responsibility": "UI development"
}

Do NOT infer responsibilities only from team names.

--------------------------------------------------
GROUNDING RULES
--------------------------------------------------

1. Use ONLY the supplied project context.
2. Do NOT use outside knowledge.
3. Do NOT invent project information.
4. Do NOT invent dates.
5. Do NOT invent teams.
6. Do NOT invent responsibilities.
7. Do NOT invent milestones.
8. Preserve information from the context.
9. Use "" when a single value is unavailable.
10. Use [] when a list has no supported information.
11. Return ONLY valid JSON.
12. Do NOT use markdown.
13. Do NOT add explanations.

--------------------------------------------------
REQUIRED JSON FORMAT
--------------------------------------------------

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

    # ======================================================
    # CALL GEMINI
    # ======================================================

    try:

        print("Running Scope Extraction Agent...")

        answer = generate_answer(
            question,
            context,
            json_mode=True
        )

        cleaned_answer = _clean_json_response(answer)

        if not cleaned_answer:

            result = _empty_result()

            result["raw_response"] = (
                "The model returned an empty response."
            )

            return result

        # ==================================================
        # PARSE JSON
        # ==================================================

        try:

            result = json.loads(
                cleaned_answer
            )

        except json.JSONDecodeError as error:

            print(
                "\nScope Agent JSON parsing failed:"
            )

            print(error)

            print(
                "\nRaw model response:"
            )

            print(answer)

            result = _empty_result()

            result["raw_response"] = answer

            return result

        # ==================================================
        # NORMALIZE
        # ==================================================

        result = _normalize_result(result)

        print(
            "Scope Extraction completed successfully."
        )

        return result

    except Exception as error:

        print(
            "\nScope Extraction Agent error:"
        )

        print(error)

        result = _empty_result()

        result["raw_response"] = str(error)

        return result