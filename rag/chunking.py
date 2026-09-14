def chunk_text(
    text,
    chunk_size=1000,
    overlap=150
):
    """
    Split project documents into overlapping chunks.

    Larger chunks help preserve related information such as
    milestones, timelines, responsibilities, and project risks.
    """

    chunks = []

    start = 0
    text_length = len(text)

    while start < text_length:

        end = start + chunk_size

        chunk = text[start:end]

        if chunk.strip():

            chunks.append(
                chunk.strip()
            )

        start += chunk_size - overlap

    return chunks