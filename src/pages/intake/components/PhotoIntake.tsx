/**
 * Photo Intake Component
 * PRD: 5.1.2 Photo + AI Vision Intake
 * 
 * Field worker photographs a community situation (flood damage, food queue, medical camp)
 * Gemini Vision automatically analyzes the photo
 * Generates a pre-filled report that worker reviews and taps to confirm
 */

import { useState, useRef, useEffect } from 'react';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { uploadPhoto, submitReport } from '../../../services/api';
import { IntakeSource, CategoryMetadata } from '../../../types';
import type { Location, NeedCategoryType } from '../../../types';
import styles from './PhotoIntake.module.css';

interface PhotoIntakeProps {
  onSuccess?: (reportId: string) => void;
  onError?: (error: string) => void;
}

type IntakeStep = 'capture' | 'preview' | 'analyzing' | 'confirm' | 'submitting' | 'success' | 'error';

interface VisionAnalysis {
  category: string;
  subCategory?: string;
  urgency: string;
  estimatedPeopleCount?: number;
  description: string;
  visibleDistressSignals: string[];
  locationContext?: string;
  confidence: number;
  suggestedAction?: string;
  warning?: string;
  model?: string;
  provider?: string;
  degraded?: boolean;
}

export function PhotoIntake({ onSuccess, onError }: PhotoIntakeProps) {
  const [step, setStep] = useState<IntakeStep>('capture');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const {
    location,
    loading: locationLoading,
    getLocation,
    isSupported: geoSupported,
  } = useGeolocation();

  // Get location on mount
  useEffect(() => {
    if (geoSupported && !location) {
      getLocation();
    }
  }, [geoSupported, location, getLocation]);

  // Initialize camera
  useEffect(() => {
    if (step === 'capture' && useCamera) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [step, useCamera]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer back camera
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera not available, falling back to file upload');
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Capture photo from camera
  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        setImageFile(file);
        setImagePreview(URL.createObjectURL(blob));
        setStep('preview');
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select an image file');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setStep('preview');
      stopCamera();
    }
  };

  // Analyze the photo
  const analyzePhoto = async () => {
    if (!imageFile) return;

    setStep('analyzing');
    setErrorMessage('');

    try {
      const result = await uploadPhoto(imageFile);

      if (result.success && result.data) {
        setUploadedUrl(result.data.url);
        
        if (result.data.analysis) {
          setAnalysis(result.data.analysis);
        } else {
          // Create mock analysis if API didn't return one
          setAnalysis({
            category: 'health',
            urgency: 'medium',
            description: 'Photo uploaded - manual classification required',
            visibleDistressSignals: [],
            confidence: 0.5,
          });
        }
        setStep('confirm');
      } else {
        throw new Error(result.error?.message || 'Failed to analyze photo');
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'Failed to analyze photo');
      setStep('error');
      onError?.(err.message);
    }
  };

  // Submit the report
  const handleConfirm = async () => {
    if (!analysis) return;

    setStep('submitting');

    try {
      let reportLocation: Location = location || { latitude: 0, longitude: 0 };

      if (!location && geoSupported) {
        const newLoc = await getLocation();
        if (newLoc) {
          reportLocation = newLoc;
        }
      }

      const result = await submitReport({
        description: analysis.description,
        location: reportLocation,
        source: IntakeSource.PHOTO,
        language: 'en',
        category: analysis.category as NeedCategoryType,
        urgency: analysis.urgency as any,
        estimatedPeopleAffected: analysis.estimatedPeopleCount,
        photoUrls: uploadedUrl ? [uploadedUrl] : [],
      });

      if (result.success && result.data) {
        setReportId(result.data.report.id || null);
        setStep('success');
        onSuccess?.(result.data.report.id || '');
      } else {
        throw new Error(result.error?.message || 'Failed to submit report');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setErrorMessage(err.message || 'Failed to submit report');
      setStep('error');
      onError?.(err.message);
    }
  };

  // Reset and start over
  const handleReset = () => {
    setStep('capture');
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setUploadedUrl(null);
    setAnalysis(null);
    setErrorMessage('');
    setReportId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Retake photo
  const handleRetake = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setStep('capture');
  };

  const categoryMeta = analysis?.category
    ? CategoryMetadata[analysis.category as NeedCategoryType]
    : null;

  return (
    <div className={styles.container}>
      {/* Location status */}
      <div className={styles.locationStatus}>
        {locationLoading && <span className={styles.loading}>📍 Getting location...</span>}
        {location && (
          <span className={styles.success}>
            📍 {location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
          </span>
        )}
      </div>

      {/* Main content */}
      <div className={styles.content}>
        {/* Capture step */}
        {step === 'capture' && (
          <div className={styles.captureState}>
            {useCamera ? (
              <>
                <div className={styles.cameraContainer}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={styles.cameraPreview}
                  />
                  <canvas ref={canvasRef} className={styles.hiddenCanvas} />
                </div>
                <div className={styles.captureButtons}>
                  <button className={styles.captureButton} onClick={captureFromCamera}>
                    <div className={styles.captureRing} />
                  </button>
                </div>
                <button
                  className={styles.switchButton}
                  onClick={() => {
                    stopCamera();
                    setUseCamera(false);
                  }}
                >
                  📁 Choose from gallery
                </button>
              </>
            ) : (
              <>
                <div className={styles.uploadArea}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className={styles.fileInput}
                    id="photo-input"
                  />
                  <label htmlFor="photo-input" className={styles.uploadLabel}>
                    <svg viewBox="0 0 24 24" fill="currentColor" className={styles.uploadIcon}>
                      <path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z"/>
                    </svg>
                    <span>Tap to select photo</span>
                  </label>
                </div>
                <button
                  className={styles.switchButton}
                  onClick={() => setUseCamera(true)}
                >
                  📷 Use camera
                </button>
              </>
            )}
          </div>
        )}

        {/* Preview step */}
        {step === 'preview' && imagePreview && (
          <div className={styles.previewState}>
            <div className={styles.imagePreview}>
              <img src={imagePreview} alt="Preview" />
            </div>
            <div className={styles.previewButtons}>
              <button className={styles.retakeButton} onClick={handleRetake}>
                Retake
              </button>
              <button className={styles.analyzeButton} onClick={analyzePhoto}>
                Analyze with AI
              </button>
            </div>
          </div>
        )}

        {/* Analyzing step */}
        {step === 'analyzing' && (
          <div className={styles.analyzingState}>
            <div className={styles.imagePreviewSmall}>
              {imagePreview && <img src={imagePreview} alt="Analyzing" />}
            </div>
            <div className={styles.spinner} />
            <p>Analyzing with Gemini Vision...</p>
          </div>
        )}

        {/* Confirm step */}
        {step === 'confirm' && analysis && (
          <div className={styles.confirmState}>
            <div className={styles.imagePreviewSmall}>
              {imagePreview && <img src={imagePreview} alt="Analyzed" />}
            </div>

            {categoryMeta && (
              <div className={styles.categoryBadge}>
                <span className={styles.emoji}>{categoryMeta.emoji}</span>
                <span className={styles.categoryLabel}>
                  {categoryMeta.label}
                </span>
                <span className={`${styles.urgencyBadge} ${styles[analysis.urgency]}`}>
                  {analysis.urgency.toUpperCase()}
                </span>
              </div>
            )}

            <p className={styles.description}>{analysis.description}</p>

            {analysis.warning && (
              <p className={styles.errorMessage}>{analysis.warning}</p>
            )}

            {analysis.estimatedPeopleCount && (
              <p className={styles.peopleCount}>
                ~{analysis.estimatedPeopleCount} people affected
              </p>
            )}

            {analysis.visibleDistressSignals?.length > 0 && (
              <div className={styles.signals}>
                <span className={styles.signalsLabel}>Detected:</span>
                {analysis.visibleDistressSignals.map((signal, i) => (
                  <span key={i} className={styles.signalChip}>{signal}</span>
                ))}
              </div>
            )}

            {analysis.suggestedAction && (
              <p className={styles.suggestedAction}>
                💡 {analysis.suggestedAction}
              </p>
            )}

            <div className={styles.confidence}>
              Confidence: {Math.round(analysis.confidence * 100)}%
            </div>

            <div className={styles.confirmButtons}>
              <button className={styles.confirmButton} onClick={handleConfirm}>
                Submit Report
              </button>
              <button className={styles.retakeButton} onClick={handleRetake}>
                Retake Photo
              </button>
            </div>
          </div>
        )}

        {/* Submitting step */}
        {step === 'submitting' && (
          <div className={styles.submittingState}>
            <div className={styles.spinner} />
            <p>Submitting report...</p>
          </div>
        )}

        {/* Success step */}
        {step === 'success' && (
          <div className={styles.successState}>
            <div className={styles.successIcon}>✓</div>
            <p className={styles.successMessage}>Report submitted successfully!</p>
            {reportId && (
              <p className={styles.reportId}>Report ID: {reportId.slice(0, 8)}...</p>
            )}
            <button className={styles.newReportButton} onClick={handleReset}>
              Submit Another Report
            </button>
          </div>
        )}

        {/* Error step */}
        {step === 'error' && (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>✕</div>
            <p className={styles.errorMessage}>{errorMessage}</p>
            <button className={styles.retryButton} onClick={handleReset}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
