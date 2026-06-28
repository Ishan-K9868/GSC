/**
 * Voice Intake Component
 * PRD: 5.1.1 Voice-First Intake (Primary Mode)
 * 
 * User presses and holds the large orange microphone button (no typing, no menus)
 * Speaks naturally in any of 8 supported languages
 * Entire flow: 15-20 seconds. Zero typing required.
 */

import { useState, useEffect } from 'react';
import { useVoiceRecording, formatDuration } from '../../../hooks/useVoiceRecording';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { submitReport, classifyVoice, uploadAudio, extractVoiceFromAudio } from '../../../services/api';
import { IntakeSource, SupportedLanguages, CategoryMetadata } from '../../../types';
import type { Location, NeedCategoryType } from '../../../types';
import { AppIcon } from '../../../components/shared';
import LocationPresetPicker from '../../../components/shared/LocationPresetPicker';
import { getDelhiLocationPreset } from '../../../data/delhiLocationPresets';
import { getCategoryIcon } from '../../../utils/categoryIcons';
import styles from './VoiceIntake.module.css';

interface VoiceIntakeProps {
  onSuccess?: (reportId: string) => void;
  onError?: (error: string) => void;
  onSwitchToForm?: () => void;
}

type IntakeStep = 'ready' | 'recording' | 'processing' | 'transcription_recovery' | 'extracting_audio' | 'confirm' | 'submitting' | 'success' | 'error';
const MIN_RECORDING_MS = 700;

