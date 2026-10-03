import { RiskItem, BlockerItem, ActionItem, HealthBreakdown, TaskAtRisk } from '../sampleData.js';
import { ai, GEMINI_MODEL } from '../geminiClient.js';

export function computeHealthScore(
  risks: RiskItem[],
  blockers: BlockerItem[],
  actions: ActionItem[],
  previousHistory: HealthBreakdown['history']
): HealthBreakdown {
  // 1. Risk Score (30% weight): Base 100 minus deductions for critical/high/moderate risks
  let riskDeduction = 0;
  risks.forEach((r) => {
    if (r.status !== 'Resolved') {
      if (r.severity === 'Critical') riskDeduction += 14;
      else if (r.severity === 'High') riskDeduction += 8;
      else if (r.severity === 'Moderate') riskDeduction += 4;
      else riskDeduction += 2;
    }
  });
  const riskScore = Math.max(20, Math.min(100, 100 - riskDeduction));

  // 2. Schedule Score (20% weight): Overdue actions and upcoming critical deadlines
  const overdueActions = actions.filter((a) => a.status === 'Overdue').length;
  let scheduleDeduction = overdueActions * 15 + (risks.some((r) => r.category === 'Schedule' && r.severity === 'Critical') ? 12 : 4);
  const scheduleScore = Math.max(30, Math.min(100, 100 - scheduleDeduction));

  // 3. Scope Score (20% weight): Requirement clarity vs scope creep disputes
  const scopeCreepCount = risks.filter((r) => r.category === 'Requirement').length;
  const scopeScore = Math.max(40, Math.min(100, 95 - scopeCreepCount * 10));

  // 4. Blocker Score (15% weight): Active blockers penalty
  const activeBlockers = blockers.filter((b) => b.status === 'Active');
  let blockerPenalty = 0;
  activeBlockers.forEach((b) => {
    if (b.priority === 'Critical') blockerPenalty += 18;
    else if (b.priority === 'High') blockerPenalty += 10;
    else blockerPenalty += 5;
  });
  const blockerScore = Math.max(15, Math.min(100, 100 - blockerPenalty));

  // 5. Resource Score (15% weight): Resource constraints & leaves
  const resourceRisks = risks.filter((r) => r.category === 'Resource' && r.status !== 'Resolved').length;
  const resourceScore = Math.max(30, Math.min(100, 95 - resourceRisks * 15));

  // Weighted calculation
  const weightedOverall = Math.round(
    riskScore * 0.3 +
    scheduleScore * 0.2 +
    scopeScore * 0.2 +
    blockerScore * 0.15 +
    resourceScore * 0.15
  );

  const overall = Math.max(0, Math.min(100, weightedOverall));

  let status: HealthBreakdown['status'] = 'Healthy';
  if (overall >= 75) status = 'Healthy';
  else if (overall >= 60) status = 'At Risk';
  else if (overall >= 40) status = 'Critical';
  else status = 'Severe';

  const lastScore = previousHistory.length > 0 ? previousHistory[previousHistory.length - 1].score : overall;
  let trend: HealthBreakdown['trend'] = 'Stable';
  if (overall > lastScore + 1) trend = 'Improving';
  else if (overall < lastScore - 1) trend = 'Declining';

  const todayStr = new Date().toISOString().slice(0, 10);
  const updatedHistory = [...previousHistory];
  if (!updatedHistory.some((h) => h.date === todayStr)) {
    updatedHistory.push({
      date: todayStr,
      score: overall,
      note: `Health evaluation: ${status} with ${activeBlockers.length} active blockers`
    });
  }

  let summary = `Project Health evaluated at ${overall}/100 (${status}). `;
  if (activeBlockers.length > 0) {
    summary += `${activeBlockers.length} active blocker(s) requiring attention: ${activeBlockers[0].title}. `;
  } else {
    summary += `Zero critical blockers detected. `;
  }
  if (risks.length > 0) {
    summary += `${risks.length} project risk(s) currently being monitored.`;
  } else {
    summary += `All project workstreams are operating smoothly.`;
  }

  return {
    overall,
    status,
    metrics: {
      riskScore,
      scheduleScore,
      scopeScore,
      blockerScore,
      resourceScore,
    },
    summary,
    trend,
    history: updatedHistory,
  };
}

