from llm import generate_answer


answer = generate_answer(
    question="What is artificial intelligence?",
    context=(
        "Artificial intelligence allows computers to perform "
        "tasks that normally require human intelligence."
    )
)


print("Gemini Response:")
print(answer)