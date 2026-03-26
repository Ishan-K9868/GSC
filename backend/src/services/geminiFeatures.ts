import { getDashboardOverview } from './dashboardIntelligence';
import { buildFallbackMeta, geminiSchema, generateStructuredJson } from './geminiClient';

const COPILOT_SCHEMA = geminiSchema.object(
  {
    answer: geminiSchema.string('Short natural language answer'),
    recommendedFilters: geminiSchema.object(
      {
        status: geminiSchema.string('Recommended status filter', true),
        category: geminiSchema.string('Recommended category filter', true),
        state: geminiSchema.string('Recommended state filter', true),
      },
      [],
      'Recommended dashboard filters'
    ),
    explanation: geminiSchema.string('Reason for the recommendation'),
  },
  ['answer', 'recommendedFilters', 'explanation']
);

const SKILL_MATCH_SCHEMA = geminiSchema.object(
  {
    semanticSimilarityScore: geminiSchema.number('Semantic similarity score from 0 to 1'),
    matchedKeywords: geminiSchema.array(geminiSchema.string('Matched skill keyword')),
    explanation: geminiSchema.string('One-sentence rationale'),
  },
  ['semanticSimilarityScore', 'matchedKeywords', 'explanation']
);

const IMPACT_REPORT_SCHEMA = geminiSchema.object(
  {
    title: geminiSchema.string('Report title'),
    narrative: geminiSchema.string('3-5 sentence concise narrative'),
    sdgHighlights: geminiSchema.array(geminiSchema.string('SDG identifier')),
    keyStats: geminiSchema.array(geminiSchema.string('Key stat line')),
  },
  ['title', 'narrative', 'sdgHighlights', 'keyStats']
);

const SURGE_FORECAST_SCHEMA = geminiSchema.object(
  {
    horizonDays: geminiSchema.integer('Forecast horizon in days'),
    forecasts: geminiSchema.array(
      geminiSchema.object(
        {
          zone: geminiSchema.string('Zone name'),
          category: geminiSchema.string('Affected category'),
          demandScore: geminiSchema.number('Demand score from 0 to 1'),
          confidence: geminiSchema.number('Confidence from 0 to 1'),
          recommendation: geminiSchema.string('Action recommendation'),
        },
        ['zone', 'category', 'demandScore', 'confidence', 'recommendation']
      )
    ),
  },
  ['horizonDays', 'forecasts']
);

const BURNOUT_SCHEMA = geminiSchema.object(
  {
    burnoutRisk: geminiSchema.enum(['low', 'medium', 'high']),
    suggestion: geminiSchema.string('Short actionable recommendation'),
    explanation: geminiSchema.string('Why this level was chosen'),
  },
  ['burnoutRisk', 'suggestion', 'explanation']
);

const ESCALATION_SCHEMA = geminiSchema.object(
  {
    subject: geminiSchema.string('Letter subject'),
    letter: geminiSchema.string('Formal concise letter'),
    recommendedAttachments: geminiSchema.array(geminiSchema.string('Attachment name')),
  },
  ['subject', 'letter', 'recommendedAttachments']
);

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
  };

  try {
    const { data, meta } = await generateStructuredJson<Record<string, unknown>>(prompt, {
      task: 'coordinator copilot',
      model: 'flash',
      maxOutputTokens: 600,
      schema: COPILOT_SCHEMA,
    });
    return { ...data, ...meta };
  } catch (error) {
    return { ...fallback, ...buildFallbackMeta('coordinator copilot', error, 'flash') };
  }
}

