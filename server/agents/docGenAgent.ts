import { ai, GEMINI_MODEL } from '../geminiClient.js';
import { ProjectScopeData, RiskItem, BlockerItem, ActionItem, HealthBreakdown } from '../sampleData.js';

export async function generateDocumentReport(
  type: 'user_stories' | 'risk_register' | 'executive_summary' | 'blocker_action' | 'project_report' | 'complete_intelligence',
  scope: ProjectScopeData,
  risks: RiskItem[],
  blockers: BlockerItem[],
  actions: ActionItem[],
  health: HealthBreakdown
): Promise<{ title: string; format: 'MARKDOWN' | 'PDF' | 'JSON'; content: string }> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `You are the Documentation Generation Agent for an enterprise AI Project Intelligence platform.
Generate a structured, professional ${type.replace(/_/g, ' ').toUpperCase()} in clean Markdown format based on this project intelligence:

Project Scope Summary: ${scope.summary || scope.scope}
Project Objectives: ${JSON.stringify(scope.objectives || [])}
Identified Risks: ${JSON.stringify(risks.map(r => ({ id: r.id, title: r.title, severity: r.severity, mitigation: r.mitigation })))}
Active Blockers: ${JSON.stringify(blockers.map(b => ({ id: b.id, title: b.title, impact: b.impact, priority: b.priority })))}
Action Items: ${JSON.stringify(actions.map(a => ({ id: a.id, task: a.task, owner: a.owner, priority: a.priority })))}
Health Score: ${health.overall}/100 (${health.status})

CRITICAL INSTRUCTIONS:
- Ground all facts strictly in the provided project data.
- If there are zero risks or blockers provided, clearly state that no active risks/blockers were identified in the ingested documents.
- Do not output meta-commentary, return only clean formatted Markdown.`
      });

      if (response.text) {
        let title = "Project Intelligence Report";
        if (type === 'user_stories') title = "Synthesized Agile User Stories & Acceptance Criteria";
        else if (type === 'risk_register') title = "Enterprise Formal Risk Register & Mitigation Matrix";
        else if (type === 'executive_summary') title = "Executive Project Intelligence & Health Briefing";
        else if (type === 'blocker_action') title = "Active Blockers & Assigned Action Item Register";
        else title = "Comprehensive Project Intelligence Audit Report";

        return {
          title,
          format: 'MARKDOWN',
          content: response.text
        };
      }
    } catch (err) {
      console.warn('Gemini doc generation error, formatting dynamic template:', err);
    }
  }

  // Dynamic document compilation based strictly on actual project state
  if (type === 'user_stories') {
    const userStories = (scope.objectives.length > 0 ? scope.objectives : ['Deliver project scope and core functionality']).map((obj, i) => {
      const idNum = String(i + 1).padStart(2, '0');
      return `#### US-${idNum}: ${obj}
- **As a** Project Stakeholder,
- **I want** to achieve: ${obj},
- **So that** project milestones and deliverables are verified and accepted.

**Acceptance Criteria:**
1. Acceptance criteria defined in project documentation must be validated with automated tests.
2. Deliverable must pass security, performance, and stakeholder review.`;
    }).join('\n\n---\n\n');

    return {
      title: "Synthesized Agile User Stories & Acceptance Criteria",
      format: "MARKDOWN",
      content: `# Synthesized Agile User Stories & Acceptance Criteria
**Generated Date:** ${currentDate}  
**Scope Reference:** ${scope.scope || 'Uploaded Project Documentation'}

---

${userStories}`
    };
  }

  if (type === 'risk_register') {
    const riskRows = risks.length > 0
      ? risks.map(r => `| **${r.id}** | ${r.category} | ${r.title} | **${r.severity.toUpperCase()}** | ${r.probability}% | ${r.impact}% | ${r.mitigation} | ${r.status} |`).join('\n')
      : '| — | — | No risks identified in current documents | — | — | — | Continuous monitoring active | Healthy |';

    return {
      title: "Enterprise Formal Risk Register & Mitigation Matrix",
      format: "MARKDOWN",
      content: `# Enterprise Project Risk Register & Mitigation Plan
**Audit Date:** ${currentDate}  
**Identified Risks:** ${risks.length}  
**Project Health Rating:** ${health.overall}/100 (${health.status})

---

| Risk ID | Category | Risk Description | Severity | Prob (%) | Imp (%) | Assigned Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${riskRows}`
    };
  }

  // Complete Unified Master Project Intelligence Dossier
  const riskRows = risks.length > 0
    ? risks.map(r => `| **${r.id}** | ${r.category} | ${r.title} | **${r.severity.toUpperCase()}** | ${r.probability}% | ${r.impact}% | ${r.mitigation} | ${r.status} |`).join('\n')
    : '| — | — | No risks detected in current documents | — | — | — | Active monitoring | Healthy |';

  const blockerRows = blockers.length > 0
    ? blockers.map(b => `| **${b.id}** | ${b.title} | **${b.priority.toUpperCase()}** | ${b.impact} | ${b.suggestedResolution} | ${b.status} |`).join('\n')
    : '| — | No active blockers | — | All streams operational | Continue execution | Resolved |';

  const actionRows = actions.length > 0
    ? actions.map(a => `| **${a.id}** | ${a.task} | ${a.owner} | ${a.priority} | ${a.deadline} | ${a.status} |`).join('\n')
    : '| — | Review latest project status | Project Lead | High | Upcoming | Pending |';

  return {
    title: "Master Project Intelligence & Risk Dossier",
    format: "MARKDOWN",
    content: `# Master Project Intelligence & Risk Dossier
**Assessment Date:** ${currentDate}  
**Project Health Rating:** **${health.overall} / 100 — ${health.status.toUpperCase()}**

---

### 1. Executive Intelligence Briefing
${scope.summary || scope.scope || 'Project intelligence compiled from uploaded documentation.'}

---

### 2. Project Health Score Breakdown
- **Overall Composite Health Score:** **${health.overall} / 100** (${health.status})
- **Summary:** ${health.summary}

---

### 3. Scope & Strategic Objectives
${scope.objectives.length > 0 ? scope.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n') : '- Objectives defined in uploaded documents.'}

---

### 4. Enterprise Risk Register
| Risk ID | Category | Risk Description | Severity | Prob (%) | Imp (%) | Assigned Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${riskRows}

---

### 5. Active Blockers
| Blocker ID | Description | Priority | Impact | Resolution Strategy | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
${blockerRows}

---

### 6. Assigned Action Items
| Action ID | Task Description | Owner | Priority | Target Date | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
${actionRows}`
  };
}
