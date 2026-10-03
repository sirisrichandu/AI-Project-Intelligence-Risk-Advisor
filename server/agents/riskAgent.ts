import { ai, GEMINI_MODEL } from '../geminiClient.js';
import { RiskItem } from '../sampleData.js';

export async function detectProjectRisks(documentsText: string): Promise<RiskItem[]> {
  const trimmed = (documentsText || '').trim();
  if (!trimmed) {
    return [];
  }

  // 1. Try AI-powered Risk Detection via Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `You are the Risk Detection & Forecasting Agent for an enterprise AI Project Intelligence platform.
Scan the provided project documents and extract all real technical, schedule, resource, dependency, requirement, budget, and quality risks that are EXPLICITLY mentioned or directly implied in the user's document.

CRITICAL INSTRUCTIONS:
- Only extract risks directly grounded in the provided document text.
- Do NOT hallucinate fictional healthcare clearinghouses, external medical leaves, or unrelated software platforms.
- If the document contains no risks, return an empty "risks" array: { "risks": [] }.

Return a strictly valid JSON object matching this schema:
{
  "risks": [
    {
      "id": "RSK-01",
      "title": "Clear concise risk title derived from document",
      "category": "Technical" | "Schedule" | "Resource" | "Dependency" | "Requirement" | "Budget" | "Quality" | "Deployment",
      "severity": "Critical" | "High" | "Moderate" | "Low",
      "probability": number between 10 and 95,
      "impact": number between 10 and 95,
      "description": "Detailed description of the risk based on the document",
      "evidence": "Direct quote from the uploaded documents citing the source",
      "mitigation": "Actionable, concrete mitigation strategy tailored to this risk",
      "status": "Open" | "Mitigating" | "Resolved"
    }
  ]
}

Document Content:
${trimmed.slice(0, 20000)}`
      });

      const text = response.text || '';
      const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.risks && Array.isArray(parsed.risks)) {
          return parsed.risks;
        }
      }
    } catch (err) {
      console.warn('Gemini risk detection error, executing local document text extraction:', err);
    }
  }

  // 2. Dynamic Heuristic Extraction directly from the User's Real Document
  return extractRisksFromDocumentText(trimmed);
}

// Fallback: Extracts risks strictly from the user's actual document sentences
function extractRisksFromDocumentText(text: string): RiskItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 15);
  const riskKeywords = [
    'risk', 'delay', 'delayed', 'fail', 'failure', 'blocker', 'issue', 'critical',
    'bug', 'vulnerability', 'bottleneck', 'threat', 'warning', 'concern', 'pending',
    'breach', 'overdue', 'behind schedule', 'dependency', 'shortage'
  ];

  const candidateSentences: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (riskKeywords.some((kw) => lower.includes(kw))) {
      // Avoid headers
      if (!lower.startsWith('=== document') && !lower.startsWith('#') && candidateSentences.length < 8) {
        candidateSentences.push(line);
      }
    }
  }

  if (candidateSentences.length === 0) {
    return [];
  }

  return candidateSentences.map((sentence, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const lower = sentence.toLowerCase();

    let category: RiskItem['category'] = 'Technical';
    if (lower.includes('schedule') || lower.includes('delay') || lower.includes('timeline')) category = 'Schedule';
    else if (lower.includes('personnel') || lower.includes('team') || lower.includes('staff') || lower.includes('leave')) category = 'Resource';
    else if (lower.includes('vendor') || lower.includes('third-party') || lower.includes('api') || lower.includes('integration')) category = 'Dependency';
    else if (lower.includes('budget') || lower.includes('cost') || lower.includes('$')) category = 'Budget';
    else if (lower.includes('quality') || lower.includes('bug') || lower.includes('test')) category = 'Quality';

    let severity: RiskItem['severity'] = 'Moderate';
    if (lower.includes('critical') || lower.includes('blocker') || lower.includes('crash') || lower.includes('urgent')) severity = 'Critical';
    else if (lower.includes('high') || lower.includes('fail') || lower.includes('severe')) severity = 'High';

    // Title from first 6-8 words
    const words = sentence.replace(/^[-*•\d.]+\s*/, '').split(/\s+/);
    const title = words.slice(0, 8).join(' ');

    // Calculate differentiated probability & impact based on severity and risk index
    const riskIndex = parseInt(num, 10) || (idx + 1);
    const pVar = ((riskIndex * 7) % 15) - 7;
    const iVar = ((riskIndex * 11) % 17) - 8;
    const baseP = severity === 'Critical' ? 88 : severity === 'High' ? 72 : severity === 'Moderate' ? 52 : 32;
    const baseI = severity === 'Critical' ? 90 : severity === 'High' ? 76 : severity === 'Moderate' ? 54 : 35;

    return {
      id: `RSK-${num}`,
      title: title.length > 55 ? `${title.slice(0, 52)}...` : title,
      category,
      severity,
      probability: Math.max(10, Math.min(95, baseP + pVar)),
      impact: Math.max(10, Math.min(95, baseI + iVar)),
      description: sentence,
      evidence: `From uploaded document: "${sentence.slice(0, 140)}"`,
      mitigation: `Assign dedicated task force to review and resolve "${title}". Implement continuous tracking and contingency plan.`,
      status: 'Open'
    };
  });
}
