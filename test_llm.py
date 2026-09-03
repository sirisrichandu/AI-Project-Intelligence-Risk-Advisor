from llm import generate_answer


question = "What is the project deadline?"


context = """
The planned project completion deadline
is December 15, 2026.
"""


answer = generate_answer(
    question,
    context
)


print(
    "\n========== LLM TEST =========="
)

print(
    "\nQuestion:"
)

print(question)


print(
    "\nAnswer:"
)

print(answer)