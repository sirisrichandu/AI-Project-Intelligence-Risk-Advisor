
import { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  const [projectName, setProjectName] = useState("");
  const [files, setFiles] = useState([]);
  const [agent, setAgent] = useState("Auto Routing");
  const [question, setQuestion] = useState("");

  const [uploadMessage, setUploadMessage] = useState("");
  const [answer, setAnswer] = useState("");

  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);

  const [error, setError] = useState("");

  // -----------------------------
  // Handle File Selection
  // -----------------------------
  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));

    setUploadMessage("");
    setError("");
  };

  // -----------------------------
  // Upload Documents
  // -----------------------------
  const handleUpload = async () => {
    setError("");
    setUploadMessage("");
    setAnswer("");

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
          body: formData
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

  // -----------------------------
  // Ask Question
  // -----------------------------
  const handleAskQuestion = async () => {
    setError("");
    setAnswer("");

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
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            project_name: projectName.trim(),
            question: question.trim(),
            agent: agent
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Question failed."
        );
      }

      setAnswer(
        data.answer ||
        data.response ||
        data.message ||
        "No answer received."
      );

    } catch (error) {
      console.error("Question error:", error);

      setError(
        error.message || "Question failed."
      );

    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <h1>
          AI Project Intelligence & Risk Advisor
        </h1>

        <p>
          Analyze your project documents using AI
        </p>
      </header>


      {/* Upload Section */}
      <section className="card">

        <h2>📁 Upload Project Documents</h2>

        <p>
          Upload PDF, DOCX, CSV, or TXT files
        </p>


        {/* Project Name */}
        <label>
          Project Name
        </label>

        <input
          type="text"
          placeholder="Enter project name (e.g., Edurag)"
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

            <h4>Selected Files:</h4>

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


      {/* Question Section */}
      <section className="card">

        <h2>🤖 Ask Your Project Assistant</h2>

        <p>
          Get answers from your uploaded documents
        </p>


        {/* Project Name Display */}
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
          onChange={(event) =>
            setAgent(event.target.value)
          }
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
            ? "Loading..."
            : "Ask Question"}
        </button>

      </section>


      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}


      {/* AI Response */}
      <section className="card">

        <h2>💡 AI Response</h2>

        <p>
          Retrieved project intelligence
        </p>

        <div className="answer-box">

          {answer ? (
            <p>
              {answer}
            </p>
          ) : (
            <p className="placeholder">
              💬 Your AI answer will appear here.
            </p>
          )}

        </div>

      </section>


      {/* Footer */}
      <footer>
        EduRAG • AI Project Intelligence
      </footer>

    </div>
  );
}

export default App;