import os

from .pdf_loader import extract_text_from_pdf
from .docx_loader import extract_text_from_docx
from .csv_loader import extract_text_from_csv
from .txt_loader import extract_text_from_txt


def load_document(file_path):

    extension = os.path.splitext(
        file_path
    )[1].lower()

    if extension == ".pdf":

        return extract_text_from_pdf(file_path)

    elif extension == ".docx":

        return extract_text_from_docx(file_path)

    elif extension == ".csv":

        return extract_text_from_csv(file_path)

    elif extension == ".txt":

        return extract_text_from_txt(file_path)

    else:

        raise ValueError(
            f"Unsupported file type: {extension}"
        )