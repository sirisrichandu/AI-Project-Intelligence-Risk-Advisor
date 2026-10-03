import { ai, GEMINI_MODEL } from '../geminiClient.js';

export type AgentType = 'scope' | 'risk' | 'blocker_action' | 'health' | 'rag_retrieval';

export async function routeQuery(query: string): Promise<{ agent: AgentType; reason: string }> {
  const queryLower = query.toLowerCase();

  // Fast deterministic pattern rules first
  if (/\b(scope|objective|deliverable|requirement|constraint|milestone|feature|functional|spec)\b/i.test(queryLower)) {
    return { agent: 'scope', reason: 'Query matches project scope, objectives, or requirement specifications.' };
  }
  if (/\b(risk|threat|danger|vulnerability|severity|mitigation|impact|probability|fail|challenge)\b/i.test(queryLower)) {
    return { agent: 'risk', reason: 'Query matches risk detection, severity assessment, or mitigation strategies.' };
  }
  if (/\b(blocker|action|todo|task|pending|unresolved|owner|assigned|assignee|issue)\b/i.test(queryLower)) {
    return { agent: 'blocker_action', reason: 'Query matches blockers, pending tasks, or responsible assignees.' };
  }
  if (/\b(health|score|status|wellbeing|metric|how healthy|healthy|on track|burnup|trend)\b/i.test(queryLower)) {
    return { agent: 'health', reason: 'Query matches quantitative project health assessment or progress scoring.' };
  }
  if (/\b(deadline|due date|when|timeline|schedule|launch|release)\b/i.test(queryLower)) {
    return { agent: 'rag_retrieval', reason: 'Query requires direct RAG retrieval across project milestones and schedules.' };
  }

  // LLM routing if GEMINI_API_KEY is available
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `You are the Master Routing Agent for an enterprise AI Project Intelligence platform.
Determine which specialized agent must handle this user query:
"${query}"

Options:
1. "scope" (Scope Extraction Agent - objectives, scope, requirements, deliverables, milestones)
2. "risk" (Risk Detection Agent - risks, vulnerabilities, severities, impacts, mitigations)
3. "blocker_action" (Blocker & Action Item Agent - blockers, pending actions, owners, tasks)
4. "health" (Health Scoring Engine - health scores, metrics, overall project status)
5. "rag_retrieval" (RAG Knowledge Retrieval - general project facts, deadlines, citations)

Output JSON only in format:
{"agent": "scope"|"risk"|"blocker_action"|"health"|"rag_retrieval", "reason": "brief explanation"}`
      });

      const text = response.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (['scope', 'risk', 'blocker_action', 'health', 'rag_retrieval'].includes(parsed.agent)) {
          return { agent: parsed.agent as AgentType, reason: parsed.reason || 'AI Intent router classification' };
        }
      }
    } catch (err) {
      console.warn('Gemini router fallback:', err);
    }
  }

  return { agent: 'rag_retrieval', reason: 'Defaulting to RAG Project Knowledge retrieval' };
}