export async function skillMatchingEmbeddingProxy(input: {
  volunteerSkills: string[];
  needDescription: string;
}) {
  const prompt = `You are a volunteer-to-need skill matching assistant.
Volunteer skills: ${input.volunteerSkills.join(', ')}
Need description: ${input.needDescription}

Return JSON only:
{
  "semanticSimilarityScore": 0.0,
  "matchedKeywords": ["..."],
  "explanation": "one sentence rationale"
}`;

  const fallback = buildSkillMatchFallback(input.volunteerSkills, input.needDescription);

  try {
    const { data, meta } = await generateStructuredJson<Record<string, unknown>>(prompt, {
      task: 'skill matching',
      model: 'flash',
      temperature: 0.2,
      maxOutputTokens: 300,
      schema: SKILL_MATCH_SCHEMA,
    });

    return {
      semanticSimilarityScore: clampScore(data.semanticSimilarityScore),
      matchedKeywords: Array.isArray(data.matchedKeywords)
        ? data.matchedKeywords.filter((item): item is string => typeof item === 'string')
        : fallback.matchedKeywords,
      explanation: typeof data.explanation === 'string' ? data.explanation : fallback.explanation,
      ...meta,
    };
  } catch (error) {
    return { ...fallback, ...buildFallbackMeta('skill matching', error, 'flash') };
  }
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
  };

  try {
    const { data, meta } = await generateStructuredJson<Record<string, unknown>>(prompt, {
      task: 'impact narrative generation',
      model: 'pro',
      maxOutputTokens: 1600,
      schema: IMPACT_REPORT_SCHEMA,
    });
    return { ...data, ...meta };
  } catch (error) {
    return { ...fallback, ...buildFallbackMeta('impact narrative generation', error, 'pro') };
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
  };

  try {
    const { data, meta } = await generateStructuredJson<Record<string, unknown>>(prompt, {
      task: 'surge forecast',
      model: 'flash',
      maxOutputTokens: 1200,
      schema: SURGE_FORECAST_SCHEMA,
    });
    return { ...data, ...meta };
  } catch (error) {
    return { ...fallback, ...buildFallbackMeta('surge forecast', error, 'flash') };
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
      provider: 'gemini_api_key',
      model: 'not-run',
      degraded: false,
    };
  }

  const signalText = `${input.messageToneSample} ${input.usageSummary}`.toLowerCase();
  const fallback = buildBurnoutFallback(signalText);

  const prompt = `You are a wellbeing triage assistant for NGO coordinators.
Message tone sample: ${input.messageToneSample}
Usage summary: ${input.usageSummary}

Return JSON only:
{
  "burnoutRisk": "low|medium|high",
  "suggestion": "short actionable recommendation",
  "explanation": "why this level was chosen"
}`;

  try {
    const { data, meta } = await generateStructuredJson<Record<string, unknown>>(prompt, {
      task: 'burnout detection',
      model: 'flash',
      temperature: 0.2,
      maxOutputTokens: 300,
      schema: BURNOUT_SCHEMA,
    });

    return {
      burnoutRisk: validateBurnoutRisk(data.burnoutRisk),
      suggestion: typeof data.suggestion === 'string' ? data.suggestion : fallback.suggestion,
      explanation: typeof data.explanation === 'string' ? data.explanation : fallback.explanation,
      ...meta,
    };
  } catch (error) {
    return { ...fallback, ...buildFallbackMeta('burnout detection', error, 'flash') };
  }
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
  };

  try {
    const { data, meta } = await generateStructuredJson<Record<string, unknown>>(prompt, {
      task: 'crisis escalation draft',
      model: 'pro',
      maxOutputTokens: 1600,
      schema: ESCALATION_SCHEMA,
    });
    return { ...data, ...meta };
  } catch (error) {
    return { ...fallback, ...buildFallbackMeta('crisis escalation draft', error, 'pro') };
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

function buildSkillMatchFallback(volunteerSkills: string[], needDescription: string) {
  const skills = tokenize(volunteerSkills.join(' '));
  const need = tokenize(needDescription);
  const overlap = [...skills].filter((token) => need.has(token));
  const union = new Set([...skills, ...need]).size || 1;

  return {
    semanticSimilarityScore: Number((overlap.length / union).toFixed(3)),
    matchedKeywords: overlap,
    explanation: 'Lexical fallback used because Gemini matching was unavailable.',
  };
}

function clampScore(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(1, Number(numeric.toFixed(3))));
}

function buildBurnoutFallback(signalText: string) {
  const risk =
    signalText.includes('overwhelmed') || signalText.includes('exhausted') || signalText.includes('late night')
      ? 'high'
      : signalText.includes('stress') || signalText.includes('delay')
        ? 'medium'
        : 'low';

  return {
    burnoutRisk: risk,
    suggestion:
      risk === 'high'
        ? 'Redistribute high-urgency queue for next 24 hours and assign deputy coordinator.'
        : risk === 'medium'
          ? 'Schedule half-day rota support and reduce non-critical escalations.'
          : 'No immediate intervention needed.',
    explanation: 'Rule-based fallback used because Gemini burnout analysis was unavailable.',
  };
}

function validateBurnoutRisk(value: unknown): 'low' | 'medium' | 'high' {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'medium';
}
