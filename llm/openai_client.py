import streamlit as st
from openai import OpenAI


# Create OpenAI client using the API key stored in Streamlit secrets
client = OpenAI(
    api_key=st.secrets["OPENAI_API_KEY"]
)


def ask_llm(prompt: str) -> str:
    """
    Send a prompt to the OpenAI model and return the response.
    """

    response = client.responses.create(
        model="gpt-5.6-luna",
        input=prompt
    )

    return response.output_text