/**
 * Vision Analysis Service
 * PRD: 5.1.2 Photo + AI Vision Intake
 * 
 * Uses Gemini Vision to analyze photos and extract need information.
 */

import { NeedCategory, UrgencyLevel } from '../models/NeedReport';
import { buildFallbackMeta, geminiSchema, generateStructuredJsonFromImage } from './geminiClient';

const VISION_SCHEMA = geminiSchema.object(
  {
    category: geminiSchema.enum(Object.values(NeedCategory), 'Best-fit need category'),
    subCategory: geminiSchema.string('Specific observation label', true),
    urgency: geminiSchema.enum(Object.values(UrgencyLevel), 'Best-fit urgency level'),
    estimatedPeopleCount: geminiSchema.integer('Estimated visible affected people', true),
    description: geminiSchema.string('Detailed description of the scene'),
    visibleDistressSignals: geminiSchema.array(geminiSchema.string('Visible distress signal')),
    locationContext: geminiSchema.string('Environmental or locality context', true),
    confidence: geminiSchema.number('Vision confidence from 0 to 1'),
    suggestedAction: geminiSchema.string('Immediate recommended response action', true),
  },
  ['category', 'urgency', 'description', 'visibleDistressSignals', 'confidence']
);

// Vision analysis prompt
const VISION_PROMPT = `You are an AI assistant for SevaSetu, an NGO coordination platform in India.
Analyze this image from a field worker reporting a community need.

Look for:
1. Number of people visible (estimate if crowd)
2. Signs of distress or need (hunger, illness, damage, etc.)
3. Environmental context (flood, fire, construction, etc.)
4. Location clues (urban/rural, landmarks, signage)

CATEGORIES:
- emergency: Visible accidents, fires, medical emergencies
- food_nutrition: Food distribution, hunger signs, malnutrition
- health: Medical camps, sick individuals, health facilities
- education: Schools, learning materials, children studying
- water_sanitation: Water sources, sanitation facilities, flooding
- shelter: Damaged buildings, temporary shelters, homeless
- women_child: (be sensitive - note but don't expose details)
- environment: Pollution, waste, deforestation

Respond ONLY with valid JSON:
{
  "category": "category_name",
  "subCategory": "specific observation",
  "urgency": "critical|high|medium|low",
  "estimatedPeopleCount": null,
  "description": "detailed description of what you see",
  "visibleDistressSignals": ["signal1", "signal2"],
  "locationContext": "urban/rural/specific description",
  "confidence": 0.85,
  "suggestedAction": "recommended immediate action"
}`;

export interface VisionAnalysisResult {
  category: string;
  subCategory?: string;
  urgency: string;
  estimatedPeopleCount?: number;
  description: string;
  visibleDistressSignals: string[];
  locationContext?: string;
  confidence: number;
  suggestedAction?: string;
  provider?: string;
  model?: string;
  degraded?: boolean;
  warning?: string;
}

export async function analyzeImageWithGemini(
  imageBuffer: Buffer,
  mimeType: string
): Promise<VisionAnalysisResult> {
  try {
    const { data, meta } = await generateStructuredJsonFromImage<Record<string, unknown>>({
      task: 'photo vision analysis',
      prompt: VISION_PROMPT,
      imageBuffer,
      mimeType,
      model: 'flash',
      temperature: 0.2,
      maxOutputTokens: 1200,
      schema: VISION_SCHEMA,
    });
    
    return {
      category: validateCategory(String(data.category || '')),
      subCategory: typeof data.subCategory === 'string' ? data.subCategory : undefined,
      urgency: validateUrgency(String(data.urgency || '')),
      estimatedPeopleCount: typeof data.estimatedPeopleCount === 'number' ? data.estimatedPeopleCount : undefined,
      description: typeof data.description === 'string' ? data.description : 'Image analyzed',
      visibleDistressSignals: Array.isArray(data.visibleDistressSignals)
        ? data.visibleDistressSignals.filter((item): item is string => typeof item === 'string')
        : [],
      locationContext: typeof data.locationContext === 'string' ? data.locationContext : undefined,
      confidence: Math.min(1, Math.max(0, Number(data.confidence || 0.7))),
      suggestedAction: typeof data.suggestedAction === 'string' ? data.suggestedAction : undefined,
      provider: meta.provider,
      model: meta.model,
      degraded: meta.degraded,
    };
  } catch (error) {
    console.error('Vision analysis error:', error);
    const meta = buildFallbackMeta('photo vision analysis', error, 'flash');
    return {
      category: NeedCategory.HEALTH,
      urgency: UrgencyLevel.MEDIUM,
      description: 'Unable to analyze image automatically',
      visibleDistressSignals: [],
      confidence: 0.1,
      provider: meta.provider,
      model: meta.model,
      degraded: meta.degraded,
      warning: meta.warning,
    };
  }
}

// Mock vision analysis for development
export async function mockAnalyzeImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<VisionAnalysisResult> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    category: NeedCategory.FOOD_NUTRITION,
    subCategory: 'Food distribution',
    urgency: UrgencyLevel.HIGH,
    estimatedPeopleCount: Math.floor(Math.random() * 50) + 10,
    description: 'Mock analysis: Crowded area with people waiting, possibly for food distribution',
    visibleDistressSignals: ['crowded area', 'waiting queue'],
    locationContext: 'Urban area',
    confidence: 0.8,
    suggestedAction: 'Deploy food distribution team',
    provider: 'fallback',
    model: 'heuristic-fallback',
    degraded: true,
    warning: 'Vision analysis used local mock fallback output.',
  };
}

// Validate category
function validateCategory(category: string): string {
  const validCategories = Object.values(NeedCategory);
  const normalized = category?.toLowerCase().replace(/[^a-z_]/g, '');
  
  if (validCategories.includes(normalized as any)) {
    return normalized;
  }
  
  return NeedCategory.HEALTH;
}

// Validate urgency
function validateUrgency(urgency: string): string {
  const validUrgencies = Object.values(UrgencyLevel);
  const normalized = urgency?.toLowerCase().replace(/[^a-z]/g, '');
  
  if (validUrgencies.includes(normalized as any)) {
    return normalized;
  }
  
  return UrgencyLevel.MEDIUM;
}
