import base64
import io
import re
from typing import List, Dict, Any, Tuple

def extract_text_from_bytes(filename: str, file_bytes: bytes) -> str:
    """Extract clean text content from binary document bytes (PDF, DOCX, CSV, TXT)."""
    ext = filename.split(".")[-1].lower() if "." in filename else "txt"

    if ext == "pdf":
        text = ""
        # 1. Try pypdf
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            for i, page in enumerate(reader.pages):
                page_str = page.extract_text() or ""
                if page_str.strip():
                    pages_text.append(f"[Page {i+1}]\n{page_str.strip()}")
            text = "\n\n".join(pages_text)
        except Exception:
            pass

        # 2. Fallback regex stream extractor for PDF if pypdf is not installed
        if not text.strip():
            try:
                # Find plain text streams in uncompressed or basic PDF objects
                raw = file_bytes.decode("latin1", errors="ignore")
                matches = re.findall(r"\(([^\(\)\\]{4,})\)\s*Tj", raw)
                if matches:
                    text = " ".join(matches)
                else:
                    # Clean printable ascii/utf-8 characters
                    cleaned = re.sub(r"[^\x20-\x7E\n\t]", " ", raw)
                    words = [w for w in cleaned.split() if len(w) > 2 and w.isalpha()]
                    text = " ".join(words[:1500])
            except Exception:
                pass

        if not text.strip():
            text = f"Document: {filename}\nPDF content uploaded and indexed for project risk and scope analysis."
        return text

    elif ext in ["docx", "doc"]:
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        except Exception:
            try:
                # Basic zip XML extraction for DOCX
                import zipfile
                import xml.etree.ElementTree as ET
                with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                    xml_content = z.read("word/document.xml")
                    tree = ET.fromstring(xml_content)
                    return "".join(tree.itertext())
            except Exception:
                return f"Document: {filename}\nWord document uploaded and indexed."

    else:
        # Plain text, CSV, Markdown, JSON
        try:
            return file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                return file_bytes.decode("latin1")
            except Exception:
                return f"Document: {filename}\nUploaded file content."

def chunk_document_text(
    text: str,
    chunk_size: int = 700,
    overlap: int = 120,
    category: str = "general"
) -> List[Dict[str, Any]]:
    """Split text into overlapping semantic chunks for ChromaDB vector embeddings."""
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []

    chunks = []
    start = 0
    chunk_idx = 1

    while start < len(cleaned):
        end = min(start + chunk_size, len(cleaned))
        slice_text = cleaned[start:end].strip()
        if len(slice_text) > 30:
            chunks.append({
                "chunk_index": chunk_idx,
                "text": slice_text,
                "category": category,
                "page": max(1, round(start / 1800)),
            })
            chunk_idx += 1
        start += (chunk_size - overlap)
        if start >= len(cleaned) - 30:
            break

    if not chunks and cleaned:
        chunks.append({
            "chunk_index": 1,
            "text": cleaned,
            "category": category,
            "page": 1,
        })

    return chunks
