import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.store import project_store
from backend.chroma_service import chroma_service

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health-check")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "runtime" in data

def test_project_summary_empty():
    project_store.clear_all()
    response = client.get("/api/project/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["totalDocuments"] == 0
    assert data["totalRisks"] == 0

def test_document_upload_and_indexing():
    payload = {
        "files": [
            {
                "name": "Architecture_Spec.md",
                "content": (
                    "Project Scope: Automated Safety Helmet Detection Platform.\n"
                    "Objective: Real-time worker safety compliance across construction zones.\n"
                    "Requirement: High throughput edge inference under 50ms latency.\n"
                    "Risk: Critical camera disconnect failures during high winds.\n"
                    "Blocker: Missing GPU edge hardware allocation for camera stream ingestion.\n"
                    "Action Item: Deploy containerized edge fallback driver by Sprint 4.\n"
                    "Task: T-101, Camera stream ingestion driver, Due: 2026-10-30\n"
                ),
                "category": "requirements"
            }
        ]
    }
    response = client.post("/api/upload-json", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["uploadedDocuments"]) == 1
    assert data["totalChromaChunks"] >= 1
    assert len(project_store.documents) == 1

def test_semantic_search():
    response = client.post("/api/knowledge-base/search", json={"query": "camera disconnect latency"})
    assert response.status_code == 200
    data = response.json()
    assert data["totalMatches"] >= 1
    assert any("camera" in r["text"].lower() or "latency" in r["text"].lower() for r in data["results"])

def test_langgraph_pipeline_run():
    response = client.post("/api/pipeline/run")
    assert response.status_code == 200
    data = response.json()
    assert "pipelineEngine" in data
    assert "LangGraph" in data["pipelineEngine"]
    assert "executionTrace" in data
    assert len(data["executionTrace"]) >= 5
    assert len(data["risks"]) >= 1
    assert data["health"]["overall"] > 0
    assert data["documentationOutput"] != ""

def test_ask_assistant_with_rag():
    response = client.post("/api/ask", json={"query": "What are the major camera risks?"})
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "agentUsed" in data
    assert isinstance(data["sources"], list)

def test_report_generation():
    response = client.post("/api/reports/generate", json={"title": "Test Executive Dossier"})
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Executive Dossier"
    assert "id" in data
    report_id = data["id"]

    del_resp = client.delete(f"/api/reports/{report_id}")
    assert del_resp.status_code == 200

def test_sample_files_download():
    resp_csv = client.get("/api/sample-files/csv")
    assert resp_csv.status_code == 200
    assert "text/csv" in resp_csv.headers["content-type"]

    resp_txt = client.get("/api/sample-files/txt")
    assert resp_txt.status_code == 200

    resp_real = client.get("/api/sample-files/download/doc-1791342532624-2_Helmet_Detection_Industry_Level_SRS.pdf")
    assert resp_real.status_code == 200
    assert len(resp_real.content) > 500

def test_document_deletion():
    assert len(project_store.documents) > 0
    doc_id = project_store.documents[0].id
    del_resp = client.delete(f"/api/documents/{doc_id}")
    assert del_resp.status_code == 200
    assert len(project_store.documents) == 0

def test_project_reset():
    response = client.post("/api/project/reset")
    assert response.status_code == 200
    assert project_store.documents == []
    assert project_store.risks == []

def test_knowledge_base_reset_unconfirmed():
    # Attempting reset without confirmation must be rejected with 400
    resp_empty = client.post("/api/knowledge-base/reset", json={})
    assert resp_empty.status_code == 400
    assert "confirmation required" in resp_empty.json()["detail"].lower()

    resp_wrong_phrase = client.post("/api/knowledge-base/reset", json={"confirm": True, "confirmation_phrase": "WRONG"})
    assert resp_wrong_phrase.status_code == 400

def test_knowledge_base_reset_confirmed_and_reupload_search():
    # 1. Reset collection with required confirmation phrase
    reset_resp = client.post(
        "/api/knowledge-base/reset",
        json={"confirm": True, "confirmation_phrase": "CONFIRM_RESET"}
    )
    assert reset_resp.status_code == 200
    res_data = reset_resp.json()
    assert res_data["status"] == "success"
    assert res_data["collectionPreserved"] is True
    assert res_data["collection"] == "project_knowledge_base"
    assert chroma_service.collection.count() == 0

    # 2. Upload new demonstration document
    demo_doc = {
        "files": [
            {
                "name": "Demo_Drone_Surveillance.md",
                "content": (
                    "New Demonstration Artifact: High-resolution thermal drone camera integration.\n"
                    "Requirement: Real-time worker thermal signature detection.\n"
                    "Risk: High temperature overheating in direct desert sun operations."
                ),
                "category": "requirements"
            }
        ]
    }
    upload_resp = client.post("/api/upload-json", json=demo_doc)
    assert upload_resp.status_code == 200
    assert upload_resp.json()["totalChromaChunks"] >= 1
    assert chroma_service.collection.count() >= 1

    # 3. Perform semantic search over newly uploaded document
    search_resp = client.post(
        "/api/knowledge-base/search",
        json={"query": "thermal drone overheating temperature"}
    )
    assert search_resp.status_code == 200
    s_data = search_resp.json()
    assert s_data["totalMatches"] >= 1
    assert any("drone" in r["text"].lower() or "thermal" in r["text"].lower() for r in s_data["results"])

def test_knowledge_base_project_specific_reset():
    # Index chunks for two distinct projects
    chroma_service.add_document_chunks(
        document_id="doc_alpha",
        document_name="Alpha_Spec.txt",
        chunks=[{"text": "Project Alpha sensitive blueprint specifications.", "category": "general", "page": 1}],
        project_id="proj_alpha"
    )
    chroma_service.add_document_chunks(
        document_id="doc_beta",
        document_name="Beta_Spec.txt",
        chunks=[{"text": "Project Beta critical roadmap milestones.", "category": "general", "page": 1}],
        project_id="proj_beta"
    )

    # Reset only Project Alpha
    reset_resp = client.post(
        "/api/knowledge-base/reset",
        json={"confirm": True, "confirmation_phrase": "CONFIRM_RESET", "project_id": "proj_alpha"}
    )
    assert reset_resp.status_code == 200

    # Verify Beta records are preserved
    beta_search = client.post(
        "/api/knowledge-base/search",
        json={"query": "roadmap milestones", "project_id": "proj_beta"}
    )
    assert beta_search.status_code == 200
    assert beta_search.json()["totalMatches"] >= 1

def test_knowledge_base_reset_failure_handling(monkeypatch):
    # Simulate ChromaDB internal failure during clearing
    def mock_fail(*args, **kwargs):
        raise RuntimeError("Simulated disk I/O lock error")

    monkeypatch.setattr(chroma_service.collection, "delete", mock_fail)
    fail_resp = client.post(
        "/api/knowledge-base/reset",
        json={"confirm": True, "confirmation_phrase": "CONFIRM_RESET"}
    )
    assert fail_resp.status_code == 500
    assert "failed" in fail_resp.json()["detail"].lower()

def test_empty_or_whitespace_extraction_rejected_422():
    # Empty content string must be rejected with 422
    resp_empty = client.post("/api/upload-json", json={
        "files": [{"name": "empty.txt", "content": "   \n\t  "}]
    })
    assert resp_empty.status_code == 422
    assert "empty or whitespace" in resp_empty.json()["detail"].lower()

def test_missing_bytes_and_content_rejected_422():
    # Neither base64 nor content provided must be rejected with 422
    resp_missing = client.post("/api/upload-json", json={
        "files": [{"name": "no_data.pdf"}]
    })
    assert resp_missing.status_code == 422
    assert "neither valid file bytes" in resp_missing.json()["detail"].lower()

def test_missing_sample_file_returns_404():
    # Downloading non-existent sample file must return 404, not fake placeholder content
    resp = client.get("/api/sample-files/download/completely_non_existent_file_9988.xyz")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()

def test_chroma_insertion_failure_distinguished(monkeypatch):
    # When collection.add fails, it must fall back to JSON and distinguish native ChromaDB from fallback
    if chroma_service.collection:
        def mock_add_fail(*args, **kwargs):
            raise RuntimeError("ChromaDB mock embedding index failure")
        monkeypatch.setattr(chroma_service.collection, "add", mock_add_fail)

    res = chroma_service.add_document_chunks(
        document_id="doc_fail_test",
        document_name="Fail_Test.txt",
        chunks=[{"text": "Sample text chunk", "category": "general", "page": 1}]
    )
    assert res.native_chroma_success is False
    assert "fallback" in res.storage_mode.lower()