export function VoiceIntake({ onSuccess, onError, onSwitchToForm }: VoiceIntakeProps) {
  const [step, setStep] = useState<IntakeStep>('ready');
  const [language, setLanguage] = useState('hi');
  const [classification, setClassification] = useState<any>(null);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | undefined>();

  const {
    isRecording,
    duration,
    audioBlob,
    transcript,
    speechRecognitionError,
    error: recordingError,
    startRecording,
    stopRecording,
    resetRecording,
    isSupported: voiceSupported,
  } = useVoiceRecording({
    maxDuration: 60000,
    language,
  });

  const {
    location,
    loading: locationLoading,
    error: locationError,
    getLocation,
    setLocation,
    isSupported: geoSupported,
  } = useGeolocation();

  // Get location on mount
  useEffect(() => {
    if (geoSupported && !location) {
      getLocation();
    }
  }, [geoSupported, location, getLocation]);

  const handleSelectLocationPreset = (presetId: string) => {
    const preset = getDelhiLocationPreset(presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setLocation(preset.location);
  };

  const handleSelectTypedLocation = (nextLocation: Location) => {
    setSelectedPresetId('');
    setLocation(nextLocation);
  };

  const handleUseCurrentLocation = async () => {
    const currentLocation = await getLocation();
    if (currentLocation) {
      setSelectedPresetId('');
      setLocation(currentLocation);
    }
  };

  // Handle recording start (press and hold)
  const handleRecordStart = async () => {
    if (step !== 'ready') return;
    
    setErrorMessage('');
    setRecoveryMessage('');
    setUploadedAudioUrl(undefined);
    setRecordedAudioBlob(null);
    const started = await startRecording();
    if (started) {
      setStep('recording');
    }
  };

  // Handle recording stop (release button)
  const handleRecordStop = async () => {
    if (step !== 'recording') return;

    if (!isRecording) {
      setStep('ready');
      return;
    }

    const currentDuration = duration;
    const currentTranscript = transcript.trim();

    if (currentDuration < MIN_RECORDING_MS && !currentTranscript) {
      await stopRecording();
      resetRecording();
      setStep('ready');
      return;
    }

    setStep('processing');

    const recordedBlob = await stopRecording();
    await processRecording(recordedBlob);
  };

  // Process the recording
  const processRecording = async (recordedBlob?: Blob | null) => {
    try {
      const finalAudioBlob = recordedBlob ?? audioBlob;
      if (finalAudioBlob) {
        setRecordedAudioBlob(finalAudioBlob);
      }

      if (!finalAudioBlob && !transcript.trim()) {
        throw new Error('No audio recorded');
      }

      // Get transcript and classify
      const transcriptText = transcript.trim();

      if (transcriptText.length < 5) {
        setRecoveryMessage(
          speechRecognitionError
            ? 'Live transcription could not complete, but your audio was recorded.'
            : 'No clear transcript came through, but your audio was recorded.'
        );
        setStep('transcription_recovery');
        return;
      }
      
      // Call classification API
      const classifyResult = await classifyVoice(transcriptText, language);
      
      if (classifyResult.success && classifyResult.data) {
        setClassification(classifyResult.data.classification);
        setConfirmationMessage(classifyResult.data.confirmationMessage);
        setStep('confirm');
      } else {
        // Use mock classification if API fails
        setClassification({
          category: 'health',
          urgency: 'medium',
          description: transcriptText,
          confidence: 0.7,
        });
        setConfirmationMessage(`क्या आपने यह ज़रूरत रिपोर्ट की है: "${transcriptText.substring(0, 50)}..."?`);
        setStep('confirm');
      }
    } catch (err: any) {
      console.error('Processing error:', err);
      setErrorMessage(err.message || 'Failed to process recording');
      setStep('error');
      onError?.(err.message);
    }
  };

  const handleExtractFromAudio = async () => {
    const finalAudioBlob = recordedAudioBlob ?? audioBlob;
    if (!finalAudioBlob) {
      setErrorMessage('No recorded audio is available. Record once more or use the form.');
      setStep('error');
      return;
    }

    setStep('extracting_audio');
    setRecoveryMessage('');

    try {
      const extractResult = await extractVoiceFromAudio(finalAudioBlob, language);

      if (extractResult.success && extractResult.data) {
        setUploadedAudioUrl(extractResult.data.url);
        setClassification(extractResult.data.classification);
        setConfirmationMessage(extractResult.data.confirmationMessage);
        setStep('confirm');
        return;
      }

      throw new Error(extractResult.error?.message || 'Audio extraction failed');
    } catch (err: any) {
      console.error('Audio extraction error:', err);
      setRecoveryMessage('Gemini could not extract the recording. You can try again or switch to the form.');
      setStep('transcription_recovery');
    }
  };

  // Submit the report
  const handleConfirm = async () => {
    setStep('submitting');

    try {
      // Upload audio if available
      let audioUrl = uploadedAudioUrl;
      if (!audioUrl && audioBlob) {
        const uploadResult = await uploadAudio(audioBlob);
        if (uploadResult.success && uploadResult.data) {
          audioUrl = uploadResult.data.url;
        }
      }

      // Ensure we have location
      let reportLocation: Location = location || {
        latitude: 0,
        longitude: 0,
      };

      if (!location && geoSupported) {
        const newLoc = await getLocation();
        if (newLoc) {
          reportLocation = newLoc;
        }
      }

      // Submit the report
      const result = await submitReport({
        description: classification?.description || transcript || 'Voice report',
        location: reportLocation,
        source: IntakeSource.VOICE,
        language,
        category: classification?.category,
        urgency: classification?.severity || classification?.urgency,
        estimatedPeopleAffected: classification?.estimatedCount,
        audioUrl,
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

  // Cancel and reset
  const handleCancel = () => {
    resetRecording();
    setClassification(null);
    setConfirmationMessage('');
    setErrorMessage('');
    setRecoveryMessage('');
    setRecordedAudioBlob(null);
    setUploadedAudioUrl(undefined);
    setStep('ready');
  };

  const handleSwitchToForm = () => {
    handleCancel();
    onSwitchToForm?.();
  };

  // Reset after success
  const handleNewReport = () => {
    handleCancel();
    setReportId(null);
  };

  // Get category display info
  const categoryMeta = classification?.category 
    ? CategoryMetadata[classification.category as NeedCategoryType]
    : null;

  return (
    <div className={styles.container}>
      {/* Language selector */}
      <div className={styles.languageSelector}>
        <label htmlFor="language">भाषा / Language:</label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={step !== 'ready'}
        >
          {SupportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name} ({lang.nameEn})
            </option>
          ))}
        </select>
      </div>

      {/* Main content based on step */}
      <div className={styles.content}>
        {/* Ready state - show mic button */}
        {step === 'ready' && (
          <div className={styles.readyState}>
            <p className={styles.instruction}>
              बोलने के लिए बटन दबाएं<br />
              <span className={styles.instructionEn}>Tap once to start speaking</span>
            </p>
            
            <button
              className={styles.micButton}
              onClick={() => void handleRecordStart()}
              disabled={!voiceSupported}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.micIcon}>
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>

            {!voiceSupported && (
              <p className={styles.error}>
                Voice recording is not supported in this browser.
              </p>
            )}
          </div>
        )}

        {/* Recording state */}
        {step === 'recording' && (
          <div className={styles.recordingState}>
            <div className={styles.recordingIndicator}>
              <span className={styles.recordingDot} />
              Recording... tap again to stop
            </div>
            
            <p className={styles.duration}>{formatDuration(duration)}</p>
            
            <button
              className={`${styles.micButton} ${styles.recording}`}
              onClick={() => void handleRecordStop()}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.micIcon}>
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>

            {transcript && (
              <p className={styles.transcript}>{transcript}</p>
            )}

            {!transcript && speechRecognitionError && (
              <div className={styles.liveTranscriptWarning} role="status">
                <strong>Live transcript paused</strong>
                <span>Keep speaking. The recording is still saved for audio extraction.</span>
              </div>
            )}
          </div>
        )}

        {/* Processing state */}
        {step === 'processing' && (
          <div className={styles.processingState}>
            <div className={styles.spinner} />
            <p>Processing your report...</p>
          </div>
        )}

        {step === 'transcription_recovery' && (
          <div className={styles.recoveryState}>
            <div className={styles.recoveryIcon}><AppIcon name="alert" size={22} /></div>
            <div>
              <strong>Audio is saved. Transcript did not come through.</strong>
              <p>{recoveryMessage || 'Extract the need from the recording, switch to the form, or record again.'}</p>
            </div>
            <div className={styles.recoveryActions}>
              <button className={styles.confirmButton} type="button" onClick={() => void handleExtractFromAudio()}>
                Extract from audio
              </button>
              <button className={styles.cancelButton} type="button" onClick={handleSwitchToForm}>
                Use form instead
              </button>
              <button className={styles.retryButton} type="button" onClick={handleCancel}>
                Record again
              </button>
            </div>
          </div>
        )}

        {step === 'extracting_audio' && (
          <div className={styles.processingState}>
            <div className={styles.spinner} />
            <p>Extracting details from the recording...</p>
          </div>
        )}

        {/* Confirmation state */}
        {step === 'confirm' && (
          <div className={styles.confirmState}>
            {categoryMeta && (
              <div className={styles.categoryBadge}>
                <span className={styles.iconBadge}><AppIcon name={getCategoryIcon(classification?.category)} size={18} /></span>
                <span className={styles.categoryLabel}>
                  {categoryMeta.labelHi} / {categoryMeta.label}
                </span>
              </div>
            )}

            <p className={styles.confirmMessage}>{confirmationMessage}</p>

            {classification?.description && (
              <p className={styles.description}>{classification.description}</p>
            )}

            {classification?.warning && (
              <p className={styles.error}>{classification.warning}</p>
            )}

            <div className={styles.locationChooserBlock}>
              <LocationPresetPicker
                selectedPresetId={selectedPresetId}
                location={location}
                locationLoading={locationLoading}
                locationError={locationError}
                onSelectPreset={handleSelectLocationPreset}
                onSelectTypedLocation={handleSelectTypedLocation}
                onUseCurrentLocation={handleUseCurrentLocation}
              />
            </div>

            <div className={styles.confirmButtons}>
              <button
                className={styles.confirmButton}
                onClick={handleConfirm}
              >
                हाँ / Yes
              </button>
              <button
                className={styles.cancelButton}
                onClick={handleCancel}
              >
                नहीं / No
              </button>
            </div>
          </div>
        )}

        {/* Submitting state */}
        {step === 'submitting' && (
          <div className={styles.submittingState}>
            <div className={styles.spinner} />
            <p>Submitting report...</p>
          </div>
        )}

        {/* Success state */}
        {step === 'success' && (
          <div className={styles.successState}>
            <div className={styles.successIcon}><AppIcon name="check" size={28} /></div>
            <p className={styles.successMessage}>
              रिपोर्ट सफलतापूर्वक जमा की गई!<br />
              <span className={styles.successEn}>Report submitted successfully!</span>
            </p>
            {reportId && (
              <p className={styles.reportId}>Report ID: {reportId.slice(0, 8)}...</p>
            )}
            <button className={styles.newReportButton} onClick={handleNewReport}>
              नई रिपोर्ट / New Report
            </button>
          </div>
        )}

        {/* Error state */}
        {step === 'error' && (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}><AppIcon name="alert" size={22} /></div>
            <p className={styles.errorMessage}>{errorMessage || recordingError}</p>
            <button className={styles.retryButton} onClick={handleCancel}>
              पुनः प्रयास करें / Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
