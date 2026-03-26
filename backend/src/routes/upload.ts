/**
 * Upload Routes
 * PRD: 5.1.2 Photo + AI Vision Intake
 * 
 * Handles:
 * - Photo upload to Cloud Storage
 * - Audio upload for voice reports
 * - Gemini Vision analysis
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { getStorage } from '../config/firebase';
import { verifyToken } from './auth';
import { createError } from '../middleware/errorHandler';
import { analyzeImageWithGemini } from '../services/visionAnalysis';

export const uploadRouter = Router();

type StoredUpload = {
  publicUrl: string;
  storageMode: 'cloud' | 'local';
  warning?: string;
};

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

async function persistUpload(req: Request, fileName: string, file: Express.Multer.File, uid: string): Promise<StoredUpload> {
  try {
    const bucket = getStorage().bucket();
    const blob = bucket.file(fileName);

    await blob.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          uploadedBy: uid,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    await blob.makePublic();

    return {
      publicUrl: `https://storage.googleapis.com/${bucket.name}/${fileName}`,
      storageMode: 'cloud',
    };
  } catch (error) {
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const localPath = path.join(uploadsRoot, ...fileName.split('/'));

    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, file.buffer);

    return {
      publicUrl: `${req.protocol}://${req.get('host')}/uploads/${fileName}`,
      storageMode: 'local',
      warning: `Cloud storage unavailable, saved locally instead: ${stringifyError(error)}`,
    };
  }
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

// POST /api/upload/photo - Upload photo and get AI analysis
uploadRouter.post('/photo', verifyToken, upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw createError('No file uploaded', 400, 'NO_FILE');
    }

    const { uid } = (req as any).user;
    const file = req.file;
    const fileId = uuidv4();
    const extension = file.mimetype.split('/')[1];
    const fileName = `photos/${uid}/${fileId}.${extension}`;
    const storedUpload = await persistUpload(req, fileName, file, uid);

    // Run Gemini Vision analysis
    let analysis = null;
    try {
      analysis = await analyzeImageWithGemini(file.buffer, file.mimetype);
    } catch (analysisError) {
      console.warn('⚠️ Gemini Vision analysis failed:', analysisError);
    }

    res.json({
      success: true,
      data: {
        url: storedUpload.publicUrl,
        fileName,
        analysis,
        storageMode: storedUpload.storageMode,
        warning: storedUpload.warning,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/upload/audio - Upload audio recording
uploadRouter.post('/audio', verifyToken, upload.single('audio'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw createError('No file uploaded', 400, 'NO_FILE');
    }

    const { uid } = (req as any).user;
    const file = req.file;
    const fileId = uuidv4();
    const extension = file.mimetype.split('/')[1] || 'webm';
    const fileName = `audio/${uid}/${fileId}.${extension}`;
    const storedUpload = await persistUpload(req, fileName, file, uid);

    res.json({
      success: true,
      data: {
        url: storedUpload.publicUrl,
        fileName,
        storageMode: storedUpload.storageMode,
        warning: storedUpload.warning,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/upload/photo/analyze - Analyze photo without uploading (base64)
uploadRouter.post('/photo/analyze', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      throw createError('No image data provided', 400, 'NO_IMAGE_DATA');
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(imageBase64, 'base64');

    // Run Gemini Vision analysis
    const analysis = await analyzeImageWithGemini(buffer, mimeType);

    res.json({
      success: true,
      data: {
        analysis,
      },
    });
  } catch (error) {
    next(error);
  }
});
