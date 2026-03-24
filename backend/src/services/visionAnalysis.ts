/**
 * Vision Analysis Service
 * PRD: 5.1.2 Photo + AI Vision Intake
 * 
 * Uses Gemini Vision to analyze photos and extract need information.
 */

import { VertexAI } from '@google-cloud/vertexai';
import { NeedCategory, UrgencyLevel } from '../models/NeedReport';

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'sevasetu-dev',
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
});

const visionModel = vertexAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
});

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
  "estimatedPeopleCount": number or null,
  "description": "detailed description of what you see",
  "visibleDistressSignals": ["signal1", "signal2"],
  "locationContext": "urban/rural/specific description",
  "confidence": 0.0-1.0,
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
}

export async function analyzeImageWithGemini(
  imageBuffer: Buffer,
  mimeType: string
): Promise<VisionAnalysisResult> {
  try {
    const base64Image = imageBuffer.toString('base64');
    
    const result = await visionModel.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image,
            },
          },
          { text: VISION_PROMPT },
        ],
      }],
      generation_config: {
        temperature: 0.2,
        max_output_tokens: 800,
      },
    } as any);

    const response = result.response;
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in vision response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      category: validateCategory(parsed.category),
      subCategory: parsed.subCategory,
      urgency: validateUrgency(parsed.urgency),
      estimatedPeopleCount: parsed.estimatedPeopleCount,
      description: parsed.description || 'Image analyzed',
      visibleDistressSignals: parsed.visibleDistressSignals || [],
      locationContext: parsed.locationContext,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      suggestedAction: parsed.suggestedAction,
    };
  } catch (error) {
    console.error('Vision analysis error:', error);
    // Return default on error
    return {
      category: NeedCategory.HEALTH,
      urgency: UrgencyLevel.MEDIUM,
      description: 'Unable to analyze image automatically',
      visibleDistressSignals: [],
      confidence: 0.1,
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
