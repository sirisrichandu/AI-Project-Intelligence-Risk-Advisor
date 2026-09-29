import os
import time
import traceback
import json

from dotenv import load_dotenv
from google import genai
from google.genai import types


# ==========================================================
# LOAD ENVIRONMENT VARIABLES
# ==========================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not set. "
        "Add it to your .env file."
    )


# ==========================================================
# GEMINI CLIENT
# ==========================================================

client = genai.Client(
    api_key=GEMINI_API_KEY
)


# ==========================================================
# MODELS
# ==========================================================

PRIMARY_MODEL = "gemini-3.8-flash"
FALLBACK_MODEL = "gemini-3.7-flash"


# ==========================================================
# HELPER: TEMPORARY ERROR
# ==========================================================

def is_temporary_error(error):

    error_text = str(error).lower()

    return (
        "503" in error_text
        or "unavailable" in error_text
        or "high demand" in error_text
        or "temporarily" in error_text
        or "overloaded" in error_text
        or "429" in error_text
        or "rate limit" in error_text
    )


# ==========================================================
# HELPER: CLEAN RESPONSE
# ==========================================================

def clean_response(text):

    if not text:
        return ""

    text = text.strip()

    # Remove markdown code fences
    if text.startswith("```json"):
        text = text[7:].strip()

    elif text.startswith("```"):
        text = text[3:].strip()

    if text.endswith("```"):
        text = text[:-3].strip()

    return text.strip()


# ==========================================================
# HELPER: CHECK VALID JSON
# ==========================================================

def is_valid_json(text):

    if not text:
        return False

    try:
        json.loads(text)
        return True

    except (json.JSONDecodeError, TypeError):
        return False


# ==========================================================
# GENERATE ANSWER
# ==========================================================

def generate_answer(
    question: str,
    context: str,
    max_retries: int = 3,
    json_mode: bool = False
):
    """
    Generate an answer using Gemini.

    json_mode=True is used by structured agents:
        - Scope Extraction Agent
        - Risk Detection Agent
        - Blocker & Action Item Agent
        - Documentation Agent
    """

    question = str(question).strip()
    context = str(context).strip()

    if not question:
        return "Please provide a valid question."

    if not context:
        return (
            "I could not find relevant information "
            "in the uploaded project documents."
        )

    # ======================================================
    # LIMIT CONTEXT
    # ======================================================

    max_context_length = 12000

    if len(context) > max_context_length:

        context = context[:max_context_length]

        print(
            "Warning: Project context was truncated "
            "to 12000 characters."
        )

    # ======================================================
    # CREATE PROMPT
    # ======================================================

    if json_mode:

        prompt = f"""
You are an AI Project Intelligence Assistant.

Analyze ONLY the project context provided below.

{question}

STRICT JSON REQUIREMENTS:

1. Return ONLY valid JSON.
2. Do NOT use markdown.
3. Do NOT use ```json.
4. Do NOT add explanations.
5. Do NOT add text before the JSON.
6. Do NOT add text after the JSON.
7. Return the COMPLETE JSON object.
8. Do NOT stop before completing the JSON.
9. Make sure every opening {{ has a matching }}.
10. Make sure every opening [ has a matching ].
11. Make sure every JSON string is properly closed.
12. Do not leave trailing commas.
13. Keep the JSON compact.
14. Follow the exact JSON structure requested.
15. Use "" for unavailable string values.
16. Use [] for unavailable list values.
17. Do not invent information.
18. Use ONLY information supported by the project context.

PROJECT CONTEXT:
{context}
"""

    else:

        prompt = f"""
You are an AI Project Intelligence Assistant.

Answer the user's question using ONLY the project
information provided in the context.

If the information is not available in the context,
clearly say that it was not found in the uploaded
project documents.

Do not invent project information.

PROJECT CONTEXT:
{context}

USER QUESTION:
{question}

Provide a clear and concise answer.
"""

    # ======================================================
    # MODEL ORDER
    # ======================================================

    models = [
        PRIMARY_MODEL,
        FALLBACK_MODEL
    ]

    # ======================================================
    # TRY MODELS
    # ======================================================

    for model_index, model_name in enumerate(models):

        print(
            f"\nUsing Gemini model: {model_name}"
        )

        for attempt in range(
            1,
            max_retries + 1
        ):

            try:

                print(
                    f"Calling Gemini "
                    f"(attempt {attempt}/{max_retries})..."
                )

                # ==================================================
                # CONFIGURATION
                # ==================================================

                if json_mode:

                    config = types.GenerateContentConfig(

                        temperature=0.0,

                        # Increased from 2000
                        max_output_tokens=4000,

                        # Force JSON response
                        response_mime_type="application/json"
                    )

                else:

                    config = types.GenerateContentConfig(

                        temperature=0.2,

                        max_output_tokens=700
                    )

                # ==================================================
                # GEMINI REQUEST
                # ==================================================

                response = client.models.generate_content(

                    model=model_name,

                    contents=prompt,

                    config=config
                )

                # ==================================================
                # CHECK RESPONSE
                # ==================================================

                if response is None:

                    raise RuntimeError(
                        "Gemini returned an empty response."
                    )

                # ==================================================
                # EXTRACT TEXT
                # ==================================================

                answer = getattr(
                    response,
                    "text",
                    None
                )

                if not answer:

                    print(
                        f"{model_name} returned "
                        "an empty response."
                    )

                    continue

                answer = clean_response(answer)

                # ==================================================
                # JSON VALIDATION
                # ==================================================

                if json_mode:

                    if not is_valid_json(answer):

                        print(
                            f"\n{model_name} returned "
                            "INVALID JSON."
                        )

                        print(
                            "\nRaw response:"
                        )

                        print(answer)

                        # Retry because malformed JSON
                        if attempt < max_retries:

                            print(
                                "\nRetrying because "
                                "JSON was invalid..."
                            )

                            time.sleep(1)

                            continue

                        # Try fallback model
                        print(
                            f"\n{model_name} failed "
                            "to produce valid JSON."
                        )

                        break

                # ==================================================
                # SUCCESS
                # ==================================================

                print(
                    f"{model_name} returned "
                    "a valid response."
                )

                return answer

            # ======================================================
            # ERROR HANDLING
            # ======================================================

            except Exception as error:

                print(
                    f"\nGemini error on attempt "
                    f"{attempt}: {error}"
                )

                # ==================================================
                # TEMPORARY ERROR
                # ==================================================

                if is_temporary_error(error):

                    if attempt < max_retries:

                        wait_time = 2 ** attempt

                        print(
                            f"Temporary Gemini error. "
                            f"Retrying in "
                            f"{wait_time} seconds..."
                        )

                        time.sleep(wait_time)

                        continue

                    print(
                        f"{model_name} failed after "
                        f"{max_retries} attempts."
                    )

                    break

                # ==================================================
                # OTHER ERROR
                # ==================================================

                traceback.print_exc()

                break

        # ==========================================================
        # FALLBACK MODEL
        # ==========================================================

        if model_index < len(models) - 1:

            print(
                f"\nSwitching to fallback model: "
                f"{models[model_index + 1]}"
            )

            continue

    # ==========================================================
    # ALL MODELS FAILED
    # ==========================================================

    print(
        "\nAll Gemini models failed."
    )

    if json_mode:

        return json.dumps({
            "error": (
                "Gemini could not generate "
                "a valid JSON response."
            )
        })

    return (
        "The AI service is temporarily unavailable. "
        "Please try again later."
    )