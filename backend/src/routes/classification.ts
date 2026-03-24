/**
 * Classification Routes
 * PRD: 5.1.6 Need Classification Engine
 * 
 * Exposes the Gemini-powered classification as an API
 * for testing and manual classification
 */

import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth';
import { classifyNeedReport, classifyVoiceTranscript } from '../services/classification';
import { CategoryMetadata, NeedCategoryType } from '../models/NeedReport';

export const classificationRouter = Router();

// POST /api/classification/text - Classify text description
classificationRouter.post('/text', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, language = 'en' } = req.body;

    if (!text || text.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: { message: 'Text must be at least 10 characters', code: 'TEXT_TOO_SHORT' },
      });
    }

    const classification = await classifyNeedReport(text, language);
    const categoryMeta = CategoryMetadata[classification.category as NeedCategoryType];

    res.json({
      success: true,
      data: {
        classification,
        categoryMeta,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/classification/voice - Classify voice transcript
classificationRouter.post('/voice', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transcript, language = 'hi' } = req.body;

    if (!transcript || transcript.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: { message: 'Transcript too short', code: 'TRANSCRIPT_TOO_SHORT' },
      });
    }

    const classification = await classifyVoiceTranscript(transcript, language);
    const categoryMeta = CategoryMetadata[classification.category as NeedCategoryType];

    res.json({
      success: true,
      data: {
        classification,
        categoryMeta,
        // Confirmation message in user's language
        confirmationMessage: generateConfirmationMessage(classification, language),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/classification/categories - Get all category metadata
classificationRouter.get('/categories', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      categories: CategoryMetadata,
    },
  });
});

// Helper to generate confirmation message (PRD 5.1.1)
function generateConfirmationMessage(
  classification: { category: string; estimatedCount?: number },
  language: string
): string {
  const categoryMeta = CategoryMetadata[classification.category as NeedCategoryType];
  const count = classification.estimatedCount || 'several';
  
  if (!categoryMeta) {
    return `Did you report a need affecting ${count} people?`;
  }
  
  const messages: Record<string, string> = {
    hi: `क्या आपने ${count} लोगों के लिए ${categoryMeta.labelHi} की ज़रूरत रिपोर्ट की है?`,
    en: `Did you report a ${categoryMeta.label.toLowerCase()} need affecting ${count} people?`,
    ta: `${count} நபர்களுக்கு ${categoryMeta.label} தேவை என்று நீங்கள் புகாரளித்தீர்களா?`,
    te: `${count} మందికి ${categoryMeta.label} అవసరం అని మీరు నివేదించారా?`,
    bn: `আপনি কি ${count} জনের জন্য ${categoryMeta.label} প্রয়োজন রিপোর্ট করেছেন?`,
    mr: `तुम्ही ${count} लोकांसाठी ${categoryMeta.label} गरज नोंदवली का?`,
    gu: `શું તમે ${count} લોકો માટે ${categoryMeta.label} જરૂરિયાતની જાણ કરી?`,
    kn: `${count} ಜನರಿಗೆ ${categoryMeta.label} ಅಗತ್ಯವಿದೆ ಎಂದು ನೀವು ವರದಿ ಮಾಡಿದ್ದೀರಾ?`,
    or: `ଆପଣ ${count} ଲୋକଙ୍କ ପାଇଁ ${categoryMeta.label} ଆବଶ୍ୟକତା ରିପୋର୍ଟ କରିଛନ୍ତି କି?`,
  };

  return messages[language] || messages.en;
}
