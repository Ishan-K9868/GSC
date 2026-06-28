import { useId, useMemo, useState } from 'react';
import type { Location } from '../../types';
import {
  DELHI_LOCATION_PRESETS,
  getDelhiLocationPreset,
  searchDelhiLocations,
  type DelhiLocationPreset,
} from '../../data/delhiLocationPresets';
import { AppIcon } from './AppIcons';
import styles from './LocationPresetPicker.module.css';

type Props = {
  selectedPresetId: string;
  location: Location | null;
  locationLoading?: boolean;
  locationError?: string | null;
  onSelectPreset: (presetId: string) => void;
  onSelectTypedLocation?: (location: Location, label: string) => void | Promise<void>;
  onUseCurrentLocation: () => void | Promise<void>;
};

export function LocationPresetPicker({
  selectedPresetId,
  location,
  locationLoading = false,
  locationError,
  onSelectPreset,
  onSelectTypedLocation,
  onUseCurrentLocation,
}: Props) {
  const searchInputId = useId();
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const selectedPreset = selectedPresetId ? getDelhiLocationPreset(selectedPresetId) : undefined;
  const trimmedQuery = query.trim();
  const suggestions = useMemo(() => searchDelhiLocations(query, 6), [query]);
  const hasSearch = trimmedQuery.length >= 2;
  const canUseTypedAddress = trimmedQuery.length >= 4 && Boolean(onSelectTypedLocation);
  const showSuggestions = isSearchFocused && (hasSearch || canUseTypedAddress);

  const isPreset = (locationId: string) => DELHI_LOCATION_PRESETS.some((preset) => preset.id === locationId);

  const selectSuggestion = (suggestion: DelhiLocationPreset) => {
    setQuery(suggestion.label);
    setIsSearchFocused(false);

    if (isPreset(suggestion.id)) {
      onSelectPreset(suggestion.id);
      return;
    }

    void onSelectTypedLocation?.(suggestion.location, suggestion.label);
  };

  const useTypedAddress = () => {
    if (!canUseTypedAddress) return;
    const address = /delhi/i.test(trimmedQuery) ? trimmedQuery : `${trimmedQuery}, Delhi`;
    setIsSearchFocused(false);
    void onSelectTypedLocation?.(
      {
        latitude: 28.6139,
        longitude: 77.209,
        address,
        district: 'Delhi',
        state: 'Delhi',
        accuracy: 5000,
      },
      trimmedQuery
    );
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topRow}>
        <span className={styles.label}>Location lock</span>
        <button type="button" className={styles.gpsButton} onClick={() => void onUseCurrentLocation()} disabled={locationLoading}>
          <AppIcon name="pin" size={14} />
          {locationLoading ? 'Getting GPS...' : 'Use GPS'}
        </button>
      </div>

      <div className={styles.searchBox}>
        <label htmlFor={searchInputId}>Type a Delhi place or address</label>
        <div className={styles.searchInputWrap}>
          <AppIcon name="map" size={17} />
          <input
            id={searchInputId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 140)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && suggestions[0]) {
                event.preventDefault();
                selectSuggestion(suggestions[0]);
              }
            }}
            placeholder="Search Okhla, AIIMS, Shahdara..."
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls={`${searchInputId}-suggestions`}
          />
        </div>

        {showSuggestions ? (
          <div className={styles.suggestions} id={`${searchInputId}-suggestions`} role="listbox">
            {suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className={styles.suggestionButton}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                  role="option"
                  aria-selected={location?.address === suggestion.location.address}
                >
                  <span className={styles.suggestionIcon}><AppIcon name="pin" size={15} /></span>
                  <span>
                    <strong>{suggestion.label}</strong>
                    <small>{suggestion.location.address || suggestion.district}</small>
                  </span>
                </button>
              ))
            ) : (
              <div className={styles.noSuggestions}>No saved Delhi match yet.</div>
            )}

            {canUseTypedAddress ? (
              <button
                type="button"
                className={styles.useTypedButton}
                onMouseDown={(event) => event.preventDefault()}
                onClick={useTypedAddress}
              >
                <AppIcon name="route" size={15} />
                Use typed address: <strong>{trimmedQuery}</strong>
              </button>
            ) : null}
          </div>
        ) : null}
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
        Search uses demo-safe Delhi coordinates. Typed addresses without a saved match are pinned near central Delhi for review.
      </p>
    </div>
  );
}

export default LocationPresetPicker;
