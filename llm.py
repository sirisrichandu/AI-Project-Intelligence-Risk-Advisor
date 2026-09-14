import requests


# ============================================================
# OLLAMA CONFIGURATION
# ============================================================

OLLAMA_URL = "http://localhost:11434/api/generate"

MODEL_NAME = "qwen2.5:1.5b"


# ============================================================
# LLM RESPONSE FUNCTION
# ============================================================

def generate_answer(question, context):
    """
    Generate an answer using the local Ollama LLM.

    The answer is generated using only the
    retrieved project context.
    """

    prompt = f"""
You are an AI Project Intelligence Assistant.

Answer the user's question using ONLY the project
context provided below.

Do not use outside knowledge.

If the answer is not available in the context,
say:

"I could not find this information in the
uploaded project documents."

Project Context:

{context}

User Question:

{question}

Answer clearly and concisely.
"""


    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    }


    response = requests.post(
        OLLAMA_URL,
        json=payload,
        timeout=300
    )


    response.raise_for_status()


    result = response.json()


    return result["response"]