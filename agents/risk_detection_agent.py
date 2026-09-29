import json
import re
from llm import generate_answer


def _clean_json_response(answer):
    """
    Clean common LLM formatting issues and extract JSON.
    """

    if not answer:
        return ""

    answer = answer.strip()

    # Remove markdown code fences
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

    # Extract JSON object if the model added extra text
    start = answer.find("{")
    end = answer.rfind("}")

    if start != -1 and end != -1 and end > start:
        answer = answer[start:end + 1]

    return answer.strip()


def _empty_result():
    """
    Standard fallback response.
    """

    return {
        "risks": [],
        "delivery_forecast": {
            "status": "",
            "reasoning": ""
        }
    }


def detect_risks(context):

    if not context or not context.strip():

        result = _empty_result()

        result["raw_response"] = (
            "No project context was provided."
        )

        return result

    prompt = """
You are the Risk Detection and Delivery Forecasting Agent.

Analyze ONLY the project context provided below.

Your task is to identify FUTURE risks and provide an
evidence-based delivery forecast.

==================================================
RISK DEFINITIONS
==================================================

1. Schedule Risk

A documented possibility that a task, milestone, deadline,
or project delivery may be delayed.

2. Technical Risk

A documented possibility of a future technical problem
affecting implementation, integration, testing, performance,
or delivery.

3. Dependency Risk

A documented possibility caused by one task, team, system,
or external service depending on another.

4. Resource Risk

A documented possibility caused by insufficient people,
skills, equipment, budget, or other resources.

5. Requirement Risk

A documented possibility caused by unclear, changing,
incomplete, or conflicting requirements.

==================================================
MOST IMPORTANT RULE: RISK MUST BE FUTURE
==================================================

Risk = something that MAY negatively affect the project
in the future.

Issue = something that has ALREADY happened.

Blocker = a CURRENT problem that is preventing work.

Examples:

"Payment integration may delay testing."
→ Risk

"Payment integration is delayed by 4 days."
→ Issue, NOT a risk

"QA cannot start because backend APIs are unavailable."
→ Blocker, NOT a risk

Do NOT classify an issue or blocker as a risk.

==================================================
GROUNDING RULES
==================================================

- Use ONLY information explicitly supported by the context.
- Do NOT use outside knowledge.
- Do NOT invent risks.
- Do NOT create risks simply because a milestone is Pending.
- Do NOT create risks simply because a task is In Progress.
- Do NOT create risks simply because a dependency exists.
- A dependency becomes a Dependency Risk only when the
  context indicates that the dependency could negatively
  affect delivery.
- Every risk must be traceable to evidence in the context.

==================================================
RISK TYPE CLASSIFICATION
==================================================

Choose the risk type based on the actual documented cause.

If the context says:

"Delay in API development may delay frontend integration."
→ Dependency Risk

If the context says:

"Payment integration may delay the release."
→ Schedule Risk

If the context says:

"API performance may affect system testing."
→ Technical Risk

If the context says:

"Insufficient developers may delay implementation."
→ Resource Risk

If the context says:

"Client requirements are unclear and may change."
→ Requirement Risk

Do NOT force a risk into a category when the evidence
does not support that category.

==================================================
PROBABILITY
==================================================

Allowed values:

- Low
- Medium
- High

Choose based ONLY on evidence in the context.

If probability is not explicitly stated and cannot
reasonably be supported by the context, use:

"Medium"

Do not invent specific evidence.

==================================================
IMPACT
==================================================

Allowed values:

- Low
- Medium
- High

Choose based on the documented affected area.

High impact should be used only when the context indicates
that the risk can significantly affect:

- testing
- major milestones
- release
- project delivery

==================================================
AFFECTED AREA
==================================================

Identify the project area explicitly affected by the risk.

Examples:

- Backend
- Frontend
- Testing
- Integration
- Deployment
- Release
- Project Schedule

Do not invent an affected area.

==================================================
RECOMMENDED ACTION
==================================================

Give a practical action directly related to the documented risk.

Do NOT invent:

- teams
- dates
- requirements
- resources

The recommended action must logically address the documented risk.

==================================================
DELIVERY FORECAST
==================================================

Allowed values:

On Track
At Risk
Delayed

Use "On Track" when the context contains no significant
evidence of a delivery threat.

Use "At Risk" when documented future risks, important
dependencies, pending work, or current issues could affect
delivery.

Use "Delayed" ONLY when the context explicitly says that
the project or an important milestone is already delayed.

IMPORTANT:

A current issue or blocker can be evidence for an
"At Risk" forecast, but it must NOT itself be listed
as a future risk.

The forecast is an early warning, NOT a guarantee.

The reasoning MUST mention actual evidence from the context.

==================================================
NO-RISK CASE
==================================================

If no future risks are supported by the context:

"risks": []

The delivery forecast should still be generated from
the available evidence.

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON.

Do NOT use markdown code fences.

Do NOT add explanations before or after the JSON.

Return exactly:

{
    "risks": [
        {
            "risk_type": "",
            "description": "",
            "probability": "",
            "impact": "",
            "affected_area": "",
            "recommended_action": ""
        }
    ],
    "delivery_forecast": {
        "status": "",
        "reasoning": ""
    }
}

==================================================
PROJECT CONTEXT
==================================================

""" + context

    try:

        print("Running Risk Detection Agent...")

        answer = generate_answer(
            prompt,
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

        try:

            result = json.loads(cleaned_answer)

        except json.JSONDecodeError as json_error:

            print(
                "Risk Agent JSON parsing failed:"
            )

            print(json_error)

            print(
                "Raw model response:"
            )

            print(answer)

            result = _empty_result()

            result["raw_response"] = answer

            return result

        # --------------------------------------------------
        # Validate top-level structure
        # --------------------------------------------------

        if not isinstance(result, dict):

            fallback = _empty_result()

            fallback["raw_response"] = answer

            return fallback

        result.setdefault(
            "risks",
            []
        )

        result.setdefault(
            "delivery_forecast",
            {
                "status": "",
                "reasoning": ""
            }
        )

        # --------------------------------------------------
        # Validate risks
        # --------------------------------------------------

        if not isinstance(
            result["risks"],
            list
        ):

            result["risks"] = []

        validated_risks = []

        for risk in result["risks"]:

            if not isinstance(
                risk,
                dict
            ):
                continue

            validated_risk = {
                "risk_type": risk.get(
                    "risk_type",
                    ""
                ),

                "description": risk.get(
                    "description",
                    ""
                ),

                "probability": risk.get(
                    "probability",
                    ""
                ),

                "impact": risk.get(
                    "impact",
                    ""
                ),

                "affected_area": risk.get(
                    "affected_area",
                    ""
                ),

                "recommended_action": risk.get(
                    "recommended_action",
                    ""
                )
            }

            validated_risks.append(
                validated_risk
            )

        result["risks"] = validated_risks

        # --------------------------------------------------
        # Validate delivery forecast
        # --------------------------------------------------

        forecast = result.get(
            "delivery_forecast"
        )

        if not isinstance(
            forecast,
            dict
        ):

            forecast = {
                "status": "",
                "reasoning": ""
            }

        status = forecast.get(
            "status",
            ""
        )

        reasoning = forecast.get(
            "reasoning",
            ""
        )

        # Only allow expected forecast values
        allowed_statuses = {
            "On Track",
            "At Risk",
            "Delayed"
        }

        if status not in allowed_statuses:
            status = ""

        result["delivery_forecast"] = {
            "status": status,
            "reasoning": reasoning
        }

        print(
            "Risk Detection completed successfully."
        )

        return result

    except Exception as error:

        print(
            "Risk Detection Agent error:"
        )

        print(error)

        result = _empty_result()

        result["raw_response"] = str(error)

        return result