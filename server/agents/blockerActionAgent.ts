import { ai, GEMINI_MODEL } from '../geminiClient.js';
import { BlockerItem, ActionItem } from '../sampleData.js';

export async function extractBlockersAndActions(documentsText: string): Promise<{
  blockers: BlockerItem[];
  actions: ActionItem[];
}> {
  const trimmed = (documentsText || '').trim();
  if (!trimmed) {
    return { blockers: [], actions: [] };
  }

  // 1. Try Gemini AI extraction
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `You are the Blocker & Action Item Identification Agent for an enterprise AI Project Intelligence platform.
Examine the uploaded documents to identify all active blockers, pending tasks, action items, assignees, deadlines, and suggested resolutions.

CRITICAL INSTRUCTIONS:
- Only extract blockers and actions that are EXPLICITLY mentioned or directly referenced in the provided text.
- Do NOT hallucinate external people (e.g. Sarah Jenkins, Daniel Cruz) or fictional payment clearinghouses unless they exist in the provided text.
- If there are no blockers or action items in the documents, return empty arrays: { "blockers": [], "actions": [] }.

Return a strictly valid JSON object matching this schema:
{
  "blockers": [
    {
      "id": "BLK-01",
      "title": "Clear blocker title derived from document",
      "description": "Description of what is impeding progress based on the text",
      "impact": "Concrete impact on schedule or deliverable",
      "priority": "Critical" | "High" | "Medium" | "Low",
      "status": "Active" | "Investigating" | "Resolved",
      "suggestedResolution": "Actionable resolution steps"
    }
  ],
  "actions": [
    {
      "id": "ACT-01",
      "task": "Actionable task description from document",
      "owner": "Person name or team role from document (or 'Project Team')",
      "priority": "Critical" | "High" | "Medium" | "Low",
      "deadline": "Target date or 'Upcoming'",
      "status": "Pending" | "In Progress" | "Completed" | "Overdue"
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
        if (parsed.blockers && Array.isArray(parsed.blockers) && parsed.actions && Array.isArray(parsed.actions)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Gemini blocker/action error, falling back to document text parser:', err);
    }
  }

  // 2. Local Document Text Extraction
  return extractBlockersAndActionsFromText(trimmed);
}

function extractBlockersAndActionsFromText(text: string): { blockers: BlockerItem[]; actions: ActionItem[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 15);

  const blockerKeywords = ['blocker', 'blocked', 'stuck', 'waiting for', 'waiting on', 'impediment', 'halted', 'cannot proceed'];
  const actionKeywords = ['action', 'todo', 'to-do', 'task', 'must', 'assign', 'follow up', 'investigate', 'implement', 'deliver', 'prepare'];

  const foundBlockers: BlockerItem[] = [];
  const foundActions: ActionItem[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('=== document') || lower.startsWith('#')) continue;

    if (blockerKeywords.some((kw) => lower.includes(kw)) && foundBlockers.length < 5) {
      const idNum = String(foundBlockers.length + 1).padStart(2, '0');
      const words = line.replace(/^[-*•\d.]+\s*/, '').split(/\s+/);
      const title = words.slice(0, 8).join(' ');
      foundBlockers.push({
        id: `BLK-${idNum}`,
        title: title.length > 50 ? `${title.slice(0, 47)}...` : title,
        description: line,
        impact: 'Delays associated project milestone until unblocked.',
        priority: lower.includes('critical') || lower.includes('halt') ? 'Critical' : 'High',
        status: 'Active',
        suggestedResolution: `Prioritize resolution for "${title}" with assigned stakeholders.`
      });
    }

    if (actionKeywords.some((kw) => lower.includes(kw)) && foundActions.length < 8) {
      const idNum = String(foundActions.length + 1).padStart(2, '0');
      const cleanTask = line.replace(/^[-*•\d.]+\s*/, '');
      foundActions.push({
        id: `ACT-${idNum}`,
        task: cleanTask.length > 80 ? `${cleanTask.slice(0, 77)}...` : cleanTask,
        owner: 'Project Lead',
        priority: lower.includes('urgent') || lower.includes('critical') ? 'Critical' : 'High',
        deadline: 'Sprint Focus',
        status: 'Pending'
      });
    }
  }

  return { blockers: foundBlockers, actions: foundActions };
}
