import type { Location } from '../../types';
import { DELHI_LOCATION_PRESETS, getDelhiLocationPreset } from '../../data/delhiLocationPresets';
import styles from './LocationPresetPicker.module.css';

type Props = {
  selectedPresetId: string;
  location: Location | null;
  locationLoading?: boolean;
  locationError?: string | null;
  onSelectPreset: (presetId: string) => void;
  onUseCurrentLocation: () => void | Promise<void>;
};

export function LocationPresetPicker({
  selectedPresetId,
  location,
  locationLoading = false,
  locationError,
  onSelectPreset,
  onUseCurrentLocation,
}: Props) {
  const selectedPreset = selectedPresetId ? getDelhiLocationPreset(selectedPresetId) : undefined;

  return (
    <div className={styles.wrapper}>
      <div className={styles.topRow}>
        <span className={styles.label}>Delhi map sections</span>
        <button type="button" className={styles.gpsButton} onClick={() => void onUseCurrentLocation()} disabled={locationLoading}>
          {locationLoading ? 'Getting GPS...' : 'Use my current location'}
        </button>
      </div>

      {location ? (
        <div className={styles.selectedCard}>
          <strong>{selectedPreset ? `${selectedPreset.label} selected` : 'Current report location selected'}</strong>
          <span>{location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}</span>
        </div>
      ) : null}

      {locationError ? <div className={styles.error}>{locationError}</div> : null}

      <div className={styles.grid}>
        {DELHI_LOCATION_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`${styles.presetButton} ${selectedPresetId === preset.id ? styles.presetButtonActive : ''}`}
            onClick={() => onSelectPreset(preset.id)}
          >
            <strong>{preset.label}</strong>
            <span>{preset.district}</span>
            <span>{preset.hint}</span>
          </button>
        ))}
      </div>

      <p className={styles.hint}>
        These presets mirror the Delhi areas already shown in the live map so you can file a need and immediately spot it on `/pulse-map`.
      </p>
    </div>
  );
}

export default LocationPresetPicker;
