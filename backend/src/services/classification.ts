/**
 * Need Classification Service
 * PRD: 5.1.6 Need Classification Engine
 * 
 * Uses Gemini Pro to classify need reports into categories and urgency levels.
 * Supports 8 Indian languages as specified in PRD 5.1.1
 */

import { VertexAI } from '@google-cloud/vertexai';
import { NeedCategory, UrgencyLevel, GeminiExtraction } from '../models/NeedReport';

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || 'sevasetu-dev',
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
});

const generativeModel = vertexAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
});

// Classification prompt template
const CLASSIFICATION_PROMPT = `You are an AI assistant for SevaSetu, an NGO coordination platform in India.
Analyze the following need report and classify it.

CATEGORIES (choose one):
- emergency: Medical emergency, drowning, fire, accident, missing person
- food_nutrition: Acute hunger, malnutrition, food insecurity, mid-day meal disruption
- health: Medicines, doctor visit, ambulance, mental health, maternal care
- education: School dropout risk, learning material, teacher absence, infrastructure
- water_sanitation: Drinking water scarcity, open defecation, sewage overflow
- shelter: Displacement, roof damage, homelessness, temporary shelter
- women_child: Domestic violence, child labour, trafficking risk, maternity (REQUIRES PRIVACY)
- environment: Deforestation, pollution, waste, water body contamination

URGENCY LEVELS:
- critical: Immediate danger to life, requires response within 1 hour
- high: Serious situation, requires response within 6 hours
- medium: Important but not immediately dangerous, 24-72 hour window
- low: Can be addressed within a week

INPUT TEXT (may be in Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, or Odia):
"""
{text}
"""

Respond ONLY with valid JSON in this exact format:
{
  "category": "category_name",
  "subCategory": "specific sub-category",
  "severity": "urgency_level",
  "estimatedCount": number or null,
  "description": "brief English summary of the need",
  "keywords": ["keyword1", "keyword2"],
  "confidence": 0.0-1.0,
  "language": "detected language code (hi/ta/te/bn/mr/gu/kn/or/en)"
}`;

export async function classifyNeedReport(
  text: string,
  language: string = 'en'
): Promise<GeminiExtraction> {
  try {
    const prompt = CLASSIFICATION_PROMPT.replace('{text}', text);
    
    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generation_config: {
        temperature: 0.1, // Low temperature for consistent classification
        max_output_tokens: 500,
      },
    } as any);

    const response = result.response;
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and map to our types
    const classification: GeminiExtraction = {
      category: validateCategory(parsed.category),
      subCategory: parsed.subCategory,
      severity: validateUrgency(parsed.severity),
      estimatedCount: parsed.estimatedCount || undefined,
      description: parsed.description || text.substring(0, 200),
      keywords: parsed.keywords || [],
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.8)),
      language: parsed.language || language,
      rawTranscript: text,
    };

    return classification;
  } catch (error) {
    console.error('Classification error:', error);
    // Return default classification on error
    return {
      category: NeedCategory.HEALTH,
      severity: UrgencyLevel.MEDIUM,
      description: text.substring(0, 200),
      confidence: 0.3,
      language,
      rawTranscript: text,
    };
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
  };
}
