/**
 * Need Classification Service
 * PRD: 5.1.6 Need Classification Engine
 * 
 * Uses Gemini Pro to classify need reports into categories and urgency levels.
 * Supports 8 Indian languages as specified in PRD 5.1.1
 */

import { NeedCategory, UrgencyLevel, GeminiExtraction } from '../models/NeedReport';
import { buildFallbackMeta, geminiSchema, generateStructuredJson } from './geminiClient';

const CLASSIFICATION_SCHEMA = geminiSchema.object(
  {
    category: geminiSchema.enum(Object.values(NeedCategory), 'Best-fit need category'),
    subCategory: geminiSchema.string('Specific sub-category', true),
    severity: geminiSchema.enum(Object.values(UrgencyLevel), 'Best-fit urgency level'),
    estimatedCount: geminiSchema.integer('Estimated affected people count', true),
    description: geminiSchema.string('Brief English summary of the need'),
    keywords: geminiSchema.array(geminiSchema.string('Keyword'), 'Key supporting keywords'),
    confidence: geminiSchema.number('Classification confidence from 0 to 1'),
    language: geminiSchema.string('Detected language code'),
  },
  ['category', 'severity', 'description', 'keywords', 'confidence', 'language']
);

function buildClassificationPrompt(text: string): string {
  return [
    'Classify this community need report for an NGO response platform in India.',
    'Use only the allowed enum values from the schema.',
    'Allowed category values: emergency, food_nutrition, health, education, water_sanitation, shelter, women_child, environment.',
    'Allowed severity values: critical, high, medium, low.',
    'description must be a brief English summary.',
    'language must be the detected language code.',
    'Report text:',
    text,
  ].join('\n');
}

export async function classifyNeedReport(
  text: string,
  language: string = 'en'
): Promise<GeminiExtraction> {
  try {
    const { data, meta } = await generateStructuredJson<Record<string, unknown>>(buildClassificationPrompt(text), {
      task: 'need classification',
      model: 'flash',
      temperature: 0.1,
      maxOutputTokens: 400,
      schema: CLASSIFICATION_SCHEMA,
    });

    const classification: GeminiExtraction = {
      category: validateCategory(String(data.category || '')),
      subCategory: typeof data.subCategory === 'string' ? data.subCategory : undefined,
      severity: validateUrgency(String(data.severity || '')),
      estimatedCount: typeof data.estimatedCount === 'number' ? data.estimatedCount : undefined,
      description: typeof data.description === 'string' ? data.description : text.substring(0, 200),
      keywords: Array.isArray(data.keywords) ? data.keywords.filter((item): item is string => typeof item === 'string') : [],
      confidence: Math.min(1, Math.max(0, Number(data.confidence || 0.8))),
      language: typeof data.language === 'string' ? data.language : language,
      rawTranscript: text,
      provider: meta.provider,
      model: meta.model,
      degraded: meta.degraded,
    };

    return classification;
  } catch (error) {
    console.error('Classification error:', error);
    return buildFallbackClassification(text, language, error);
  }
}

// Classify voice transcript with additional context
export async function classifyVoiceTranscript(
  transcript: string,
  language: string = 'hi'
): Promise<GeminiExtraction> {
  // Add voice-specific context
  const enhancedPrompt = `This is a voice transcription from a field worker reporting a community need. 
The speaker may use colloquial language or incomplete sentences. 
Extract the key information even if the text is informal.

Transcript: ${transcript}`;

  return classifyNeedReport(enhancedPrompt, language);
}

// Validate category against known values
function validateCategory(category: string): string {
  const validCategories = Object.values(NeedCategory);
  const normalized = category?.toLowerCase().replace(/[^a-z_]/g, '');
  
  if (validCategories.includes(normalized as any)) {
    return normalized;
  }
  
  // Try to match partial
  const match = validCategories.find(c => 
    c.includes(normalized) || normalized.includes(c)
  );
  
  return match || NeedCategory.HEALTH;
}

// Validate urgency against known values
function validateUrgency(urgency: string): string {
  const validUrgencies = Object.values(UrgencyLevel);
  const normalized = urgency?.toLowerCase().replace(/[^a-z]/g, '');
  
  if (validUrgencies.includes(normalized as any)) {
    return normalized;
  }
  
  return UrgencyLevel.MEDIUM;
}

// Mock classification for development without Vertex AI
export async function mockClassifyNeedReport(
  text: string,
  language: string = 'en'
): Promise<GeminiExtraction> {
  // Simple keyword-based classification for testing
  const textLower = text.toLowerCase();
  
  let category: string = NeedCategory.HEALTH;
  let urgency: string = UrgencyLevel.MEDIUM;
  
  if (textLower.includes('emergency') || textLower.includes('आपातकाल') || textLower.includes('accident')) {
    category = NeedCategory.EMERGENCY;
    urgency = UrgencyLevel.CRITICAL;
  } else if (textLower.includes('food') || textLower.includes('भोजन') || textLower.includes('hunger')) {
    category = NeedCategory.FOOD_NUTRITION;
    urgency = UrgencyLevel.HIGH;
  } else if (textLower.includes('water') || textLower.includes('पानी')) {
    category = NeedCategory.WATER_SANITATION;
    urgency = UrgencyLevel.HIGH;
  } else if (textLower.includes('shelter') || textLower.includes('आश्रय') || textLower.includes('homeless')) {
    category = NeedCategory.SHELTER;
    urgency = UrgencyLevel.HIGH;
  } else if (textLower.includes('school') || textLower.includes('education') || textLower.includes('शिक्षा')) {
    category = NeedCategory.EDUCATION;
    urgency = UrgencyLevel.MEDIUM;
  }

  return {
    category,
    severity: urgency,
    description: text.substring(0, 200),
    estimatedCount: Math.floor(Math.random() * 20) + 1,
    confidence: 0.75,
    language,
    rawTranscript: text,
    provider: 'fallback',
    model: 'heuristic-fallback',
    degraded: true,
    warning: 'Voice classification used local fallback heuristic output.',
  };
}

function buildFallbackClassification(text: string, language: string, error?: unknown): GeminiExtraction {
  const meta = buildFallbackMeta('need classification', error, 'flash');
  return {
    category: NeedCategory.HEALTH,
    severity: UrgencyLevel.MEDIUM,
    description: text.substring(0, 200),
    confidence: 0.3,
    language,
    rawTranscript: text,
    provider: meta.provider,
    model: meta.model,
    degraded: meta.degraded,
    warning: meta.warning,
  };
}
