import os
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

# Get Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError(
        "GEMINI_API_KEY is missing from the .env file."
    )

# Create Gemini client
client = genai.Client(api_key=GEMINI_API_KEY)

MODEL_NAME = "gemini-3.6-flash"


def generate_answer(question, context):

    prompt = f"""
You are an AI Project Intelligence Assistant.

Answer the user's question using ONLY the
project context provided below.

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

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt
    )

    return response.text