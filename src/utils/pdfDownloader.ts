import jsPDF from 'jspdf';

export function downloadSinglePDF(
  title: string = 'Project_Documentation',
  textToPrint?: string
) {
  const safeText =
    textToPrint && textToPrint.trim().length > 0
      ? textToPrint
      : `1. User Stories & Scope Synthesis
Status\tDeliverable Status
US-01\tAwaiting project document ingestion. Upload project documents in the Documents tab and run pipeline to synthesize Agile user stories.
US-02\tAutomated user story extraction links direct functional requirements to acceptance criteria.
US-03\tFull traceability from raw SRS/proposal artifacts to prioritized backlog items.

2. Risk Register & Delivery Forecasting
Status\tRisk Category\tProbability\tImpact\tMitigation Strategy
R-01\tSchedule Risk\tPending\tPending\tRun multi-agent pipeline to detect delivery threats and deadlines.
R-02\tDependency Risk\tPending\tPending\tCross-document analysis identifies external API delays and bottlenecks.
R-03\tResource Risk\tPending\tPending\tMonitors team capacity constraints and critical path allocations.

3. Action Items Register
ID\tAction Deliverable\tAssigned Team\tTarget Deadline\tPriority\tStatus
A-01\tIngest project proposals and architecture artifacts\tProject Team\tSprint Kickoff\tHigh\tReady
A-02\tRun multi-agent intelligence analysis pipeline\tAI System\tImmediate\tCritical\tReady
A-03\tReview health scoring dimensions and mitigation roadmap\tProject Lead\tOngoing\tMedium\tPending`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const maxLineWidth = pageWidth - margin * 2; // 182mm
  let cursorY = 20;

  // Header Banner
  doc.setFillColor(11, 15, 25);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(45, 212, 191);
  doc.setFontSize(13);
  doc.setFont('Helvetica', 'bold');
  doc.text('AI PROJECT INTELLIGENCE & RISK ADVISOR', margin, 12);

  doc.setTextColor(241, 245, 249);
  doc.setFontSize(8.5);
  doc.setFont('Helvetica', 'normal');
  doc.text(
    `Documentation Generation Agent | User Stories, Risk Register & Action Items | Generated: ${new Date().toLocaleDateString()}`,
    margin,
    20
  );

  cursorY = 36;

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin - 8) {
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setTextColor(45, 212, 191);
      doc.setFontSize(8);
      doc.setFont('Helvetica', 'bold');
      doc.text('PROJECT DOCUMENTATION & INTELLIGENCE', margin, 8);
      cursorY = 20;
    }
  };

  const lines = safeText.split('\n');
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      cursorY += 2;
      continue;
    }

    // Section Headers
    if (
      line.startsWith('1. User Stories') ||
      line.startsWith('2. Risk Register') ||
      line.startsWith('3. Action Items') ||
      line.includes('USER STORIES') ||
      line.includes('RISK REGISTER') ||
      line.includes('ACTION ITEMS') ||
      line.includes('Documentation Generation')
    ) {
      currentSection = line;
      checkPageBreak(16);
      cursorY += 3;

      doc.setFillColor(30, 41, 59);
      doc.roundedRect(margin, cursorY, maxLineWidth, 8, 1.5, 1.5, 'F');
      doc.setTextColor(45, 212, 191);
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.text(line.replace(/━/g, '').trim(), margin + 4, cursorY + 5.5);

      cursorY += 12;
      continue;
    }

    // Detect Tab-delimited table rows
    if (rawLine.includes('\t')) {
      const cells = rawLine.split('\t').map((c) => c.trim());
      const isHeader =
        cells[0] === 'ID' ||
        cells[0]?.toLowerCase() === 'id' ||
        cells[0]?.toLowerCase() === 'status' ||
        cells.some((c) => ['User Story', 'Risk', 'Action', 'Probability', 'Impact', 'Mitigation Strategy', 'Assigned Team'].includes(c));

      let colWidths: number[] = [];
      if (currentSection.includes('User Stories') || cells.length === 2) {
        colWidths = [24, maxLineWidth - 24];
      } else if (currentSection.includes('Risk') || (cells.length >= 5 && (cells[1].includes('Risk') || cells[1].includes('Category')))) {
        colWidths = [18, 44, 26, 22, maxLineWidth - 110];
      } else if (currentSection.includes('Action') || cells.length === 6) {
        colWidths = [16, 50, 36, 24, 24, 32];
      } else {
        const w = maxLineWidth / cells.length;
        colWidths = cells.map(() => w);
      }

      doc.setFontSize(8.5);
      doc.setFont('Helvetica', isHeader ? 'bold' : 'normal');

      const wrappedCells = cells.map((cellText, idx) => {
        const width = colWidths[idx] ? colWidths[idx] - 3 : 25;
        const clean = cellText.replace(/[^\x20-\x7E\t\n\r—]/g, '');
        return doc.splitTextToSize(clean, width);
      });

      const maxLines = Math.max(...wrappedCells.map((w) => (Array.isArray(w) ? w.length : 1)), 1);
      const rowHeight = Math.max(maxLines * 4.2 + 3, 7.5);

      checkPageBreak(rowHeight + 2);

      if (isHeader) {
        doc.setFillColor(15, 23, 42);
        doc.rect(margin, cursorY, maxLineWidth, rowHeight, 'F');
        doc.setTextColor(241, 245, 249);
        doc.setDrawColor(51, 65, 85);
        doc.rect(margin, cursorY, maxLineWidth, rowHeight, 'S');
      } else {
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, cursorY, maxLineWidth, rowHeight, 'F');
        }
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, cursorY + rowHeight, margin + maxLineWidth, cursorY + rowHeight);
      }

      let colX = margin;
      cells.forEach((_, idx) => {
        const w = colWidths[idx] || 25;
        const cellLines = wrappedCells[idx];

        if (isHeader) {
          doc.setTextColor(45, 212, 191);
          doc.setFont('Helvetica', 'bold');
        } else {
          doc.setTextColor(idx === 0 ? 15 : 51, idx === 0 ? 23 : 65, idx === 0 ? 42 : 85);
          doc.setFont('Helvetica', idx === 0 ? 'bold' : 'normal');
        }

        doc.text(cellLines, colX + 2, cursorY + 4.5);
        colX += w;
      });

      cursorY += rowHeight;
      continue;
    }

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    const cleanLine = line.replace(/[^\x20-\x7E\t\n\r—]/g, '');
    const wrapped = doc.splitTextToSize(cleanLine, maxLineWidth);
    const blockHeight = wrapped.length * 4.2;

    checkPageBreak(blockHeight);
    doc.text(wrapped, margin, cursorY);
    cursorY += blockHeight + 1.5;
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 15, pageHeight - 8);
  }

  const safeFilename = `${title.replace(/[\s\W]+/g, '_')}.pdf`;
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
  } catch (err) {
    console.warn('Direct blob URL download failed, fallback to doc.save:', err);
    doc.save(safeFilename);
  }
}

