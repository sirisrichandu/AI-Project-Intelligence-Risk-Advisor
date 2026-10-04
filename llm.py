import os
import time
import traceback

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
# ERROR HELPERS
# ==========================================================

def is_503_error(error):
    """
    503 means the model is temporarily unavailable,
    usually because of high demand.
    """

    error_text = str(error).lower()

    return (
        "503" in error_text
        or "unavailable" in error_text
        or "high demand" in error_text
        or "overloaded" in error_text
        or "temporarily unavailable" in error_text
    )


def is_429_error(error):
    """
    Detect Gemini rate-limit/quota errors.
    """

    error_text = str(error).lower()

    return (
        "429" in error_text
        or "resource_exhausted" in error_text
        or "rate limit" in error_text
        or "quota exceeded" in error_text
    )


def is_daily_quota_error(error):
    """
    Detect a daily/free-tier quota exhaustion.

    This type of 429 should NOT be retried repeatedly.
    """

    error_text = str(error).lower()

    return (
        "generativelanguage.googleapis.com/generate_content_free_tier_requests"
        in error_text
        or "perday" in error_text
        or "per_day" in error_text
        or "generaterequestsperday" in error_text
        or "quota exceeded for metric" in error_text
    )


# ==========================================================
# CLEAN RESPONSE
# ==========================================================

def clean_response(text):

    if not text:
        return ""

    text = text.strip()

    # Remove markdown JSON fences
    if text.startswith("```json"):
        text = text[7:].strip()

    elif text.startswith("```"):
        text = text[3:].strip()

    if text.endswith("```"):
        text = text[:-3].strip()

    return text


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

    Supports:
    - Normal RAG questions
    - JSON responses for agents
    - 503 retry handling
    - 429 quota handling
    - Primary/fallback model handling
    """

    question = str(question).strip()
    context = str(context).strip()

    # ------------------------------------------------------
    # VALIDATE INPUT
    # ------------------------------------------------------

    if not question:

        return "Please provide a valid question."

    if not context:

        if json_mode:
            return '{"error": "No project context was provided."}'

        return (
            "I could not find relevant information "
            "in the uploaded project documents."
        )

    # ------------------------------------------------------
    # LIMIT CONTEXT
    # ------------------------------------------------------

    max_context_length = 12000

    if len(context) > max_context_length:

        context = context[:max_context_length]

        print(
            f"Context truncated to "
            f"{max_context_length} characters."
        )

    # ======================================================
    # BUILD PROMPT
    # ======================================================

    if json_mode:

        prompt = f"""
You are an AI Project Intelligence Assistant.

Analyze ONLY the project context provided below.

{question}

STRICT JSON RULES:

- Return ONLY valid JSON.
- Do NOT use markdown.
- Do NOT use ```json.
- Do NOT add explanations before or after the JSON.
- Do NOT truncate the response.
- Follow the exact JSON structure requested in the instructions.
- Use empty strings or empty arrays when information is unavailable.
- Do not invent information.
- Use only information supported by the project context.

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
    # MODEL LOOP
    # ======================================================

    for model_index, model_name in enumerate(models):

        print(
            f"\nUsing Gemini model: {model_name}"
        )

        # --------------------------------------------------
        # RETRY LOOP
        # --------------------------------------------------

        for attempt in range(1, max_retries + 1):

            try:

                print(
                    f"Calling Gemini "
                    f"(attempt {attempt}/{max_retries})..."
                )

                # ==========================================
                # CONFIGURATION
                # ==========================================

                if json_mode:

                    config = types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=2500,
                        response_mime_type="application/json"
                    )

                else:

                    config = types.GenerateContentConfig(
                        temperature=0.2,
                        max_output_tokens=700
                    )

                # ==========================================
                # GEMINI REQUEST
                # ==========================================

                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config
                )

                # ==========================================
                # EMPTY RESPONSE
                # ==========================================

                if response is None:

                    raise RuntimeError(
                        "Gemini returned an empty response."
                    )

                # ==========================================
                # GET RESPONSE TEXT
                # ==========================================

                answer = getattr(
                    response,
                    "text",
                    None
                )

                if answer:

                    answer = clean_response(answer)

                    print(
                        f"{model_name} returned "
                        f"a valid response."
                    )

                    return answer

                print(
                    f"{model_name} returned "
                    f"an empty response."
                )

            # ==================================================
            # ERROR HANDLING
            # ==================================================

            except Exception as error:

                print(
                    f"\nGemini error on attempt "
                    f"{attempt}: {error}"
                )

                # ==================================================
                # 1. DAILY QUOTA EXHAUSTED
                # ==================================================

                if is_daily_quota_error(error):

                    print(
                        "\nGemini daily/free-tier quota "
                        "has been exhausted."
                    )

                    print(
                        "Stopping retries for this model."
                    )

                    # IMPORTANT:
                    # Do NOT retry 3 times.
                    # Do NOT immediately hammer fallback
                    # with the same exhausted quota.

                    if json_mode:

                        return (
                            '{"error": "Gemini daily quota '
                            'has been exhausted. Please try '
                            'again after the quota resets or '
                            'use another available API/model."}'
                        )

                    return (
                        "Gemini daily quota has been exhausted. "
                        "Please try again after the quota resets "
                        "or use another available API/model."
                    )

                # ==================================================
                # 2. 503 HIGH DEMAND
                # ==================================================

                if is_503_error(error):

                    if attempt < max_retries:

                        wait_time = 2 ** attempt

                        print(
                            f"Temporary Gemini error. "
                            f"Retrying in {wait_time} seconds..."
                        )

                        time.sleep(wait_time)

                        continue

                    print(
                        f"{model_name} failed after "
                        f"{max_retries} attempts."
                    )

                    # Move to fallback model
                    break

                # ==================================================
                # 3. 429 RATE LIMIT
                # ==================================================

                if is_429_error(error):

                    # A normal short-term rate limit may recover.
                    if attempt < max_retries:

                        wait_time = min(
                            2 ** attempt,
                            10
                        )

                        print(
                            f"Temporary rate limit. "
                            f"Retrying in {wait_time} seconds..."
                        )

                        time.sleep(wait_time)

                        continue

                    print(
                        f"{model_name} rate limit "
                        f"persisted after {max_retries} attempts."
                    )

                    break

                # ==================================================
                # 4. OTHER ERROR
                # ==================================================

                print(
                    "Unexpected Gemini error."
                )

                traceback.print_exc()

                # Move to fallback model
                break

        # ======================================================
        # MOVE TO FALLBACK MODEL
        # ======================================================

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

        return (
            '{"error": "Gemini could not generate a response '
            'at this time."}'
        )

    return (
        "The AI service is temporarily unavailable. "
        "Please try again later."
    )