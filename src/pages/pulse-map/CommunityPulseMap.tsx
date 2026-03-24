/**
 * Community Pulse Map Page
 * PRD: 5.2 Community Pulse Map - Real-Time Needs Intelligence Layer
 * 
 * Features:
 * - Google Maps with H3 hexagonal grid overlay
 * - Multiple toggleable layers (active, in-progress, resolved)
 * - Hexagon detail panel
 * - Privacy fuzzing (500m radius)
 * - Real-time updates
 */

import { useEffect, useState, useRef } from 'react';
import { getMapLayers, getHexagonDetails } from '../../services/api';
import { CategoryMetadata } from '../../types';
import type { MapLayersResponse, HexagonData } from '../../types';
import styles from './CommunityPulseMap.module.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Map layer colors by urgency
const URGENCY_COLORS = {
  critical: '#DC2626', // Red
  high: '#EA580C', // Orange
  medium: '#F59E0B', // Amber
  low: '#10B981', // Green
};

// Map layer colors by status
const STATUS_COLORS = {
  active: '#DC2626',
  inProgress: '#F59E0B',
  resolved: '#10B981',
};

interface LayerToggle {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
}

export function CommunityPulseMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapData, setMapData] = useState<MapLayersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHexagon, setSelectedHexagon] = useState<HexagonData | null>(null);
  const [hexagonPolygons, setHexagonPolygons] = useState<google.maps.Polygon[]>([]);
  
  const [layers, setLayers] = useState<LayerToggle[]>([
    { id: 'active', name: '🔴 Active Needs', enabled: true, color: STATUS_COLORS.active },
    { id: 'inProgress', name: '🟡 In Progress', enabled: true, color: STATUS_COLORS.inProgress },
    { id: 'resolved', name: '🟢 Resolved', enabled: false, color: STATUS_COLORS.resolved },
  ]);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current || map || !GOOGLE_MAPS_API_KEY) return;

    // Simple script loading approach
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const mapInstance = new google.maps.Map(mapRef.current!, {
        center: { lat: 20.5937, lng: 78.9629 }, // India center
        zoom: 5,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
        mapTypeControl: true,
        fullscreenControl: true,
        streetViewControl: false,
      });

      setMap(mapInstance);
    };
    script.onerror = () => {
      setError('Failed to load Google Maps. Please check your API key.');
    };
    
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [map]);

  // Load map data
  useEffect(() => {
    loadMapData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMapData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Render hexagons when map or data changes
  useEffect(() => {
    if (map && mapData) {
      renderHexagons();
    }
  }, [map, mapData, layers]);

  async function loadMapData() {
    try {
      setLoading(true);
      const result = await getMapLayers();
      
      if (result.success && result.data) {
        setMapData(result.data);
        
        // Center map on data
        if (map && result.data.centerPoint) {
          map.setCenter(result.data.centerPoint);
          map.setZoom(8);
        }
      } else {
        setError(result.error?.message || 'Failed to load map data');
      }
    } catch (err: any) {
      console.error('Map data error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function renderHexagons() {
    if (!map || !mapData) return;

    // Clear existing polygons
    hexagonPolygons.forEach(polygon => polygon.setMap(null));
    const newPolygons: google.maps.Polygon[] = [];

    // Render each enabled layer
    layers.forEach(layer => {
      if (!layer.enabled) return;

      const layerData = mapData[layer.id as keyof MapLayersResponse];
      if (!layerData || typeof layerData !== 'object' || !('hexagons' in layerData)) return;

      layerData.hexagons.forEach((hex: HexagonData) => {
        const paths = hex.boundary.map(([lng, lat]) => ({ lat, lng }));

        // Color by urgency
        const fillColor = URGENCY_COLORS[hex.dominantUrgency as keyof typeof URGENCY_COLORS] || '#6B7280';
        const strokeColor = layer.color;

        const polygon = new google.maps.Polygon({
          paths,
          strokeColor,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor,
          fillOpacity: 0.5,
          map,
        });

        // Click handler
        polygon.addListener('click', async () => {
          await handleHexagonClick(hex.hexId);
        });

        // Hover effect
        polygon.addListener('mouseover', () => {
          polygon.setOptions({ fillOpacity: 0.7, strokeWeight: 3 });
        });

        polygon.addListener('mouseout', () => {
          polygon.setOptions({ fillOpacity: 0.5, strokeWeight: 2 });
        });

        newPolygons.push(polygon);
      });
    });

    setHexagonPolygons(newPolygons);
  }

  async function handleHexagonClick(hexId: string) {
    try {
      const result = await getHexagonDetails(hexId);
      
      if (result.success && result.data) {
        setSelectedHexagon(result.data);
      }
    } catch (err) {
      console.error('Failed to load hexagon details:', err);
    }
  }

  function toggleLayer(layerId: string) {
    setLayers(layers.map(layer =>
      layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
    ));
  }

  function closeDetailPanel() {
    setSelectedHexagon(null);
  }

  return (
    <div className={styles.container}>
      {/* Map */}
      <div ref={mapRef} className={styles.map} />

      {/* Loading overlay */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <p>Loading map data...</p>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className={styles.errorOverlay}>
          <div className={styles.errorBox}>
            <h3>⚠️ Error</h3>
            <p>{error}</p>
            <button onClick={loadMapData}>Retry</button>
          </div>
        </div>
      )}

      {/* Layer controls */}
      <div className={styles.layerControls}>
        <h3>Map Layers</h3>
        {layers.map(layer => (
          <label key={layer.id} className={styles.layerToggle}>
            <input
              type="checkbox"
              checked={layer.enabled}
              onChange={() => toggleLayer(layer.id)}
            />
            <span>{layer.name}</span>
          </label>
        ))}
        
        <div className={styles.stats}>
          {mapData && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Active:</span>
                <span className={styles.statValue}>{mapData.active.totalNeeds}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>In Progress:</span>
                <span className={styles.statValue}>{mapData.inProgress.totalNeeds}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Resolved:</span>
                <span className={styles.statValue}>{mapData.resolved.totalNeeds}</span>
              </div>
            </>
          )}
        </div>

        <button className={styles.refreshButton} onClick={loadMapData}>
          🔄 Refresh Data
        </button>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <h4>Urgency Levels</h4>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: URGENCY_COLORS.critical }} />
          <span>Critical</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: URGENCY_COLORS.high }} />
          <span>High</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: URGENCY_COLORS.medium }} />
          <span>Medium</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ background: URGENCY_COLORS.low }} />
          <span>Low</span>
        </div>
      </div>

      {/* Hexagon detail panel */}
      {selectedHexagon && (
        <div className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <h3>Hexagon Details</h3>
            <button className={styles.closeButton} onClick={closeDetailPanel}>
              ✕
            </button>
          </div>

          <div className={styles.detailContent}>
            <div className={styles.detailStat}>
              <span className={styles.detailLabel}>Active Needs:</span>
              <span className={styles.detailValue}>{selectedHexagon.needCount}</span>
            </div>

            <div className={styles.detailStat}>
              <span className={styles.detailLabel}>Dominant Category:</span>
              <span className={styles.detailValue}>
                {CategoryMetadata[selectedHexagon.dominantCategory as keyof typeof CategoryMetadata]?.emoji}{' '}
                {CategoryMetadata[selectedHexagon.dominantCategory as keyof typeof CategoryMetadata]?.label}
              </span>
            </div>

            <div className={styles.detailStat}>
              <span className={styles.detailLabel}>Urgency Level:</span>
              <span 
                className={styles.urgencyBadge}
                style={{ background: URGENCY_COLORS[selectedHexagon.dominantUrgency as keyof typeof URGENCY_COLORS] }}
              >
                {selectedHexagon.dominantUrgency.toUpperCase()}
              </span>
            </div>

            <div className={styles.detailStat}>
              <span className={styles.detailLabel}>Nearby Volunteers:</span>
              <span className={styles.detailValue}>{selectedHexagon.nearbyVolunteers}</span>
            </div>

            <div className={styles.detailStat}>
              <span className={styles.detailLabel}>Assigned NGOs:</span>
              <span className={styles.detailValue}>{selectedHexagon.assignedNgos.length}</span>
            </div>

            <div className={styles.categoriesBreakdown}>
              <h4>Categories Breakdown:</h4>
              {Object.entries(selectedHexagon.categories).map(([cat, count]) => (
                <div key={cat} className={styles.categoryRow}>
                  <span>{CategoryMetadata[cat as keyof typeof CategoryMetadata]?.emoji} {CategoryMetadata[cat as keyof typeof CategoryMetadata]?.label}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>

            <div className={styles.reportsSection}>
              <h4>Recent Reports ({selectedHexagon.reports.length}):</h4>
              <div className={styles.reportsList}>
                {selectedHexagon.reports.slice(0, 5).map((report) => (
                  <div key={report.id} className={styles.reportCard}>
                    <div className={styles.reportHeader}>
                      <span className={styles.reportCategory}>
                        {CategoryMetadata[report.category as keyof typeof CategoryMetadata]?.emoji}
                      </span>
                      <span 
                        className={styles.reportUrgency}
                        style={{ color: URGENCY_COLORS[report.urgency as keyof typeof URGENCY_COLORS] }}
                      >
                        {report.urgency}
                      </span>
                    </div>
                    <div className={styles.reportInfo}>
                      <span>{report.estimatedPeopleAffected} people affected</span>
                      <span className={styles.reportTime}>
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunityPulseMap;
