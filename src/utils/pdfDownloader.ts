import jsPDF from 'jspdf';

export interface StructuredDocData {
  projectName?: string;
  generatedDate?: string;
  totalChunks?: number;
  totalDocs?: number;
}

export function downloadSinglePDF(
  title: string = 'Project_Documentation',
  textToPrint?: string,
  meta?: StructuredDocData
) {
  const safeText =
    textToPrint && textToPrint.trim().length > 0
      ? textToPrint
      : `1. User Stories & Scope Synthesis
ID\tUser Story Narrative & Functional Scope\tAcceptance Criteria\tTarget Milestone\tPriority
US-01\tAs an enforcement operator, I want automated helmet detection across traffic video frames so non-compliant riders are flagged with photographic evidence.\tModel validates bare-head detection with >= 94% precision across standard and adverse lighting.\tM-01: Dataset Signoff\tCritical
US-02\tAs a system auditor, I want number-plate OCR text and cropped image evidence stored idempotently with unique trace IDs.\tNumber-plate characters digitized with >= 90% accuracy; repeated retries create zero duplicate records.\tM-04: Evidence Vault\tCritical
US-03\tAs an operations supervisor, I want low-confidence detections (< 0.85) routed to manual review to prevent false-positive violation penalties.\tAmbiguous plate crops and partial helmet occlusions enter operator queue within 2 seconds.\tM-05: Review Queue\tHigh
US-04\tAs an API developer, I want versioned request/response contracts so client integrations and test automation proceed without breaking changes.\tVersioned OpenAPI schema frozen with signed-off request/response payloads and mock server.\tM-03: API Freezing\tCritical

2. Risk Register & Delivery Forecasting
ID\tRisk Category\tRisk Title\tProbability\tImpact\tSeverity\tMitigation Strategy\tOwner
RSK-01\tTechnical\tAdverse Environmental Lighting & Weather Generalization Gap\t75%\t85%\tCritical\tAdd synthetic glare, rain augmentation, and expand night validation dataset.\tML Lead
RSK-02\tTechnical\tInference Latency Exceeding Target on Edge Hardware\t60%\t75%\tHigh\tBenchmark TensorRT INT8 quantization and asynchronous frame batching.\tML Lead + DevOps
RSK-03\tSchedule\tInference API Contract Freezing Delays\t50%\t70%\tHigh\tFreeze versioned OpenAPI spec and deploy mock provider for client integration.\tBackend Lead
RSK-04\tData Integrity\tDuplicate Evidence Records Generated on Retries\t45%\t65%\tHigh\tImplement idempotency keys and unique compound database constraints.\tBackend Engineer
RSK-05\tCompliance\tEvidence Retention Policy Governance Approval Delays\t40%\t80%\tHigh\tEngage Data Protection Officer and Product Owner for legal policy signoff.\tProduct Owner + Security

3. Action Items Register
ID\tAction Deliverable\tAssigned Team\tTarget Deadline\tPriority\tStatus
A-01\tAdd adverse-condition samples to validation dataset\tML Lead\t2026-10-12\tCritical\tIn Progress
A-02\tBenchmark OCR on blur, skew, low-light, and small-plate scenarios\tOCR Engineer\t2026-10-15\tCritical\tPending
A-03\tPublish versioned inference API contract and sample payloads\tBackend Lead\t2026-10-10\tHigh\tPending
A-04\tDocument rider/helmet/vehicle association rules\tML Lead\t2026-10-11\tHigh\tIn Progress
A-05\tApprove evidence retention and access-control policy\tProduct Owner + Security\t2026-10-18\tHigh\tPending`;

  // Use landscape A4 (297mm width x 210mm height) so multi-column tabular registers
  // like Risk Register (8 columns) and User Stories fit cleanly without cramped line wrapping.
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;
  const maxLineWidth = pageWidth - margin * 2; // 269mm
  let cursorY = 16;

  // Header Banner
  const drawPageHeader = (pageNumber: number) => {
    doc.setFillColor(11, 15, 25); // Slate 950
    doc.rect(0, 0, pageWidth, 22, 'F');

    // Accent line
    doc.setFillColor(45, 212, 191); // Teal 400
    doc.rect(0, 21.5, pageWidth, 0.7, 'F');

    // Title & Badge
    doc.setTextColor(45, 212, 191);
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.text('AI PROJECT INTELLIGENCE & RISK ADVISOR', margin, 10);

    doc.setTextColor(226, 232, 240); // Slate 200
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    const dateStr = meta?.generatedDate || new Date().toLocaleString();
    doc.text(
      `Master Project Specification Dossier | User Stories • Risk Register • Action Items | Generated: ${dateStr}`,
      margin,
      17
    );

    // Right-aligned status pill
    doc.setFillColor(20, 184, 166, 0.15);
    doc.roundedRect(pageWidth - margin - 50, 6, 50, 10, 2, 2, 'F');
    doc.setTextColor(45, 212, 191);
    doc.setFontSize(7.5);
    doc.setFont('Helvetica', 'bold');
    doc.text('OFFICIAL SPECIFICATION', pageWidth - margin - 47, 12.5);
  };

  const drawPageFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFont('Helvetica', 'normal');
    doc.text('Project Intelligence Multi-Agent RAG Engine • Confidential & Traceable Documentation', margin, pageHeight - 6);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 6);
  };

  drawPageHeader(1);
  cursorY = 28;

  // Quick Executive Summary Block on first page
  doc.setFillColor(248, 250, 252); // Soft slate background
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cursorY, maxLineWidth, 13, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('PROJECT ARTIFACT AUDIT SUMMARY', margin + 4, cursorY + 5);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    'This dossier represents the consolidated output synthesized by the Documentation Generation Agent from uploaded project artifacts. Contains complete User Stories, Enterprise Risk Register with 5x5 impact scoring, and prioritized Action Items.',
    margin + 4,
    cursorY + 9.5
  );

  cursorY += 18;

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin - 12) {
      doc.addPage();
      drawPageHeader(doc.getNumberOfPages());
      cursorY = 28;
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
    const isSectionHeading =
      line.startsWith('1. User Stories') ||
      line.startsWith('2. Risk Register') ||
      line.startsWith('3. Action Items') ||
      line.includes('USER STORIES') ||
      line.includes('RISK REGISTER') ||
      line.includes('ACTION ITEMS') ||
      line.includes('Documentation Generation') ||
      /^[0-9]+\.\s+[A-Z]/.test(line);

    if (isSectionHeading && !rawLine.includes('\t') && (!line.startsWith('|') || !line.endsWith('|'))) {
      currentSection = line;
      checkPageBreak(24);
      cursorY += 3;

      // Section Header with Accent mark
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.roundedRect(margin, cursorY, maxLineWidth, 9, 2, 2, 'F');

      // Left Accent mark
      doc.setFillColor(45, 212, 191);
      doc.rect(margin, cursorY, 3, 9, 'F');

      doc.setTextColor(241, 245, 249);
      doc.setFontSize(9.5);
      doc.setFont('Helvetica', 'bold');
      const cleanTitle = line.replace(/^[#*_\s]+/, '').replace(/[*_]+$/, '').replace(/━/g, '').trim();
      doc.text(cleanTitle, margin + 6, cursorY + 6);

      cursorY += 13;
      continue;
    }

    // Table Rows (Tab-delimited or pipe-delimited)
    if (rawLine.includes('\t') || (rawLine.includes('|') && rawLine.split('|').length >= 3)) {
      const isPipe = !rawLine.includes('\t') && rawLine.includes('|');
      const cells = isPipe
        ? rawLine.split('|').map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        : rawLine.split('\t').map((c) => (c ?? '').trim());

      // Skip separator rows like |---|---|
      if (cells.length === 0 || cells.every((c) => /^[-:\s]+$/.test(c))) {
        continue;
      }

      const isHeader =
        (cells[0] ?? '').toLowerCase() === 'id' ||
        (cells[0] ?? '').toLowerCase() === 'status' ||
        cells.some((c) =>
          [
            'User Story',
            'Risk',
            'Action',
            'Probability',
            'Impact',
            'Mitigation Strategy',
            'Assigned Team',
            'User Story Narrative & Functional Scope',
            'Risk Title',
            'Action Deliverable',
          ].includes(c)
        );

      // Tailored Column Width Allocations for Landscape (269mm total)
      let colWidths: number[] = [];
      const sectionLower = currentSection.toLowerCase();

      if (sectionLower.includes('user stor') || cells.length === 5) {
        // [ID, Narrative & Functional Scope, Acceptance Criteria, Target Milestone, Priority]
        // 269mm = 20 + 95 + 90 + 38 + 26
        colWidths = [20, 95, 90, 38, 26];
      } else if (sectionLower.includes('risk') || cells.length === 8) {
        // [ID, Category, Risk Title, Probability, Impact, Severity, Mitigation Strategy, Owner]
        // 269mm = 20 + 26 + 62 + 20 + 18 + 22 + 75 + 26
        colWidths = [20, 26, 62, 20, 18, 22, 75, 26];
      } else if (sectionLower.includes('action') || cells.length === 6) {
        // [ID, Action Deliverable, Assigned Team, Target Deadline, Priority, Status]
        // 269mm = 20 + 105 + 40 + 32 + 36 + 36
        colWidths = [20, 105, 40, 32, 36, 36];
      } else {
        // Fallback proportional split
        const w = maxLineWidth / Math.max(cells.length, 1);
        colWidths = cells.map(() => w);
      }

      // Prepare wrapped text
      doc.setFontSize(8);
      doc.setFont('Helvetica', isHeader ? 'bold' : 'normal');

      const wrappedCells = cells.map((cellText, idx) => {
        const width = colWidths[idx] ? colWidths[idx] - 3.5 : 25;
        const clean = (cellText ?? '').replace(/[^\x20-\x7E\t\n\r—]/g, '');
        return doc.splitTextToSize(clean, width);
      });

      const maxLines = Math.max(...wrappedCells.map((w) => (Array.isArray(w) ? w.length : 1)), 1);
      const rowHeight = Math.max(maxLines * 4.2 + (isHeader ? 3 : 2.5), 7);

      checkPageBreak(rowHeight + 2);

      // Row background
      if (isHeader) {
        doc.setFillColor(30, 41, 59); // Slate 800
        doc.rect(margin, cursorY, maxLineWidth, rowHeight, 'F');
        doc.setDrawColor(51, 65, 85);
        doc.rect(margin, cursorY, maxLineWidth, rowHeight, 'S');
      } else {
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252); // Slate 50
          doc.rect(margin, cursorY, maxLineWidth, rowHeight, 'F');
        } else {
          doc.setFillColor(255, 255, 255);
          doc.rect(margin, cursorY, maxLineWidth, rowHeight, 'F');
        }
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, cursorY + rowHeight, margin + maxLineWidth, cursorY + rowHeight);
      }

      // Render cell text
      let colX = margin;
      cells.forEach((cellRaw, idx) => {
        const w = colWidths[idx] || 25;
        const cellLines = wrappedCells[idx] || '';
        const trimmed = (cellRaw || '').trim();
        const lower = trimmed.toLowerCase();

        if (isHeader) {
          doc.setTextColor(45, 212, 191); // Teal 400
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(7.5);
        } else {
          doc.setFontSize(8);
          if (idx === 0) {
            doc.setTextColor(15, 23, 42); // Primary dark
            doc.setFont('Helvetica', 'bold');
          } else {
            doc.setTextColor(51, 65, 85);
            doc.setFont('Helvetica', 'normal');
          }

          // Visual pills for Critical/High severity & status
          if (lower === 'critical' || lower === 'high') {
            doc.setTextColor(lower === 'critical' ? 225 : 217, lower === 'critical' ? 29 : 119, lower === 'critical' ? 72 : 6);
            doc.setFont('Helvetica', 'bold');
          } else if (lower === 'completed' || lower === 'in progress') {
            doc.setTextColor(13, 148, 136); // Teal 600
            doc.setFont('Helvetica', 'bold');
          }
        }

        if (cellLines && (Array.isArray(cellLines) ? cellLines.length > 0 : String(cellLines).trim().length > 0)) {
          doc.text(cellLines, colX + 2, cursorY + 4.5);
        }
        colX += w;
      });

      cursorY += rowHeight;
      continue;
    }

    // Standard narrative paragraph fallback
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    const cleanLine = (line ?? '').replace(/[^\x20-\x7E\t\n\r—]/g, '');
    const wrapped = doc.splitTextToSize(cleanLine, maxLineWidth);
    const blockHeight = (Array.isArray(wrapped) ? wrapped.length : 1) * 4;

    checkPageBreak(blockHeight);
    if (wrapped && (Array.isArray(wrapped) ? wrapped.length > 0 : String(wrapped).trim().length > 0)) {
      doc.text(wrapped, margin, cursorY);
    }
    cursorY += blockHeight + 1.5;
  }

  // Add Footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(p, totalPages);
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
