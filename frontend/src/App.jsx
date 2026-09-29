import { useState } from "react";
import "./App.css";

import ScopeResult from "./components/ScopeResult";
import RiskResult from "./components/RiskResult";
import BlockerResult from "./components/BlockerResult";
import DocumentationResult from "./components/DocumentationResult";
import GeneralResult from "./components/GeneralResult";

const API_URL = "http://localhost:5000";

function App() {
  const [projectName, setProjectName] = useState("");
  const [files, setFiles] = useState([]);

  const [agent, setAgent] = useState("Auto Routing");
  const [question, setQuestion] = useState("");

  const [agentResult, setAgentResult] = useState(null);
  const [answer, setAnswer] = useState("");

  const [uploadMessage, setUploadMessage] = useState("");

  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);

  const [error, setError] = useState("");

  // =========================================================
  // HANDLE FILE SELECTION
  // =========================================================

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));
    setUploadMessage("");
    setError("");
  };

  // =========================================================
  // UPLOAD DOCUMENTS
  // =========================================================

  const handleUpload = async () => {
    setError("");
    setUploadMessage("");
    setAnswer("");
    setAgentResult(null);

    if (!projectName.trim()) {
      setError("Please enter a project name.");
      return;
    }

    if (files.length === 0) {
      setError("Please select at least one document.");
      return;
    }

    const formData = new FormData();

    formData.append(
      "project_name",
      projectName.trim()
    );

    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      setUploading(true);

      const response = await fetch(
        `${API_URL}/api/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Document upload failed."
        );
      }

      setUploadMessage(
        data.message ||
        "Documents uploaded successfully."
      );

    } catch (error) {
      console.error("Upload error:", error);

      setError(
        error.message || "Upload failed."
      );

    } finally {
      setUploading(false);
    }
  };

  // =========================================================
  // ASK QUESTION
  // =========================================================

  const handleAskQuestion = async () => {
    setError("");
    setAnswer("");
    setAgentResult(null);

    if (!projectName.trim()) {
      setError(
        "Please enter the same project name used during upload."
      );
      return;
    }

    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    try {
      setAsking(true);

      const response = await fetch(
        `${API_URL}/api/ask`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            project_name: projectName.trim(),
            question: question.trim(),
            agent: agent,
          }),
        }
      );

      const data = await response.json();

      console.log("Backend response:", data);

      if (!response.ok) {
        throw new Error(
          data.detail || "Question failed."
        );
      }

      // =====================================================
      // HANDLE AGENT RESULT
      // =====================================================

      if (data.result !== undefined) {
        setAgentResult(data.result);
      }

      if (data.answer !== undefined) {
        setAnswer(data.answer);
      }

      // Support structured result returned directly
      if (
        data.result === undefined &&
        data.answer === undefined
      ) {
        setAgentResult(data);
      }

    } catch (error) {
      console.error("Question error:", error);

      setError(
        error.message || "Question failed."
      );

    } finally {
      setAsking(false);
    }
  };

  // =========================================================
  // RENDER AGENT RESULT
  // =========================================================

  const renderAgentResult = () => {
    if (!agentResult) {
      return null;
    }

    // -------------------------------------------------------
    // Scope Extraction Agent
    // -------------------------------------------------------

    if (
      agent === "Scope Extraction Agent" ||
      agentResult.project_goal !== undefined
    ) {
      return (
        <ScopeResult
          data={agentResult}
        />
      );
    }

    // -------------------------------------------------------
    // Risk Detection Agent
    // -------------------------------------------------------

    if (
      agent === "Risk Detection Agent" ||
      agentResult.risks !== undefined
    ) {
      return (
        <RiskResult
          data={agentResult}
        />
      );
    }

    // -------------------------------------------------------
    // Blocker & Action Item Agent
    // -------------------------------------------------------

    if (
      agent === "Blocker & Action Item Agent" ||
      agentResult.blockers !== undefined ||
      (
        agentResult.action_items !== undefined &&
        agentResult.pending_decisions !== undefined
      )
    ) {
      return (
        <BlockerResult
          data={agentResult}
        />
      );
    }

    // -------------------------------------------------------
    // Documentation Agent
    // -------------------------------------------------------

    if (
      agent === "Documentation Agent" ||
      agentResult.user_stories !== undefined ||
      agentResult.risk_register !== undefined
    ) {
      return (
        <DocumentationResult
          data={agentResult}
        />
      );
    }

    // -------------------------------------------------------
    // General / Auto Routing fallback
    // -------------------------------------------------------

    return (
      <GeneralResult
        data={agentResult}
      />
    );
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="header">

        <h1>
          AI Project Intelligence & Risk Advisor
        </h1>

        <p>
          Analyze your project documents using AI
        </p>

      </header>


      {/* =====================================================
          UPLOAD SECTION
      ===================================================== */}

      <section className="card">

        <h2>
          📁 Upload Project Documents
        </h2>

        <p>
          Upload PDF, DOCX, CSV, or TXT files
        </p>

        {/* Project Name */}

        <label>
          Project Name
        </label>

        <input
          type="text"
          placeholder="Enter project name (e.g., EduRAG)"
          value={projectName}
          onChange={(event) =>
            setProjectName(event.target.value)
          }
        />


        {/* File Input */}

        <label>
          Select Documents
        </label>

        <input
          type="file"
          multiple
          accept=".pdf,.docx,.csv,.txt"
          onChange={handleFileChange}
        />


        {/* Selected Files */}

        {files.length > 0 && (

          <div className="file-list">

            <h4>
              Selected Files:
            </h4>

            <ul>

              {files.map((file, index) => (

                <li key={index}>
                  {file.name}
                </li>

              ))}

            </ul>

          </div>

        )}


        {/* Upload Button */}

        <button
          onClick={handleUpload}
          disabled={uploading}
        >

          {uploading
            ? "Uploading..."
            : "Upload Documents"}

        </button>


        {/* Upload Message */}

        {uploadMessage && (

          <div className="success-message">
            {uploadMessage}
          </div>

        )}

      </section>


      {/* =====================================================
          PROJECT ASSISTANT
      ===================================================== */}

      <section className="card">

        <h2>
          🤖 Ask Your Project Assistant
        </h2>

        <p>
          Select an agent and analyze your project documents
        </p>


        {/* Project Name */}

        <label>
          Project Name
        </label>

        <input
          type="text"
          value={projectName}
          onChange={(event) =>
            setProjectName(event.target.value)
          }
          placeholder="Enter your project name"
        />


        {/* Agent */}

        <label>
          Agent
        </label>

        <select
          value={agent}
          onChange={(event) => {

            setAgent(event.target.value);

            // Clear previous result
            setAgentResult(null);
            setAnswer("");
            setError("");

          }}
        >

          <option value="Auto Routing">
            Auto Routing
          </option>

          <option value="Scope Extraction Agent">
            Scope Extraction Agent
          </option>

          <option value="Risk Detection Agent">
            Risk Detection Agent
          </option>

          <option value="Blocker & Action Item Agent">
            Blocker & Action Item Agent
          </option>

          <option value="Documentation Agent">
            Documentation Agent
          </option>

        </select>


        {/* Question */}

        <label>
          Question
        </label>

        <textarea
          rows="5"
          placeholder="Ask a question about your project..."
          value={question}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
        />


        {/* Ask Button */}

        <button
          onClick={handleAskQuestion}
          disabled={asking}
        >

          {asking
            ? "Analyzing..."
            : "Ask Question"}

        </button>

      </section>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (

        <div className="error-message">
          {error}
        </div>

      )}


      {/* =====================================================
          STRUCTURED AGENT RESULT
      ===================================================== */}

      {agentResult && (

        <section className="card">

          {renderAgentResult()}

        </section>

      )}


      {/* =====================================================
          GENERAL AI ANSWER
      ===================================================== */}

      {answer && (

        <section className="card">

          <h2>
            💡 AI Response
          </h2>

          <p>
            Retrieved project intelligence
          </p>

          <div className="answer-box">

            <p>
              {answer}
            </p>

          </div>

        </section>

      )}


      {/* =====================================================
          EMPTY STATE
      ===================================================== */}

      {!agentResult && !answer && !asking && (

        <section className="card">

          <h2>
            💡 AI Response
          </h2>

          <div className="answer-box">

            <p className="placeholder">
              💬 Your AI result will appear here.
            </p>

          </div>

        </section>

      )}


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer>
        EduRAG • AI Project Intelligence
      </footer>

    </div>
  );
}

export default App;