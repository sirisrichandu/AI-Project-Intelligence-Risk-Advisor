import json
import re
from llm import generate_answer


def _clean_json_response(answer):
    """Clean and extract JSON returned by the LLM."""

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


def _empty_result():
    return {
        "blockers": [],
        "action_items": [],
        "pending_decisions": [],
        "unresolved_issues": []
    }


def identify_blockers_and_actions(context):

    if not context or not context.strip():
        result = _empty_result()
        result["raw_response"] = "No project context was provided."
        return result

    question = """
You are the Blocker and Action Item Identification Agent.

Analyze ONLY the project context provided below.

Extract information into exactly four categories:

1. blockers
2. action_items
3. pending_decisions
4. unresolved_issues

STRICT RULES:

- Use ONLY information explicitly supported by the context.
- Do NOT use outside knowledge.
- Do NOT invent information.
- Do NOT infer missing information.
- Scan the entire context.
- Avoid duplicates.

==================================================
BLOCKERS
==================================================

A blocker is a CURRENT problem that is explicitly preventing
work from continuing.

Only classify something as a blocker when the context clearly
indicates that work is being prevented, delayed, or unable to
continue.

For every blocker return:

- description
- blocker_type
- affected_area
- impact

Allowed blocker_type values:

- Technical
- Dependency
- Resource
- Requirement
- Access / Environment
- Decision

If no current blocker exists, return [].

==================================================
ACTION ITEMS
==================================================

Extract ONLY explicitly stated tasks, actions, next steps,
or pending work.

For every action item return:

- action
- responsible_team
- due_date
- priority
- status

If a field is not explicitly available, use "".

Do NOT convert risks, goals, milestones, or general
responsibilities into action items.

If no action items exist, return [].

==================================================
PENDING DECISIONS
==================================================

Extract only decisions or approvals that are explicitly
pending.

For every pending decision return:

- decision
- responsible_team
- impact

Use "" when information is unavailable.

If no pending decision exists, return [].

==================================================
UNRESOLVED ISSUES
==================================================

Extract current problems that are explicitly described as
unresolved, not finalized, still under investigation, or
otherwise remaining unresolved.

For every unresolved issue return:

- issue
- affected_area
- impact

Use "" when information is unavailable.

If no unresolved issue exists, return [].

==================================================
IMPORTANT CLASSIFICATION RULES
==================================================

Risk is NOT automatically a blocker.

Dependency is NOT automatically a blocker.

Milestone is NOT automatically an action item.

Deadline is NOT automatically an action item.

General responsibility is NOT automatically an action item.

Only extract what the context explicitly supports.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

Do NOT use markdown.
Do NOT use code fences.
Do NOT add explanations.

Use exactly this structure:

{
    "blockers": [],
    "action_items": [],
    "pending_decisions": [],
    "unresolved_issues": []
}

If items exist, use the following structures:

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

    try:

        print("Running Blocker & Action Item Agent...")

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

        # --------------------------------------------------
        # PARSE JSON
        # --------------------------------------------------

        try:

            result = json.loads(cleaned_answer)

        except json.JSONDecodeError as error:

            print(
                "\nBlocker Agent JSON parsing failed:"
            )

            print(error)

            print("\nRaw model response:")
            print(answer)

            result = _empty_result()

            result["raw_response"] = answer

            return result

        # --------------------------------------------------
        # VALIDATE RESULT
        # --------------------------------------------------

        if not isinstance(result, dict):

            fallback = _empty_result()
            fallback["raw_response"] = answer

            return fallback

        # --------------------------------------------------
        # REQUIRED FIELDS
        # --------------------------------------------------

        result.setdefault("blockers", [])
        result.setdefault("action_items", [])
        result.setdefault("pending_decisions", [])
        result.setdefault("unresolved_issues", [])

        # --------------------------------------------------
        # ENSURE LISTS
        # --------------------------------------------------

        fields = [
            "blockers",
            "action_items",
            "pending_decisions",
            "unresolved_issues"
        ]

        for field in fields:

            if not isinstance(result[field], list):
                result[field] = []

        print(
            "Blocker & Action Item Agent "
            "completed successfully."
        )

        return result

    except Exception as error:

        print(
            "\nBlocker & Action Item Agent error:"
        )

        print(error)

        result = _empty_result()
        result["raw_response"] = str(error)

        return result