export function downloadBlueprintPDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const maxLineWidth = pageWidth - margin * 2;
  let cursorY = 20;

  // Header Banner
  doc.setFillColor(11, 15, 25);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(45, 212, 191);
  doc.setFontSize(13);
  doc.setFont('Helvetica', 'bold');
  doc.text('AI PROJECT INTELLIGENCE & RISK ADVISOR', margin, 12);

  doc.setTextColor(241, 245, 249);
  doc.setFontSize(8.5);
  doc.setFont('Helvetica', 'normal');
  doc.text(
    `Technical Blueprint & Architecture Specification | Verified Platform Roadmap | ${new Date().toLocaleDateString()}`,
    margin,
    20
  );

  cursorY = 36;

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin - 8) {
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setTextColor(45, 212, 191);
      doc.setFontSize(8);
      doc.setFont('Helvetica', 'bold');
      doc.text('AI PROJECT INTELLIGENCE & RISK ADVISOR — TECHNICAL BLUEPRINT', margin, 8);
      cursorY = 20;
    }
  };

  const addSectionHeading = (titleText: string) => {
    checkPageBreak(16);
    cursorY += 2;
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, cursorY, maxLineWidth, 8, 1.5, 1.5, 'F');
    doc.setTextColor(45, 212, 191);
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.text(titleText, margin + 4, cursorY + 5.5);
    cursorY += 12;
  };

  // 1. Executive Purpose
  addSectionHeading('1. Executive Statement & System Purpose');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.setFont('Helvetica', 'normal');
  const summaryText =
    'Transforming scattered project artifacts (proposals, SRS documents, meeting notes, sprint updates, and backlog task sheets) into a unified, living intelligence layer. The platform automates multi-format document ingestion, semantic chunking, multi-agent reasoning, real-time risk forecasting, composite health scoring, and grounded natural language Q&A with verifiable document citations.';
  const wrappedSummary = doc.splitTextToSize(summaryText, maxLineWidth);
  doc.text(wrappedSummary, margin, cursorY);
  cursorY += wrappedSummary.length * 4.5 + 4;

  // 2. Technology Stack Architecture
  addSectionHeading('2. Technology Stack Architecture (12 Production Layers)');
  const techStackItems = [
    { layer: 'Frontend', tech: 'React (TypeScript + Vite + Tailwind CSS)', purpose: 'Interactive dashboard, document upload, multi-agent triggers, and conversational Q&A' },
    { layer: 'Backend', tech: 'FastAPI + Uvicorn', purpose: 'High-throughput async REST APIs and application logic' },
    { layer: 'AI / LLM', tech: 'Google Gemini API', purpose: 'Conversational reasoning and structured multi-agent outputs' },
    { layer: 'RAG', tech: 'ChromaDB', purpose: 'Project-document vector storage and retrieval' },
    { layer: 'Embeddings', tech: 'Sentence Transformers (all-MiniLM-L6-v2)', purpose: 'Convert documents/questions into embeddings' },
    { layer: 'Document Processing', tech: 'Python (pypdf, docx, CSV)', purpose: 'PDF/DOCX/XLSX/CSV/TXT ingestion and semantic chunking' },
    { layer: 'Agent Framework', tech: 'LangGraph & Multi-Agent Architecture', purpose: 'Agent routing and state graph workflow orchestration' },
    { layer: 'Agents', tech: 'Python', purpose: 'Scope, Risk, Blocker/Action, Documentation, Health Scoring' },
    { layer: 'Database / Storage', tech: 'ChromaDB Persistent Vector Store (chroma.sqlite3)', purpose: 'Project-specific knowledge and uploaded documents' },
    { layer: 'Environment', tech: '.env + python-dotenv', purpose: 'Secure API-key management' },
    { layer: 'API Communication', tech: 'REST + JSON', purpose: 'React <-> FastAPI typed DTO communication' },
    { layer: 'Version Control', tech: 'Git + GitHub', purpose: 'Source-code and project management' },
  ];

  techStackItems.forEach((ts) => {
    checkPageBreak(10);
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${ts.layer}: ${ts.tech}`, margin, cursorY);
    cursorY += 4;

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(ts.purpose, margin + 4, cursorY);
    cursorY += 5;
  });

  // 3. 9 Functional Modules
  addSectionHeading('3. Functional Architecture — 9 Core Modules');
  const modules = [
    { id: 'MOD-01', name: 'Document Ingestion & Knowledge Base Construction', desc: 'Accepts PDF, DOCX, XLSX, CSV, and TXT files for semantic chunking and RAG vector store indexing.' },
    { id: 'MOD-02', name: 'RAG Pipeline & Semantic Knowledge Retrieval', desc: 'TF-IDF keyword and cosine semantic retrieval with grounded context generation and exact document citations.' },
    { id: 'MOD-03', name: 'Scope & Deliverable Extraction Agent (Agent 1)', desc: 'Identifies project objectives, milestones, deadlines, requirements, and scope boundary constraints.' },
    { id: 'MOD-04', name: 'Risk Detection & Delivery Forecasting Agent (Agent 2)', desc: 'Detects technical, schedule, dependency, budget, and resource risks with 5x5 impact scoring and mitigations.' },
    { id: 'MOD-05', name: 'Blocker & Action Item Identification Agent (Agent 3)', desc: 'Extracts pending decisions, organizational impediments, and assigns action items with deadlines and owners.' },
    { id: 'MOD-06', name: 'Documentation Generation Agent (Agent 4)', desc: 'Synthesizes Agile User Stories, formal Risk Registers, and Action Items in tabular format with one-click PDF export.' },
    { id: 'MOD-07', name: 'Project Health Scoring Module (Analytics Engine)', desc: 'Calculates 0-100 composite health score across 5 weighted dimensions (Risk 30%, Schedule 20%, Scope 20%, Blockers 15%, Resources 15%).' },
    { id: 'MOD-08', name: 'Conversational Project Intelligence Assistant (AI Router)', desc: 'RAG-grounded natural language chat assistant with intent routing and verifiable document citations.' },
    { id: 'MOD-09', name: 'Executive Insights & Risk Command Center Dashboard', desc: 'Single-pane cockpit with Health Gauge, Risk Priority Matrix, Tasks at Risk tracking, and Pipeline Stepper.' },
  ];

  modules.forEach((mod) => {
    checkPageBreak(12);
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${mod.id}: ${mod.name}`, margin, cursorY);
    cursorY += 4.2;

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const wrappedMod = doc.splitTextToSize(mod.desc, maxLineWidth - 4);
    doc.text(wrappedMod, margin + 4, cursorY);
    cursorY += wrappedMod.length * 4.2 + 2;
  });

  // Page numbering
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 15, pageHeight - 8);
  }

  const safeFilename = 'AI_Project_Intelligence_Technical_Blueprint.pdf';
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
  } catch (err) {
    console.warn('Direct blob URL download failed, fallback to doc.save:', err);
    doc.save(safeFilename);
  }
}
