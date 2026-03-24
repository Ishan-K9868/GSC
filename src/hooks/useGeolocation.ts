/**
 * useGeolocation Hook
 * PRD: 5.1.1 Voice-First Intake - GPS auto-capture
 * 
 * Handles getting the user's current location using the Geolocation API.
 */

import { useState, useCallback, useEffect } from 'react';
import type { Location } from '../types';

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

interface UseGeolocationReturn {
  location: Location | null;
  loading: boolean;
  error: string | null;
  getLocation: () => Promise<Location | null>;
  isSupported: boolean;
}

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watchPosition = false,
  } = options;

  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  // Get current position
  const getLocation = useCallback(async (): Promise<Location | null> => {
    if (!isSupported) {
      setError('Geolocation is not supported in this browser');
      return null;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          // Try to get address using reverse geocoding
          try {
            const address = await reverseGeocode(loc.latitude, loc.longitude);
            if (address) {
              loc.address = address.formatted;
              loc.district = address.district;
              loc.state = address.state;
              loc.pincode = address.pincode;
            }
          } catch {
            // Reverse geocoding failed - continue with coords only
          }

          setLocation(loc);
          setLoading(false);
          resolve(loc);
        },
        (err) => {
          let errorMessage = 'Failed to get location';
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }

          setError(errorMessage);
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    });
  }, [isSupported, enableHighAccuracy, timeout, maximumAge]);

  // Watch position changes
  useEffect(() => {
    if (!watchPosition || !isSupported) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        console.warn('Watch position error:', err);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [watchPosition, isSupported, enableHighAccuracy, timeout, maximumAge]);

  return {
    location,
    loading,
    error,
    getLocation,
    isSupported,
  };
}

// Reverse geocode coordinates to address
async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ formatted: string; district?: string; state?: string; pincode?: string } | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    // Fallback: Use OpenStreetMap Nominatim (free, no API key)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SevaSetu/1.0',
          },
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const address = data.address || {};
      
      return {
        formatted: data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        district: address.county || address.city || address.town,
        state: address.state,
        pincode: address.postcode,
      };
    } catch {
      return null;
    }
  }

  // Use Google Maps Geocoding API
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results?.length) return null;
    
    const result = data.results[0];
    const components = result.address_components || [];
    
    const findComponent = (types: string[]): string | undefined => {
      const comp = components.find((c: any) => 
        types.some(t => c.types.includes(t))
      );
      return comp?.long_name;
    };
    
    return {
      formatted: result.formatted_address,
      district: findComponent(['administrative_area_level_2', 'locality']),
      state: findComponent(['administrative_area_level_1']),
      pincode: findComponent(['postal_code']),
    };
  } catch {
    return null;
  }
}

// Format coordinates for display
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}
