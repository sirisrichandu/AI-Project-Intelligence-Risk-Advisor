from ingestion.document_loader import load_document


files = [
    "data/sample_documents/project_notes.txt",
    "data/sample_documents/project_report.docx",
    "data/sample_documents/project_report.csv"
]


for file_path in files:
    print("\n==============================")
    print("Testing:", file_path)
    print("==============================")

    text = load_document(file_path)

    print(text[:500])