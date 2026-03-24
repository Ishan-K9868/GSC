/**
 * Location Picker Component
 * 
 * Features:
 * - Google Maps integration for visual location selection
 * - GPS auto-capture with reverse geocoding
 * - Manual address search
 * - Marker drag for precise location
 */

import { useState, useRef, useEffect } from 'react';
import { useGeolocation } from '../../../hooks/useGeolocation';
import type { Location } from '../../../types';
import styles from './LocationPicker.module.css';

interface LocationPickerProps {
  value?: Location | null;
  onChange: (location: Location) => void;
  onClose?: () => void;
  showMap?: boolean;
}

// Note: In production, use @react-google-maps/api
// For now, we'll create a simpler fallback that works without API key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export function LocationPicker({ 
  value, 
  onChange, 
  onClose,
  showMap = true 
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [manualCoords, setManualCoords] = useState({
    lat: value?.latitude?.toString() || '',
    lng: value?.longitude?.toString() || '',
  });
  const [activeTab, setActiveTab] = useState<'gps' | 'search' | 'manual'>('gps');
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const {
    location: gpsLocation,
    loading: gpsLoading,
    error: gpsError,
    getLocation,
    isSupported: geoSupported,
  } = useGeolocation();

  // Initialize map if Google Maps API is available
  useEffect(() => {
    if (!showMap || !GOOGLE_MAPS_API_KEY || !mapRef.current) return;
    if (typeof google === 'undefined' || !google.maps) return;

    const center = value 
      ? { lat: value.latitude, lng: value.longitude }
      : { lat: 20.5937, lng: 78.9629 }; // Center of India

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: value ? 15 : 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const marker = new google.maps.Marker({
      position: center,
      map,
      draggable: true,
    });

    // Handle marker drag
    marker.addListener('dragend', async () => {
      const position = marker.getPosition();
      if (position) {
        const newLocation = await reverseGeocode(position.lat(), position.lng());
        onChange(newLocation);
      }
    });

    // Handle map click
    map.addListener('click', async (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        marker.setPosition(e.latLng);
        const newLocation = await reverseGeocode(e.latLng.lat(), e.latLng.lng());
        onChange(newLocation);
      }
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.setMap(null);
    };
  }, [showMap, GOOGLE_MAPS_API_KEY]);

  // Update map when value changes
  useEffect(() => {
    if (value && mapInstanceRef.current && markerRef.current) {
      const position = { lat: value.latitude, lng: value.longitude };
      mapInstanceRef.current.panTo(position);
      mapInstanceRef.current.setZoom(15);
      markerRef.current.setPosition(position);
    }
  }, [value]);

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat: number, lng: number): Promise<Location> => {
    const location: Location = {
      latitude: lat,
      longitude: lng,
    };

    try {
      // Use Nominatim for reverse geocoding (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        location.address = data.display_name;
        
        if (data.address) {
          location.district = data.address.county || data.address.city_district || data.address.city;
          location.state = data.address.state;
          location.pincode = data.address.postcode;
        }
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }

    return location;
  };

  // Handle GPS location button
  const handleUseGPS = async () => {
    const loc = await getLocation();
    if (loc) {
      onChange(loc);
    }
  };

  // Apply GPS location
  useEffect(() => {
    if (gpsLocation && activeTab === 'gps') {
      onChange(gpsLocation);
    }
  }, [gpsLocation, activeTab]);

  // Search for address
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Use Nominatim for address search
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Select search result
  const handleSelectResult = async (result: any) => {
    const location: Location = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      address: result.display_name,
    };

    if (result.address) {
      location.district = result.address.county || result.address.city_district || result.address.city;
      location.state = result.address.state;
      location.pincode = result.address.postcode;
    }

    onChange(location);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Handle manual coordinates
  const handleManualSubmit = async () => {
    const lat = parseFloat(manualCoords.lat);
    const lng = parseFloat(manualCoords.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return;
    }

    const location = await reverseGeocode(lat, lng);
    onChange(location);
  };

  // Confirm and close
  const handleConfirm = () => {
    if (value) {
      onClose?.();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Select Location / स्थान चुनें</h3>
        {onClose && (
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        )}
      </div>

      {/* Tab navigation */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'gps' ? styles.active : ''}`}
          onClick={() => setActiveTab('gps')}
        >
          GPS Auto
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'search' ? styles.active : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Search Address
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'manual' ? styles.active : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual Entry
        </button>
      </div>

      <div className={styles.content}>
        {/* GPS Tab */}
        {activeTab === 'gps' && (
          <div className={styles.gpsTab}>
            <p className={styles.description}>
              Automatically detect your current location using GPS.
            </p>
            
            <button
              className={styles.gpsButton}
              onClick={handleUseGPS}
              disabled={!geoSupported || gpsLoading}
            >
              {gpsLoading ? 'Getting Location...' : 'Use Current Location'}
            </button>

            {!geoSupported && (
              <p className={styles.error}>
                GPS is not supported in your browser.
              </p>
            )}

            {gpsError && (
              <p className={styles.error}>{gpsError}</p>
            )}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className={styles.searchTab}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Search for address, village, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? '...' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <ul className={styles.searchResults}>
                {searchResults.map((result, index) => (
                  <li 
                    key={index}
                    onClick={() => handleSelectResult(result)}
                  >
                    {result.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Manual Tab */}
        {activeTab === 'manual' && (
          <div className={styles.manualTab}>
            <p className={styles.description}>
              Enter coordinates directly if you know them.
            </p>
            
            <div className={styles.coordInputs}>
              <div className={styles.coordField}>
                <label>Latitude</label>
                <input
                  type="number"
                  placeholder="e.g., 28.6139"
                  value={manualCoords.lat}
                  onChange={(e) => setManualCoords(prev => ({ ...prev, lat: e.target.value }))}
                  step="any"
                  min="-90"
                  max="90"
                />
              </div>
              <div className={styles.coordField}>
                <label>Longitude</label>
                <input
                  type="number"
                  placeholder="e.g., 77.2090"
                  value={manualCoords.lng}
                  onChange={(e) => setManualCoords(prev => ({ ...prev, lng: e.target.value }))}
                  step="any"
                  min="-180"
                  max="180"
                />
              </div>
            </div>
            
            <button
              className={styles.manualButton}
              onClick={handleManualSubmit}
            >
              Set Location
            </button>
          </div>
        )}

        {/* Map (if enabled and API key provided) */}
        {showMap && GOOGLE_MAPS_API_KEY && (
          <div className={styles.mapContainer}>
            <div ref={mapRef} className={styles.map} />
          </div>
        )}

        {/* Current Location Display */}
        {value && (
          <div className={styles.currentLocation}>
            <h4>Selected Location:</h4>
            <p className={styles.address}>
              {value.address || `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`}
            </p>
            {value.district && <p className={styles.detail}>District: {value.district}</p>}
            {value.state && <p className={styles.detail}>State: {value.state}</p>}
            {value.pincode && <p className={styles.detail}>Pincode: {value.pincode}</p>}
          </div>
        )}
      </div>

      {/* Confirm Button */}
      <div className={styles.footer}>
        <button
          className={styles.confirmButton}
          onClick={handleConfirm}
          disabled={!value}
        >
          Confirm Location
        </button>
      </div>
    </div>
  );
}