export async function detectTasksAtRisk(tasksContent: string, risks: RiskItem[]): Promise<TaskAtRisk[]> {
  const trimmed = (tasksContent || '').trim();
  if (!trimmed) {
    return [];
  }

  // 1. Try Gemini AI extraction grounded in user's documents
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `You are the Task Risk Correlation Agent.
Analyze the following project document text and the list of detected risks.
Identify specific tasks, backlog items, or deliverables mentioned in the document that are directly at risk, delayed, blocked, or threatened.

CRITICAL INSTRUCTIONS:
- Extract ONLY tasks, modules, and work packages that are EXPLICITLY mentioned in the user's provided document.
- Do NOT hallucinate tasks (such as Clinical Report Generation PDF Module HP-108, Disaster Recovery Backup Drill HP-110, or Sarah Jenkins) unless they exist in the provided text.
- If no specific tasks at risk are found in the documents, return an empty array: { "tasksAtRisk": [] }.

Detected Risks:
${JSON.stringify(risks.map(r => ({ id: r.id, title: r.title, severity: r.severity, description: r.description })))}

Document Text:
${trimmed.slice(0, 18000)}

Return JSON matching this schema:
{
  "tasksAtRisk": [
    {
      "id": "TSK-01",
      "name": "Task name or deliverable title from document",
      "owner": "Assignee/Team from document (or 'Project Team')",
      "dueDate": "Target date or 'Upcoming'",
      "severity": "Critical" | "High" | "Moderate" | "Low",
      "riskReason": "Why this specific task is at risk based on the document text",
      "milestone": "Associated milestone or sprint from document"
    }
  ]
}`
      });

      const text = response.text || '';
      const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.tasksAtRisk && Array.isArray(parsed.tasksAtRisk)) {
          return parsed.tasksAtRisk;
        }
      }
    } catch (err) {
      console.warn('Gemini task risk detection error, falling back to local text parser:', err);
    }
  }

  // 2. Local Document Text Extraction
  return extractTasksAtRiskFromText(trimmed, risks);
}

function extractTasksAtRiskFromText(text: string, risks: RiskItem[]): TaskAtRisk[] {
  // If there are no risks, there are no tasks at risk
  if (risks.length === 0) {
    return [];
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 15);
  const taskKeywords = ['task', 'milestone', 'feature', 'module', 'ticket', 'jira', 'story', 'sprint', 'phase'];
  const delayKeywords = ['delay', 'delayed', 'blocked', 'behind', 'failing', 'pending', 'risk', 'hold'];

  const found: TaskAtRisk[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('=== document') || lower.startsWith('#')) continue;

    if (taskKeywords.some((tk) => lower.includes(tk)) && delayKeywords.some((dk) => lower.includes(dk))) {
      const idNum = String(found.length + 1).padStart(2, '0');
      const cleanLine = line.replace(/^[-*•\d.]+\s*/, '');
      const words = cleanLine.split(/\s+/);
      const name = words.slice(0, 6).join(' ');

      found.push({
        id: `TSK-${idNum}`,
        name: name.length > 40 ? `${name.slice(0, 37)}...` : name,
        owner: 'Project Team',
        dueDate: 'Upcoming',
        severity: lower.includes('critical') || lower.includes('block') ? 'Critical' : 'High',
        riskReason: cleanLine,
        milestone: 'Active Phase'
      });

      if (found.length >= 4) break;
    }
  }

  // If no specific lines matched, link to the detected risks
  if (found.length === 0 && risks.length > 0) {
    return risks.slice(0, 3).map((r, i) => ({
      id: `TSK-0${i + 1}`,
      name: r.title,
      owner: 'Project Team',
      dueDate: 'Sprint Focus',
      severity: r.severity,
      riskReason: r.description,
      milestone: 'Current Release'
    }));
  }

  return found;
}
