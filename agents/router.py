import json
from llm import generate_answer


def route_question(question):
    """
    Automatically determine which project intelligence
    agent should handle the user's question.
    """

    routing_prompt = f"""
You are an intelligent routing agent for an
AI Project Intelligence and Risk Advisor.

Your job is ONLY to classify the user's question
into ONE of the following agents.

AVAILABLE AGENTS:

1. Scope Extraction Agent

Use this for questions about:
- project goal
- project scope
- included features
- excluded features
- deliverables
- milestones
- timelines
- responsibilities

Examples:
"What is the project goal?"
"What are the project deliverables?"
"What are the milestones?"
"What is included in the project scope?"

--------------------------------------------------

2. Risk Detection Agent

Use this for questions about:
- project risks
- future risks
- risk probability
- risk impact
- technical risks
- schedule risks
- dependency risks
- resource risks
- requirement risks
- delivery forecast
- whether the project is at risk
- whether the project is on track or delayed

Examples:
"What are the project risks?"
"Is the project at risk?"
"What could delay the project?"
"What is the delivery forecast?"

--------------------------------------------------

3. Blocker & Action Item Agent

Use this for questions about:
- current blockers
- action items
- pending tasks
- pending decisions
- unresolved issues
- things preventing work
- tasks that need to be completed

Examples:
"What is currently blocking the project?"
"What are the pending tasks?"
"What action items are remaining?"
"What decisions are pending?"
"What issues are unresolved?"

--------------------------------------------------

4. General

Use this when the question does not clearly
belong to the above categories.

Examples:
"Give me a general summary."
"Explain the project."
"What is this project about?"

--------------------------------------------------

IMPORTANT RULES:

- Return ONLY valid JSON.
- Do not provide explanations.
- Select exactly ONE agent.
- Do not use outside knowledge.
- Base the routing only on the user's question.

Return exactly:

{{
    "agent": ""
}}

USER QUESTION:

{question}
"""

    try:

        answer = generate_answer(
            routing_prompt,
            ""
        )

        answer = answer.strip()

        # Remove markdown code fences if the model adds them
        if answer.startswith("```json"):
            answer = answer[7:].strip()

        elif answer.startswith("```"):
            answer = answer[3:].strip()

        if answer.endswith("```"):
            answer = answer[:-3].strip()

        result = json.loads(answer)

        selected_agent = result.get(
            "agent",
            ""
        ).strip()

        valid_agents = [
            "Scope Extraction Agent",
            "Risk Detection Agent",
            "Blocker & Action Item Agent",
            "General"
        ]

        if selected_agent in valid_agents:
            return selected_agent

        return "General"

    except Exception as error:

        print(
            f"Routing error: {str(error)}"
        )

        return "General"