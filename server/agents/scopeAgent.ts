import { ai, GEMINI_MODEL } from '../geminiClient.js';
import { ProjectScopeData } from '../sampleData.js';

export async function extractProjectScope(documentsText: string): Promise<ProjectScopeData> {
  const trimmed = (documentsText || '').trim();
  if (!trimmed) {
    return {
      objectives: [],
      scope: 'No documents uploaded yet. Upload your project specifications to extract scope.',
      requirements: [],
      deliverables: [],
      milestones: [],
      deadlines: [],
      constraints: [],
      summary: 'Knowledge base is currently empty. Upload your project documents to analyze scope.'
    };
  }

  // 1. Try Gemini AI extraction
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `You are the Scope Extraction Agent for an enterprise project intelligence platform.
Analyze the following project documents and extract structured project intelligence.

CRITICAL INSTRUCTIONS:
- Ground everything strictly in the provided documents.
- Do NOT hallucinate external clinical platforms, AWS architectures, or third-party clearinghouses unless mentioned in the text.

Return a strictly valid JSON object matching this schema:
{
  "objectives": ["array of 3-6 primary project objectives extracted from the document"],
  "scope": "comprehensive summary of project boundaries, systems, and modules in this project",
  "requirements": ["array of key functional and non-functional requirements from the document"],
  "deliverables": ["array of core deliverables from the document"],
  "milestones": [
    { "name": "Milestone name", "targetDate": "Date or timeframe", "status": "Completed" | "In Progress" | "Upcoming" }
  ],
  "deadlines": [
    { "item": "Key milestone or deliverable", "date": "Date or sprint", "criticality": "High" | "Medium" | "Low" }
  ],
  "constraints": ["array of constraints mentioned in the document"],
  "summary": "1-2 paragraph executive summary of the uploaded project"
}

Document Content:
${trimmed.slice(0, 20000)}`
      });

      const text = response.text || '';
      const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.objectives && parsed.requirements && parsed.deliverables) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Gemini scope extraction error, falling back to document text parser:', err);
    }
  }

  // 2. Local Document Text Extraction
  return extractScopeFromText(trimmed);
}

function extractScopeFromText(text: string): ProjectScopeData {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 10);

  const objectives: string[] = [];
  const requirements: string[] = [];
  const deliverables: string[] = [];
  const constraints: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('=== document') || lower.startsWith('#')) continue;

    if ((lower.includes('objective') || lower.includes('goal') || lower.includes('aim')) && objectives.length < 5) {
      objectives.push(line.replace(/^[-*•\d.]+\s*/, ''));
    } else if ((lower.includes('require') || lower.includes('shall') || lower.includes('must') || lower.includes('fr-') || lower.includes('nfr-')) && requirements.length < 6) {
      requirements.push(line.replace(/^[-*•\d.]+\s*/, ''));
    } else if ((lower.includes('deliver') || lower.includes('release') || lower.includes('build') || lower.includes('feature')) && deliverables.length < 5) {
      deliverables.push(line.replace(/^[-*•\d.]+\s*/, ''));
    } else if ((lower.includes('constraint') || lower.includes('budget') || lower.includes('compliance') || lower.includes('limit')) && constraints.length < 4) {
      constraints.push(line.replace(/^[-*•\d.]+\s*/, ''));
    }
  }

  // Fallbacks if not explicitly found in text
  if (objectives.length === 0 && lines.length > 0) {
    objectives.push(lines[0]);
    if (lines[1]) objectives.push(lines[1]);
  }

  const firstFewLines = lines.slice(0, 3).join(' ');

  return {
    objectives,
    scope: firstFewLines.length > 40 ? firstFewLines : 'Project scope parsed from uploaded document text.',
    requirements: requirements.length > 0 ? requirements : ['Requirements extracted from uploaded project documentation.'],
    deliverables: deliverables.length > 0 ? deliverables : ['Deliverables defined in uploaded project documentation.'],
    milestones: [
      { name: 'Phase 1: Ingestion & Analysis', targetDate: 'Current', status: 'Completed' },
      { name: 'Phase 2: Project Execution', targetDate: 'Upcoming', status: 'In Progress' }
    ],
    deadlines: [
      { item: 'Current Sprint / Milestone', date: 'Upcoming', criticality: 'High' }
    ],
    constraints: constraints.length > 0 ? constraints : ['Standard project delivery and quality guidelines.'],
    summary: firstFewLines.length > 50 ? firstFewLines : 'Executive summary compiled from user project documentation.'
  };
}
