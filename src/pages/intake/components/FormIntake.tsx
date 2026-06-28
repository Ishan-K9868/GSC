/**
 * Form Intake Component
 * PRD: 5.1.4 Web Form Intake (Fallback)
 * 
 * Structured form with:
 * - Category dropdown (8 categories from PRD 5.1.6)
 * - Location picker (Google Maps or GPS auto-capture)
 * - Description textarea
 * - Photo/file attachment
 * - People affected count
 * - Priority selection
 */

import { useState, useEffect } from 'react';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { submitReport, classifyText, uploadPhoto } from '../../../services/api';
import { 
  IntakeSource, 
  NeedCategory, 
  UrgencyLevel, 
  CategoryMetadata, 
  SupportedLanguages 
} from '../../../types';
import type { 
  Location, 
  NeedCategoryType, 
  UrgencyLevelType 
} from '../../../types';
import { REPORT_TEMPLATES, getTemplateById } from '../../../data/reportTemplates';
import { AppIcon } from '../../../components/shared';
import LocationPresetPicker from '../../../components/shared/LocationPresetPicker';
import { getDelhiLocationPreset } from '../../../data/delhiLocationPresets';
import styles from './FormIntake.module.css';

interface FormIntakeProps {
  onSuccess?: (reportId: string) => void;
  onError?: (error: string) => void;
}

type FormStep = 'form' | 'submitting' | 'success' | 'error';

interface FormData {
  category: NeedCategoryType | '';
  subCategory: string;
  description: string;
  urgency: UrgencyLevelType;
  estimatedPeopleAffected: number;
  language: string;
  photo: File | null;
  photoPreview: string | null;
}

const initialFormData: FormData = {
  category: '',
  subCategory: '',
  description: '',
  urgency: 'medium',
  estimatedPeopleAffected: 1,
  language: 'en',
  photo: null,
  photoPreview: null,
};

