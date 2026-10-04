from docx import Document


def extract_text_from_docx(file_path):

    document = Document(file_path)

    text = []

    # Extract normal paragraphs
    for paragraph in document.paragraphs:

        if paragraph.text.strip():

            text.append(paragraph.text.strip())

    # Extract tables
    for table in document.tables:

        for row in table.rows:

            row_data = []

            for cell in row.cells:

                cell_text = cell.text.strip()

                row_data.append(cell_text)

            if any(row_data):

                text.append(" | ".join(row_data))

    return "\n".join(text)