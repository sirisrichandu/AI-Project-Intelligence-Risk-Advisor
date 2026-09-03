import os

from dotenv import load_dotenv
from openai import OpenAI


load_dotenv()


client = OpenAI(
    api_key=os.getenv(
        "OPENAI_API_KEY"
    )
)


def generate_answer(
    question,
    context
):

    prompt = f"""
You are an AI Project Intelligence Assistant.

Answer the user's question using only
the project context provided below.

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

    response = client.responses.create(

        model="gpt-5-mini",

        input=prompt

    )

    return response.output_text