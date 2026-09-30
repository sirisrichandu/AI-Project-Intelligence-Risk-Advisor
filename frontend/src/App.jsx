import { useState } from "react";
import "./App.css";

import ScopeResult from "./components/ScopeResult";
import RiskResult from "./components/RiskResult";
import BlockerResult from "./components/BlockerResult";
import DocumentationResult from "./components/DocumentationResult";
import GeneralResult from "./components/GeneralResult";

const API_URL = "http://localhost:5000";

const CONVERSATIONAL_AGENT =
  "Conversational Project Intelligence";

function App() {
  // =========================================================
  // PROJECT / UPLOAD STATE
  // =========================================================

  const [projectName, setProjectName] = useState("");
  const [files, setFiles] = useState([]);

  const [uploadMessage, setUploadMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  // =========================================================
  // AGENT STATE
  // =========================================================

  const [agent, setAgent] = useState("Auto Routing");

  const [question, setQuestion] = useState("");

  const [agentResult, setAgentResult] = useState(null);

  const [answer, setAnswer] = useState("");

  const [asking, setAsking] = useState(false);

  const [error, setError] = useState("");

  // =========================================================
  // CONVERSATIONAL AI
  // =========================================================

  const [conversationHistory, setConversationHistory] =
    useState([]);

  // =========================================================
  // HEALTH SCORE
  // =========================================================

  const [healthScore, setHealthScore] = useState(null);

  // =========================================================
  // VALIDATION
  // =========================================================

  const [validationQuestion, setValidationQuestion] =
    useState("");

  const [validationAnswer, setValidationAnswer] =
    useState("");

  // =========================================================
  // FILE SELECTION
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
    setHealthScore(null);

    // New upload = new conversation
    setConversationHistory([]);

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
          data.detail ||
            "Document upload failed."
        );
      }

      setUploadMessage(
        data.message ||
          "Documents uploaded successfully."
      );

    } catch (err) {
      console.error(
        "Upload error:",
        err
      );

      setError(
        err.message ||
          "Upload failed."
      );

    } finally {
      setUploading(false);
    }
  };

  // =========================================================
  // ASK NORMAL AGENT
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

    const currentQuestion =
      question.trim();

    try {
      setAsking(true);

      const response = await fetch(
        `${API_URL}/api/ask`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            project_name:
              projectName.trim(),

            question:
              currentQuestion,

            agent:
              agent,

            conversation_history:
              conversationHistory,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        "Backend response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Question failed."
        );
      }

      // =====================================================
      // HEALTH SCORE
      // =====================================================

      if (
        agent ===
          "Project Health Score" ||
        data.health_score !== undefined
      ) {
        const score =
          data.health_score ??
          data.result ??
          data;

        setHealthScore(score);

        setQuestion("");

        return;
      }

      // =====================================================
      // CONVERSATIONAL AGENT
      // =====================================================

      if (
        agent ===
        CONVERSATIONAL_AGENT
      ) {
        const aiAnswer =
          data.answer ||
          data.response ||
          "No answer was returned.";

        setAnswer(aiAnswer);

        setConversationHistory(
          (previousHistory) => [
            ...previousHistory,

            {
              role: "user",
              content:
                currentQuestion,
            },

            {
              role: "assistant",
              content:
                aiAnswer,
            },
          ]
        );

        setQuestion("");

        return;
      }

      // =====================================================
      // NORMAL AGENTS
      // =====================================================

      if (
        data.result !== undefined
      ) {
        setAgentResult(
          data.result
        );
      }

      if (
        data.answer !== undefined
      ) {
        setAnswer(
          data.answer
        );
      }

      if (
        data.result === undefined &&
        data.answer === undefined
      ) {
        setAgentResult(data);
      }

      setQuestion("");

    } catch (err) {
      console.error(
        "Question error:",
        err
      );

      setError(
        err.message ||
          "Question failed."
      );

    } finally {
      setAsking(false);
    }
  };

  // =========================================================
  // CONVERSATIONAL AI
  // =========================================================

  const handleConversationalAsk =
    async () => {

      setError("");

      if (!projectName.trim()) {
        setError(
          "Please enter the project name and upload project documents first."
        );
        return;
      }

      if (!question.trim()) {
        setError(
          "Please enter a question."
        );
        return;
      }

      const currentQuestion =
        question.trim();

      try {
        setAsking(true);

        const response =
          await fetch(
            `${API_URL}/api/ask`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                project_name:
                  projectName.trim(),

                question:
                  currentQuestion,

                agent:
                  CONVERSATIONAL_AGENT,

                conversation_history:
                  conversationHistory,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Conversational AI request failed."
          );
        }

        const aiAnswer =
          data.answer ||
          data.response ||
          "No answer was returned.";

        // Add user message + AI response
        setConversationHistory(
          (previousHistory) => [
            ...previousHistory,

            {
              role: "user",
              content:
                currentQuestion,
            },

            {
              role: "assistant",
              content:
                aiAnswer,
            },
          ]
        );

        setQuestion("");

      } catch (err) {
        console.error(
          "Conversational AI error:",
          err
        );

        setError(
          err.message ||
            "Conversational AI failed."
        );

      } finally {
        setAsking(false);
      }
    };

  // =========================================================
  // CLEAR CONVERSATION
  // =========================================================

  const clearConversation = () => {
    setConversationHistory([]);
    setQuestion("");
    setError("");
  };

  // =========================================================
  // VALIDATE CONVERSATIONAL AI
  // =========================================================

  const handleValidation = async () => {
    setError("");
    setValidationAnswer("");

    if (!projectName.trim()) {
      setError(
        "Please enter the project name first."
      );
      return;
    }

    if (!validationQuestion.trim()) {
      setError(
        "Please enter a validation question."
      );
      return;
    }

    try {
      setAsking(true);

      const response = await fetch(
        `${API_URL}/api/ask`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            project_name:
              projectName.trim(),

            question:
              validationQuestion.trim(),

            agent:
              CONVERSATIONAL_AGENT,

            conversation_history: [],
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Validation request failed."
        );
      }

      setValidationAnswer(
        data.answer ||
          data.response ||
          "No answer returned."
      );

    } catch (err) {
      console.error(
        "Validation error:",
        err
      );

      setError(
        err.message ||
          "Validation failed."
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

    // Scope
    if (
      agent ===
        "Scope Extraction Agent" ||
      agentResult.project_goal !==
        undefined
    ) {
      return (
        <ScopeResult
          data={agentResult}
        />
      );
    }

    // Risk
    if (
      agent ===
        "Risk Detection Agent" ||
      agentResult.risks !==
        undefined
    ) {
      return (
        <RiskResult
          data={agentResult}
        />
      );
    }

    // Blockers
    if (
      agent ===
        "Blocker & Action Item Agent" ||
      agentResult.blockers !==
        undefined ||
      agentResult.action_items !==
        undefined
    ) {
      return (
        <BlockerResult
          data={agentResult}
        />
      );
    }

    // Documentation
    if (
      agent ===
        "Documentation Agent" ||
      agent ===
        "Documentation Generation Agent" ||
      agentResult.user_stories !==
        undefined ||
      agentResult.risk_register !==
        undefined
    ) {
      return (
        <DocumentationResult
          data={agentResult}
        />
      );
    }

    return (
      <GeneralResult
        data={agentResult}
      />
    );
  };

  // =========================================================
  // HEALTH SCORE
  // =========================================================

  const renderHealthScore = () => {
    if (!healthScore) {
      return null;
    }

    const score =
      healthScore.overall_score ??
      healthScore.score ??
      0;

    const status =
      healthScore.overall_status ||
      healthScore.status ||
      "Unknown";

    const dimensions =
      healthScore.dimensions ||
      {};

    return (
      <section className="card">

        <h2>
          📊 Project Health Score
        </h2>

        <div className="health-score-box">

          <h1>
            {score}/100
          </h1>

          <p>
            Overall Status:{" "}
            <strong>
              {status}
            </strong>
          </p>

        </div>

        <div className="health-dimensions">

          {dimensions.scope_clarity && (
            <div className="health-dimension">

              <h3>
                Scope Clarity
              </h3>

              <strong>
                {
                  dimensions
                    .scope_clarity
                    .score
                }/100
              </strong>

              <p>
                {
                  dimensions
                    .scope_clarity
                    .status
                }
              </p>

              <small>
                {
                  dimensions
                    .scope_clarity
                    .evidence
                }
              </small>

            </div>
          )}

          {dimensions.timeline_risk && (
            <div className="health-dimension">

              <h3>
                Timeline Risk
              </h3>

              <strong>
                {
                  dimensions
                    .timeline_risk
                    .score
                }/100
              </strong>

              <p>
                {
                  dimensions
                    .timeline_risk
                    .status
                }
              </p>

              <small>
                {
                  dimensions
                    .timeline_risk
                    .evidence
                }
              </small>

            </div>
          )}

          {dimensions.blocker_count && (
            <div className="health-dimension">

              <h3>
                Blocker Count
              </h3>

              <strong>
                {
                  dimensions
                    .blocker_count
                    .score
                }/100
              </strong>

              <p>
                {
                  dimensions
                    .blocker_count
                    .status
                }
              </p>

              <small>
                {
                  dimensions
                    .blocker_count
                    .evidence
                }
              </small>

            </div>
          )}

        </div>

      </section>
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
          Analyze, monitor, and interact with
          your project using AI
        </p>

      </header>


      {/* =====================================================
          UPLOAD
      ===================================================== */}

      <section className="card">

        <h2>
          📁 Upload Project Documents
        </h2>

        <p>
          Upload PDF, DOCX, CSV, or TXT files
        </p>

        <label>
          Project Name
        </label>

        <input
          type="text"
          placeholder="Enter project name"
          value={projectName}
          onChange={(e) =>
            setProjectName(
              e.target.value
            )
          }
        />

        <label>
          Select Documents
        </label>

        <input
          type="file"
          multiple
          accept=".pdf,.docx,.csv,.txt"
          onChange={handleFileChange}
        />

        {files.length > 0 && (
          <div className="file-list">

            <h4>
              Selected Files:
            </h4>

            <ul>

              {files.map(
                (file, index) => (
                  <li key={index}>
                    {file.name}
                  </li>
                )
              )}

            </ul>

          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading
            ? "Uploading..."
            : "Upload Documents"}
        </button>

        {uploadMessage && (
          <div className="success-message">
            {uploadMessage}
          </div>
        )}

      </section>


      {/* =====================================================
          PROJECT INTELLIGENCE
      ===================================================== */}

      <section className="card">

        <h2>
          🤖 Project Intelligence
        </h2>

        <p>
          Select an analysis mode or interact
          with your project documents.
        </p>

        <label>
          Agent / Feature
        </label>

        <select
          value={agent}
          onChange={(e) => {

            const selectedAgent =
              e.target.value;

            setAgent(
              selectedAgent
            );

            setAgentResult(null);
            setAnswer("");
            setHealthScore(null);
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
            Documentation Generation Agent
          </option>

          <option value="Project Health Score">
            📊 Project Health Score
          </option>

          <option value={CONVERSATIONAL_AGENT}>
            💬 Conversational Project Intelligence
          </option>

        </select>


        {/* NORMAL AGENT QUESTION */}

        {agent !==
          CONVERSATIONAL_AGENT && (

          <>

            <label>
              Question
            </label>

            <textarea
              rows="5"
              placeholder="Ask a question about your project..."
              value={question}
              onChange={(e) =>
                setQuestion(
                  e.target.value
                )
              }
            />

            <button
              onClick={
                handleAskQuestion
              }
              disabled={asking}
            >
              {asking
                ? "Analyzing..."
                : "Ask Question"}
            </button>

          </>

        )}

      </section>


      {/* =====================================================
          FULL CONVERSATIONAL PROJECT INTELLIGENCE
          ALWAYS VISIBLE
      ===================================================== */}

      <section className="card">

        <h2>
          💬 Conversational Project Intelligence
        </h2>

        <p>
          Chat with your project assistant using
          information from your uploaded project
          documents.
        </p>

        <div className="project-chat-info">

          <strong>
            Current Project:
          </strong>{" "}

          {projectName.trim()
            ? projectName
            : "Enter a project name above"}

        </div>


        {/* CHAT WINDOW */}

        <div className="chat-container">

          {conversationHistory.length === 0 ? (

            <div className="empty-chat">

              <h3>
                🤖 Project Assistant
              </h3>

              <p>
                Start a conversation with
                your project assistant.
              </p>

              <p>
                You can ask:
              </p>

              <p>
                <strong>
                  "What is the project deadline?"
                </strong>
              </p>

              <p>
                <strong>
                  "What are the main project risks?"
                </strong>
              </p>

              <p>
                <strong>
                  "Are we on track?"
                </strong>
              </p>

              <p>
                <strong>
                  "What should we do about this risk?"
                </strong>
              </p>

            </div>

          ) : (

            conversationHistory.map(
              (message, index) => (

                <div
                  key={index}
                  className={
                    message.role === "user"
                      ? "message user-message"
                      : "message ai-message"
                  }
                >

                  <strong>
                    {message.role === "user"
                      ? "You"
                      : "🤖 AI Assistant"}
                  </strong>

                  <p>
                    {message.content}
                  </p>

                </div>

              )
            )

          )}

          {asking && (
            <div className="message ai-message">

              <strong>
                🤖 AI Assistant
              </strong>

              <p>
                Thinking...
              </p>

            </div>
          )}

        </div>


        {/* CHAT INPUT */}

        <label>
          Ask your project assistant
        </label>

        <textarea
          rows="4"
          placeholder="Ask something about your project..."
          value={question}
          disabled={asking}
          onChange={(e) =>
            setQuestion(
              e.target.value
            )
          }
          onKeyDown={(e) => {

            if (
              e.key === "Enter" &&
              !e.shiftKey
            ) {

              e.preventDefault();

              if (!asking) {
                handleConversationalAsk();
              }

            }

          }}
        />


        <div className="button-row">

          <button
            onClick={
              handleConversationalAsk
            }
            disabled={
              asking ||
              !question.trim()
            }
          >
            {asking
              ? "Thinking..."
              : "Send Message"}
          </button>


          {conversationHistory.length >
            0 && (

            <button
              className="clear-button"
              onClick={
                clearConversation
              }
              disabled={asking}
            >
              Clear Conversation
            </button>

          )}

        </div>

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
          AGENT RESULT
      ===================================================== */}

      {agentResult &&
        agent !==
          CONVERSATIONAL_AGENT && (

        <section className="card">

          {renderAgentResult()}

        </section>

      )}


      {/* =====================================================
          HEALTH SCORE
      ===================================================== */}

      {renderHealthScore()}


      {/* =====================================================
          NORMAL AI RESPONSE
      ===================================================== */}

      {answer &&
        agent !==
          CONVERSATIONAL_AGENT && (

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
          CONVERSATIONAL AI VALIDATION
          TESTING ONLY
      ===================================================== */}

      <section className="card">

        <h2>
          🧪 Conversational AI Validation
        </h2>

        <p>
          Test whether the conversational assistant
          answers using information from the uploaded
          project documents.
        </p>

        <label>
          Validation Question
        </label>

        <textarea
          rows="3"
          placeholder="Example: What is the project deadline?"
          value={validationQuestion}
          onChange={(e) =>
            setValidationQuestion(
              e.target.value
            )
          }
        />

        <button
          onClick={
            handleValidation
          }
          disabled={asking}
        >
          {asking
            ? "Testing..."
            : "Test Assistant"}
        </button>

        {validationAnswer && (

          <div className="answer-box">

            <h3>
              Assistant Response
            </h3>

            <p>
              {validationAnswer}
            </p>

          </div>

        )}

      </section>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer>
        AI Project Intelligence & Risk Advisor
      </footer>

    </div>
  );
}

export default App;