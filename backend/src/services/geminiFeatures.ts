import { VertexAI } from '@google-cloud/vertexai';
import { getDashboardOverview } from './dashboardIntelligence';

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'sevasetu-dev',
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
});

const flashModel = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const proModel = vertexAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

export async function coordinatorCopilotQuery(input: { query: string }) {
  const dashboard = await getDashboardOverview();

  const prompt = `You are SevaSetu Coordinator Copilot.
Query: ${input.query}

Dashboard summary:
- activeTasks: ${dashboard.liveOperations.activeCount}
- stalledTasks: ${dashboard.liveOperations.stalledCount}
- topPipeline: unassigned=${dashboard.needsPipeline.unassigned.length}, assigned=${dashboard.needsPipeline.assigned.length}, inProgress=${dashboard.needsPipeline.inProgress.length}

Return JSON only:
{
  "answer": "short natural language answer",
  "recommendedFilters": {"status": "...", "category": "...", "state": "..."},
  "explanation": "why this recommendation"
}`;

  const fallback = {
    answer: `Active tasks: ${dashboard.liveOperations.activeCount}, stalled: ${dashboard.liveOperations.stalledCount}.`,
    recommendedFilters: {
      status: dashboard.liveOperations.stalledCount > 0 ? 'in_progress' : 'classified',
      category: 'health',
      state: 'all',
    },
    explanation: 'Fallback used due to model unavailability. Prioritize stalled tasks first.',
    degraded: true,
  };

  try {
    const text = await generateJsonTextWithModel(flashModel, prompt, 600);
    const parsed = safeParseJson(text);
    if (!parsed) return fallback;
    return { ...parsed, degraded: false };
  } catch {
    return fallback;
  }
}

export async function skillMatchingEmbeddingProxy(input: {
  volunteerSkills: string[];
  needDescription: string;
}) {
  const skills = tokenize(input.volunteerSkills.join(' '));
  const need = tokenize(input.needDescription);
  const overlap = [...skills].filter((token) => need.has(token)).length;
  const union = new Set([...skills, ...need]).size || 1;
  const proxyScore = overlap / union;

  return {
    semanticSimilarityScore: Number(proxyScore.toFixed(3)),
    matchedKeywords: [...skills].filter((token) => need.has(token)),
    degraded: true,
    explanation: 'Using lexical proxy until Gemini Embedding API wiring is enabled.',
  };
}

export async function generateImpactNarrative(input: {
  ngoName: string;
  periodLabel: string;
  rawActivityLogs: string;
  language: 'en' | 'hi';
}) {
  const prompt = `You are generating a donor-ready impact report for ${input.ngoName}.
Period: ${input.periodLabel}
Language: ${input.language}
Raw logs:
${input.rawActivityLogs}

Return JSON only:
{
  "title": "...",
  "narrative": "3-5 sentence concise narrative",
  "sdgHighlights": ["SDG 1", "SDG 2"],
  "keyStats": ["..."]
}`;

  const fallback = {
    title: `${input.ngoName} Impact Update (${input.periodLabel})`,
    narrative:
      input.language === 'hi'
        ? 'टीम ने निरंतर सामुदायिक सहायता देते हुए उच्च प्राथमिकता वाले मामलों का समाधान किया। प्रमुख फोकस स्वास्थ्य, पोषण और त्वरित प्रतिक्रिया पर रहा।'
        : 'The team sustained field operations with strong focus on urgent cases, especially health, nutrition, and rapid response support.',
    sdgHighlights: ['SDG 2', 'SDG 3', 'SDG 11'],
    keyStats: ['Use dashboard totals for beneficiary and response metrics.'],
    degraded: true,
  };

  try {
    const text = await generateJsonTextWithModel(proModel, prompt, 900);
    const parsed = safeParseJson(text);
    if (!parsed) return fallback;
    return { ...parsed, degraded: false };
  } catch {
    return fallback;
  }
}

export async function surgeForecastRag(input: {
  historicalSummary: string;
  weatherSignals: string;
  socialSignals: string;
}) {
  const prompt = `You are SevaSetu surge forecaster.
Historical: ${input.historicalSummary}
Weather: ${input.weatherSignals}
Social: ${input.socialSignals}

Return JSON only:
{
  "horizonDays": 14,
  "forecasts": [{"zone":"...","category":"...","demandScore":0-1,"confidence":0-1,"recommendation":"..."}]
}`;

  const fallback = {
    horizonDays: 14,
    forecasts: [
      {
        zone: 'Zone 4B',
        category: 'food_nutrition',
        demandScore: 0.72,
        confidence: 0.58,
        recommendation: 'Pre-position 20 food kits by next Wednesday.',
      },
    ],
    degraded: true,
  };

  try {
    const text = await generateJsonTextWithModel(flashModel, prompt, 900);
    const parsed = safeParseJson(text);
    if (!parsed) return fallback;
    return { ...parsed, degraded: false };
  } catch {
    return fallback;
  }
}

export async function coordinatorBurnoutDetection(input: {
  messageToneSample: string;
  usageSummary: string;
  optIn: boolean;
}) {
  if (!input.optIn) {
    return {
      burnoutRisk: 'not_applicable',
      suggestion: 'Coordinator burnout detection is opt-in only.',
      degraded: false,
    };
  }

  const signalText = `${input.messageToneSample} ${input.usageSummary}`.toLowerCase();
  const risk =
    signalText.includes('overwhelmed') || signalText.includes('exhausted') || signalText.includes('late night')
      ? 'high'
      : signalText.includes('stress') || signalText.includes('delay')
        ? 'medium'
        : 'low';

  const suggestion =
    risk === 'high'
      ? 'Redistribute high-urgency queue for next 24 hours and assign deputy coordinator.'
      : risk === 'medium'
        ? 'Schedule half-day rota support and reduce non-critical escalations.'
        : 'No immediate intervention needed.';

  return {
    burnoutRisk: risk,
    suggestion,
    degraded: true,
    explanation: 'Rule-based detector used until tone-analysis model is connected.',
  };
}

export async function crisisEscalationDraft(input: {
  zone: string;
  needsSummary: string;
  evidenceSummary: string;
}) {
  const prompt = `Draft an official escalation letter for government authorities.
Zone: ${input.zone}
Needs summary: ${input.needsSummary}
Evidence summary: ${input.evidenceSummary}

Return JSON only:
{
  "subject": "...",
  "letter": "formal concise letter",
  "recommendedAttachments": ["..."]
}`;

  const fallback = {
    subject: `Urgent Escalation Request: Clustered High-Urgency Needs in ${input.zone}`,
    letter:
      `Respected Authority,\n\nWe request urgent administrative support for ${input.zone}. ` +
      `Current field evidence indicates a concentrated rise in high-urgency needs. ${input.needsSummary} ` +
      `Evidence snapshot: ${input.evidenceSummary}.\n\nKindly support immediate response coordination.\n\nRegards,\nSevaSetu Coordinator`,
    recommendedAttachments: ['Need cluster map snapshot', 'Top incident list', 'Resource gap summary'],
    degraded: true,
  };

  try {
    const text = await generateJsonTextWithModel(proModel, prompt, 1000);
    const parsed = safeParseJson(text);
    if (!parsed) return fallback;
    return { ...parsed, degraded: false };
  } catch {
    return fallback;
  }
}

async function generateJsonTextWithModel(model: any, prompt: string, maxTokens: number) {
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generation_config: {
      temperature: 0.2,
      max_output_tokens: maxTokens,
    },
  } as any);

  return result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function safeParseJson(text: string): any | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );
}