export function FormIntake({ onSuccess, onError }: FormIntakeProps) {
  const [step, setStep] = useState<FormStep>('form');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState('');

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

  // Get subcategories for selected category
  const subCategories = formData.category 
    ? CategoryMetadata[formData.category].subCategories 
    : [];

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Reset subcategory when category changes
      ...(name === 'category' && { subCategory: '' }),
    }));

    // Clear error for this field
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle number input
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      setFormData((prev) => ({ ...prev, estimatedPeopleAffected: value }));
    }
  };

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, photo: 'Photo must be less than 10MB' }));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          photo: file,
          photoPreview: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove photo
  const handleRemovePhoto = () => {
    setFormData((prev) => ({
      ...prev,
      photo: null,
      photoPreview: null,
    }));
  };

  // Get AI classification suggestion
  const handleGetSuggestion = async () => {
    if (!formData.description || formData.description.length < 10) {
      return;
    }

    try {
      const result = await classifyText(formData.description, formData.language);
      if (result.success && result.data) {
        setAiSuggestion(result.data.classification);
        setShowAiSuggestion(true);
      }
    } catch (err) {
      console.error('AI suggestion error:', err);
    }
  };

  // Apply AI suggestion
  const handleApplySuggestion = () => {
    if (aiSuggestion) {
      setFormData((prev) => ({
        ...prev,
        category: aiSuggestion.category || prev.category,
        urgency: aiSuggestion.urgency || aiSuggestion.severity || prev.urgency,
      }));
      setShowAiSuggestion(false);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);
    
    if (!templateId) return;
    
    const template = getTemplateById(templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        category: template.category,
        subCategory: template.subCategory || '',
        description: template.description,
        urgency: template.urgency,
        estimatedPeopleAffected: template.estimatedPeopleAffected,
      }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (!formData.description || formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setStep('submitting');
    setErrorMessage('');

    try {
      // Upload photo if present
      let photoUrls: string[] = [];
      if (formData.photo) {
        const uploadResult = await uploadPhoto(formData.photo);
        if (uploadResult.success && uploadResult.data) {
          photoUrls = [uploadResult.data.url];
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
        description: formData.description,
        location: reportLocation,
        source: IntakeSource.WEB_FORM,
        language: formData.language,
        category: formData.category as NeedCategoryType,
        urgency: formData.urgency,
        estimatedPeopleAffected: formData.estimatedPeopleAffected,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
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

  // Reset form
  const handleReset = () => {
    setFormData(initialFormData);
    setErrors({});
    setErrorMessage('');
    setAiSuggestion(null);
    setShowAiSuggestion(false);
    setStep('form');
    setReportId(null);
  };

  // Render form step
  const renderForm = () => (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* Template Selection */}
      <div className={styles.formGroup}>
        <label htmlFor="template">Quick Templates / टेम्पलेट्स</label>
        <select
          id="template"
          value={selectedTemplate}
          onChange={handleTemplateSelect}
        >
          <option value="">Choose a template (optional)...</option>
          {REPORT_TEMPLATES.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} / {template.nameHi}
            </option>
          ))}
        </select>
        <small className={styles.hint}>Pre-filled templates for common scenarios</small>
      </div>

      {/* Language Selection */}
      <div className={styles.formGroup}>
        <label htmlFor="language">Language / भाषा</label>
        <select
          id="language"
          name="language"
          value={formData.language}
          onChange={handleInputChange}
        >
          {SupportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name} ({lang.nameEn})
            </option>
          ))}
        </select>
      </div>

      {/* Category Selection */}
      <div className={styles.formGroup}>
        <label htmlFor="category">Category / श्रेणी *</label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleInputChange}
          className={errors.category ? styles.inputError : ''}
        >
          <option value="">Select a category...</option>
          {Object.entries(NeedCategory).map(([key, value]) => {
            const meta = CategoryMetadata[value];
            return (
              <option key={key} value={value}>
                {meta.label} / {meta.labelHi}
              </option>
            );
          })}
        </select>
        {errors.category && <span className={styles.error}>{errors.category}</span>}
      </div>

      {/* Sub-category Selection */}
      {subCategories.length > 0 && (
        <div className={styles.formGroup}>
          <label htmlFor="subCategory">Sub-category / उप-श्रेणी</label>
          <select
            id="subCategory"
            name="subCategory"
            value={formData.subCategory}
            onChange={handleInputChange}
          >
            <option value="">Select a sub-category (optional)...</option>
            {subCategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Description */}
      <div className={styles.formGroup}>
        <label htmlFor="description">
          Description / विवरण * 
          <span className={styles.charCount}>
            ({formData.description.length}/2000)
          </span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Describe the need in detail..."
          rows={4}
          className={errors.description ? styles.inputError : ''}
        />
        {errors.description && <span className={styles.error}>{errors.description}</span>}
        
        {/* AI Suggestion Button */}
        {formData.description.length >= 10 && !showAiSuggestion && (
          <button 
            type="button" 
            className={styles.aiButton}
            onClick={handleGetSuggestion}
          >
            Get AI Category Suggestion
          </button>
        )}

        {/* AI Suggestion Display */}
        {showAiSuggestion && aiSuggestion && (
          <div className={styles.aiSuggestion}>
            <p>
              AI suggests: <strong>{aiSuggestion.category}</strong> 
              (Urgency: {aiSuggestion.urgency || aiSuggestion.severity})
            </p>
            {aiSuggestion.warning && <p className={styles.error}>{aiSuggestion.warning}</p>}
            <div className={styles.aiButtons}>
              <button type="button" onClick={handleApplySuggestion}>
                Apply
              </button>
              <button type="button" onClick={() => setShowAiSuggestion(false)}>
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Urgency Selection */}
      <div className={styles.formGroup}>
        <label>Urgency / तात्कालिकता *</label>
        <div className={styles.urgencyOptions}>
          {Object.entries(UrgencyLevel).map(([key, value]) => (
            <label 
              key={key} 
              className={`${styles.urgencyOption} ${formData.urgency === value ? styles.selected : ''} ${styles[value]}`}
            >
              <input
                type="radio"
                name="urgency"
                value={value}
                checked={formData.urgency === value}
                onChange={handleInputChange}
              />
              <span className={styles.urgencyLabel}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* People Affected */}
      <div className={styles.formGroup}>
        <label htmlFor="estimatedPeopleAffected">
          Estimated People Affected / प्रभावित लोगों की संख्या
        </label>
        <input
          type="number"
          id="estimatedPeopleAffected"
          name="estimatedPeopleAffected"
          value={formData.estimatedPeopleAffected}
          onChange={handleNumberChange}
          min={1}
          max={100000}
        />
      </div>

      {/* Photo Upload */}
      <div className={styles.formGroup}>
        <label>Photo Attachment / फ़ोटो</label>
        {!formData.photoPreview ? (
          <label className={styles.photoUpload}>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
            <span className={styles.uploadIcon}>+</span>
            <span>Add Photo (optional)</span>
          </label>
        ) : (
          <div className={styles.photoPreview}>
            <img src={formData.photoPreview} alt="Preview" />
            <button 
              type="button" 
              className={styles.removePhoto}
              onClick={handleRemovePhoto}
            >
              Remove
            </button>
          </div>
        )}
        {errors.photo && <span className={styles.error}>{errors.photo}</span>}
      </div>

      {/* Location */}
      <div className={styles.formGroup}>
        <label>Location / स्थान</label>
        <div className={styles.locationBox}>
          {locationLoading && (
            <span className={styles.loading}>Getting location...</span>
          )}
          {locationError && (
            <span className={styles.locationError}>{locationError}</span>
          )}
          {location && (
            <span className={styles.locationSuccess}>
              {location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
            </span>
          )}
          <button
            type="button"
            className={styles.refreshLocation}
            onClick={() => void handleUseCurrentLocation()}
            disabled={locationLoading}
          >
            Refresh Location
          </button>
        </div>
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

      {/* Submit Button */}
      <button type="submit" className={styles.submitButton}>
        Submit Report / रिपोर्ट जमा करें
      </button>
    </form>
  );

  return (
    <div className={styles.container}>
      {step === 'form' && renderForm()}

      {step === 'submitting' && (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Submitting your report...</p>
        </div>
      )}

      {step === 'success' && (
        <div className={styles.successState}>
          <div className={styles.successIcon}><AppIcon name="check" size={28} /></div>
          <p className={styles.successMessage}>
            Report submitted successfully!<br />
            <span className={styles.successHi}>रिपोर्ट सफलतापूर्वक जमा की गई!</span>
          </p>
          {reportId && (
            <p className={styles.reportId}>Report ID: {reportId.slice(0, 8)}...</p>
          )}
          <button className={styles.newReportButton} onClick={handleReset}>
            Submit Another Report
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>!</div>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button className={styles.retryButton} onClick={() => setStep('form')}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
