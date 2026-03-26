import { useEffect, useMemo, useRef, useState } from 'react';
import { AppIcon } from '../../components/shared';
import styles from './CommunityPulseMap.module.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

type StatusKey = 'active' | 'in_progress' | 'resolved';
type UrgencyKey = 'critical' | 'high' | 'medium' | 'low';

type Cluster = {
  id: string;
  area: string;
  district: string;
  lat: number;
  lng: number;
  category: string;
  status: StatusKey;
  urgency: UrgencyKey;
  needs: number;
  households: number;
  ngo: string;
  volunteerLead: string;
  responseEta: string;
  notes: string;
};

type Hub = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'ngo_hub' | 'medical_store' | 'volunteer_base';
};

const statusConfig = {
  active: { label: 'Active', color: '#D4622A' },
  in_progress: { label: 'In Progress', color: '#D4921A' },
  resolved: { label: 'Resolved', color: '#2D9D78' },
};

const urgencyConfig = {
  critical: { label: 'Critical', color: '#B73A1E' },
  high: { label: 'High', color: '#D4622A' },
  medium: { label: 'Medium', color: '#D4921A' },
  low: { label: 'Low', color: '#2D9D78' },
};

const delhiClusters: Cluster[] = [
  {
    id: 'okhla-shelter',
    area: 'Okhla',
    district: 'South East Delhi',
    lat: 28.5453,
    lng: 77.2734,
    category: 'Shelter',
    status: 'active',
    urgency: 'critical',
    needs: 6,
    households: 44,
    ngo: 'Night Relief Collective',
    volunteerLead: 'Farah Khan',
    responseEta: '9 min',
    notes: 'Night shelter queue expanded after rain displacement near river-edge settlements.',
  },
  {
    id: 'seelampur-water',
    area: 'Seelampur',
    district: 'North East Delhi',
    lat: 28.6729,
    lng: 77.2691,
    category: 'Water & Sanitation',
    status: 'active',
    urgency: 'high',
    needs: 5,
    households: 31,
    ngo: 'Jal Doot Foundation',
    volunteerLead: 'Arjun Dabas',
    responseEta: '18 min',
    notes: 'Tankers delayed; community taps below normal output since morning.',
  },
  {
    id: 'mustafabad-health',
    area: 'Mustafabad',
    district: 'North East Delhi',
    lat: 28.6967,
    lng: 77.2861,
    category: 'Health',
    status: 'in_progress',
    urgency: 'high',
    needs: 4,
    households: 19,
    ngo: 'Sehat Saathi Trust',
    volunteerLead: 'Saba Parveen',
    responseEta: '22 min',
    notes: 'Fever-medicine restock underway; two paediatric cases escalated for home follow-up.',
  },
  {
    id: 'yamuna-vihar-food',
    area: 'Yamuna Vihar',
    district: 'North East Delhi',
    lat: 28.7052,
    lng: 77.2846,
    category: 'Food & Nutrition',
    status: 'active',
    urgency: 'high',
    needs: 3,
    households: 26,
    ngo: 'Delhi Community Kitchen Network',
    volunteerLead: 'Nidhi Batra',
    responseEta: '24 min',
    notes: 'Cooked-meal line increased after midday school kitchen disruption.',
  },
  {
    id: 'bhajanpura-maternal',
    area: 'Bhajanpura',
    district: 'North East Delhi',
    lat: 28.7041,
    lng: 77.2668,
    category: 'Women & Child',
    status: 'in_progress',
    urgency: 'critical',
    needs: 2,
    households: 8,
    ngo: 'Sakhi Suraksha Line',
    volunteerLead: 'Meenal Joshi',
    responseEta: '14 min',
    notes: 'Maternal-care support paired with privacy-safe case handling.',
  },
  {
    id: 'lajpat-medicines',
    area: 'Lajpat Nagar',
    district: 'South East Delhi',
    lat: 28.5677,
    lng: 77.2434,
    category: 'Health',
    status: 'in_progress',
    urgency: 'medium',
    needs: 3,
    households: 13,
    ngo: 'City Health Van',
    volunteerLead: 'Aman Malik',
    responseEta: '31 min',
    notes: 'Medicine pickup corridor steady; waiting on second courier wave.',
  },
  {
    id: 'sarita-vihar-water',
    area: 'Sarita Vihar',
    district: 'South East Delhi',
    lat: 28.5337,
    lng: 77.2912,
    category: 'Water & Sanitation',
    status: 'resolved',
    urgency: 'low',
    needs: 1,
    households: 11,
    ngo: 'Aapda Jal Response',
    volunteerLead: 'Ruchi Nanda',
    responseEta: 'Resolved',
    notes: 'Temporary purifier station restored and verified by field team.',
  },
  {
    id: 'rohini-food',
    area: 'Rohini',
    district: 'North West Delhi',
    lat: 28.7494,
    lng: 77.0565,
    category: 'Food & Nutrition',
    status: 'active',
    urgency: 'medium',
    needs: 2,
    households: 17,
    ngo: 'North Grid Relief Circle',
    volunteerLead: 'Tushar Yadav',
    responseEta: '36 min',
    notes: 'Weekend ration support required for migrant households near pocket clusters.',
  },
  {
    id: 'dwarka-eldercare',
    area: 'Dwarka',
    district: 'South West Delhi',
    lat: 28.5921,
    lng: 77.0460,
    category: 'Health',
    status: 'resolved',
    urgency: 'low',
    needs: 1,
    households: 6,
    ngo: 'Urban Care Link',
    volunteerLead: 'Karan Sethi',
    responseEta: 'Resolved',
    notes: 'Eldercare medicine handover completed and follow-up call scheduled.',
  },
];

const supportHubs: Hub[] = [
  { id: 'hub-kashmere', name: 'Kashmere Gate Response Hub', lat: 28.6677, lng: 77.2289, type: 'ngo_hub' },
  { id: 'hub-lajpat', name: 'Lajpat Medicine Node', lat: 28.5704, lng: 77.2396, type: 'medical_store' },
  { id: 'hub-dwarka', name: 'Dwarka Volunteer Base', lat: 28.5880, lng: 77.0438, type: 'volunteer_base' },
];

function buildMarkerIcon(fill: string, stroke: string, glyph: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 54 54" fill="none">
      <circle cx="27" cy="27" r="20" fill="${fill}" fill-opacity="0.94" stroke="${stroke}" stroke-width="2.5" />
      <circle cx="27" cy="27" r="24" stroke="${fill}" stroke-opacity="0.22" stroke-width="4" />
      <path d="${glyph}" fill="${stroke}" />
    </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(54, 54),
    anchor: new google.maps.Point(27, 27),
  };
}

function getClusterGlyph(category: string) {
  switch (category) {
    case 'Shelter':
      return 'M18 28.8 27 21l9 7.8v10.7h-4.6v-6.8h-8.8v6.8H18z';
    case 'Water & Sanitation':
      return 'M27 18c4.8 6 8.2 10.4 8.2 14.1A8.2 8.2 0 1 1 18.8 32c0-3.7 3.4-8.2 8.2-14Z';
    case 'Food & Nutrition':
      return 'M20.5 18.5v9.2M24 18.5v9.2M27.5 18.5v9.2M31 18.5v9.2M21.8 29.8c1.2 4.6 3.1 7.2 5.2 7.2s4-2.6 5.2-7.2Z';
    default:
      return 'M27 17a7.5 7.5 0 0 1 7.5 7.5v4.5h2v3h-19v-3h2v-4.5A7.5 7.5 0 0 1 27 17Zm0 21.5a3.2 3.2 0 0 0 3.1-2.5h-6.2a3.2 3.2 0 0 0 3.1 2.5Z';
  }
}

function getHubGlyph(type: Hub['type']) {
  switch (type) {
    case 'ngo_hub':
      return 'M18 26.5 27 20l9 6.5v12H18z';
    case 'medical_store':
      return 'M24.5 18.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z';
    default:
      return 'M27 17a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-10 19.5c1.5-2.9 4.8-4.8 10-4.8s8.5 2 10 4.8';
  }
}

export function CommunityPulseMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const [selectedId, setSelectedId] = useState(delhiClusters[0].id);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<StatusKey, boolean>>({
    active: true,
    in_progress: true,
    resolved: true,
  });

  const filteredClusters = useMemo(
    () => delhiClusters.filter((cluster) => filters[cluster.status]),
    [filters]
  );

  const selectedCluster = useMemo(
    () => filteredClusters.find((cluster) => cluster.id === selectedId) || filteredClusters[0] || delhiClusters[0],
    [filteredClusters, selectedId]
  );

  const totals = useMemo(() => {
    const activeCases = filteredClusters.reduce((sum, item) => sum + item.needs, 0);
    const households = filteredClusters.reduce((sum, item) => sum + item.households, 0);
    const critical = filteredClusters.filter((item) => item.urgency === 'critical').length;
    return { activeCases, households, critical };
  }, [filteredClusters]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps key missing. The Delhi atlas layout still loads, but live cartography is unavailable.');
      return;
    }

    if ((window as any).google?.maps && mapRef.current && !mapInstance.current) {
      initialiseMap();
      return;
    }

    const existing = document.getElementById('sevasetu-maps-script');
    if (existing) return;

    const script = document.createElement('script');
    script.id = 'sevasetu-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = initialiseMap;
    script.onerror = () => setError('Google Maps failed to load. Check the API key or billing settings.');
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !ready) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    circlesRef.current.forEach((circle) => circle.setMap(null));
    markersRef.current = [];
    circlesRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    filteredClusters.forEach((cluster) => {
      const urgency = urgencyConfig[cluster.urgency];
      const status = statusConfig[cluster.status];
      const marker = new google.maps.Marker({
        map: mapInstance.current,
        position: { lat: cluster.lat, lng: cluster.lng },
        title: `${cluster.area} · ${cluster.category}`,
        icon: buildMarkerIcon(urgency.color, '#1C0E06', getClusterGlyph(cluster.category)),
        label: {
          text: cluster.area,
          color: '#1C0E06',
          fontSize: '12px',
          fontWeight: '700',
          className: styles.markerLabel,
        },
      });

      const circle = new google.maps.Circle({
        map: mapInstance.current,
        center: { lat: cluster.lat, lng: cluster.lng },
        radius: cluster.urgency === 'critical' ? 900 : cluster.urgency === 'high' ? 700 : 550,
        strokeColor: status.color,
        strokeOpacity: 0.52,
        strokeWeight: 1.5,
        fillColor: urgency.color,
        fillOpacity: cluster.id === selectedCluster?.id ? 0.14 : 0.08,
      });

      marker.addListener('click', () => setSelectedId(cluster.id));
      circle.addListener('click', () => setSelectedId(cluster.id));

      markersRef.current.push(marker);
      circlesRef.current.push(circle);
      bounds.extend({ lat: cluster.lat, lng: cluster.lng });
    });

    supportHubs.forEach((hub) => {
      const marker = new google.maps.Marker({
        map: mapInstance.current,
        position: { lat: hub.lat, lng: hub.lng },
        title: hub.name,
        icon: buildMarkerIcon('#2D9D78', '#F5EDE0', getHubGlyph(hub.type)),
      });
      markersRef.current.push(marker);
      bounds.extend({ lat: hub.lat, lng: hub.lng });
    });

    if (!bounds.isEmpty()) {
      mapInstance.current.fitBounds(bounds, 80);
      mapInstance.current.setZoom(Math.min(mapInstance.current.getZoom() || 11, 11));
    }
  }, [filteredClusters, ready, selectedCluster?.id]);

  function initialiseMap() {
    if (!mapRef.current || mapInstance.current || !(window as any).google?.maps) return;

    mapInstance.current = new google.maps.Map(mapRef.current, {
      center: { lat: 28.6139, lng: 77.209 },
      zoom: 11,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      gestureHandling: 'greedy',
      zoomControl: true,
      styles: [
        { featureType: 'administrative.country', stylers: [{ visibility: 'off' }] },
        { featureType: 'administrative.province', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#d7c2a6' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b2d9d0' }] },
      ],
    });
    setReady(true);
  }

  function toggleFilter(key: StatusKey) {
    setFilters((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>Delhi Operations Atlas</div>
          <h2>
            Delhi-focused field visibility,
            <br />
            not a full-country demo map.
          </h2>
          <p>
            The atlas is now pinned to believable Delhi neighbourhoods and uses a tighter operational layout so filters,
            labels, and decision context stay visible while the map remains readable.
          </p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span>Visible cases</span>
            <strong>{totals.activeCases}</strong>
          </div>
          <div className={styles.heroStat}>
            <span>Households</span>
            <strong>{totals.households}</strong>
          </div>
          <div className={styles.heroStat}>
            <span>Critical clusters</span>
            <strong>{totals.critical}</strong>
          </div>
        </div>
      </section>

      <section className={styles.workspace}>
        <aside className={styles.rail}>
          <div className={styles.panel}>
            <div className={styles.panelHeading}>
              <AppIcon name="layers" size={16} />
              Incident layers
            </div>
            <div className={styles.filterList}>
              {(Object.keys(statusConfig) as StatusKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.filterChip} ${filters[key] ? styles.filterChipActive : ''}`}
                  onClick={() => toggleFilter(key)}
                >
                  <span className={styles.filterSwatch} style={{ background: statusConfig[key].color }} />
                  {statusConfig[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeading}>
              <AppIcon name="alert" size={16} />
              Area watchlist
            </div>
            <div className={styles.clusterList}>
              {filteredClusters.map((cluster) => (
                <button
                  key={cluster.id}
                  type="button"
                  className={`${styles.clusterRow} ${selectedCluster?.id === cluster.id ? styles.clusterRowActive : ''}`}
                  onClick={() => setSelectedId(cluster.id)}
                >
                  <div>
                    <strong>{cluster.area}</strong>
                    <span>{cluster.category} · {cluster.district}</span>
                  </div>
                  <div className={styles.clusterMeta}>
                    <span>{cluster.needs} alerts</span>
                    <small>{cluster.responseEta}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeading}>
              <AppIcon name="shield" size={16} />
              Coverage notes
            </div>
            <ul className={styles.notesList}>
              <li>North East Delhi shows the highest density of water and child-health pressure.</li>
              <li>Okhla remains the fastest-moving shelter cluster and should stay on top of the command queue.</li>
              <li>Three support hubs are plotted so operators can see route support, not only distress points.</li>
            </ul>
          </div>
        </aside>

        <div className={styles.mapStage}>
          <div className={styles.mapHeader}>
            <div>
              <div className={styles.panelHeading}>
                <AppIcon name="map" size={16} />
                Live cartography
              </div>
              <p>Believable Delhi mock data, labelled neighbourhoods, and NGO support nodes.</p>
            </div>
            <div className={styles.legendInline}>
              {(Object.keys(urgencyConfig) as UrgencyKey[]).map((key) => (
                <span key={key} className={styles.legendChip}>
                  <span className={styles.filterSwatch} style={{ background: urgencyConfig[key].color }} />
                  {urgencyConfig[key].label}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.mapWrap}>
            <div ref={mapRef} className={styles.mapCanvas} />
            {!GOOGLE_MAPS_API_KEY ? (
              <div className={styles.mapOverlayMessage}>Map key unavailable. Use the area watchlist and incident drawer meanwhile.</div>
            ) : null}
            {error ? <div className={styles.mapOverlayMessage}>{error}</div> : null}
          </div>
        </div>

        <aside className={styles.detailColumn}>
          <div className={styles.panelLarge}>
            <div className={styles.detailTop}>
              <div>
                <div className={styles.eyebrow}>Selected cluster</div>
                <h3>{selectedCluster.area}</h3>
                <p>{selectedCluster.district}</p>
              </div>
              <span className={styles.urgencyBadge} style={{ background: urgencyConfig[selectedCluster.urgency].color }}>
                {urgencyConfig[selectedCluster.urgency].label}
              </span>
            </div>

            <div className={styles.metricGrid}>
              <div>
                <span>Open alerts</span>
                <strong>{selectedCluster.needs}</strong>
              </div>
              <div>
                <span>Households</span>
                <strong>{selectedCluster.households}</strong>
              </div>
              <div>
                <span>Response ETA</span>
                <strong>{selectedCluster.responseEta}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{statusConfig[selectedCluster.status].label}</strong>
              </div>
            </div>

            <div className={styles.storyBlock}>
              <strong>{selectedCluster.category}</strong>
              <p>{selectedCluster.notes}</p>
            </div>

            <div className={styles.assignmentBlock}>
              <div>
                <span>Assigned NGO</span>
                <strong>{selectedCluster.ngo}</strong>
              </div>
              <div>
                <span>Volunteer lead</span>
                <strong>{selectedCluster.volunteerLead}</strong>
              </div>
            </div>
          </div>

          <div className={styles.panelLarge}>
            <div className={styles.panelHeading}>
              <AppIcon name="network" size={16} />
              Support nodes on map
            </div>
            <div className={styles.hubList}>
              {supportHubs.map((hub) => (
                <div key={hub.id} className={styles.hubRow}>
                  <span className={styles.hubIcon}>
                    <AppIcon name={hub.type === 'ngo_hub' ? 'network' : hub.type === 'medical_store' ? 'shield' : 'volunteer'} size={16} />
                  </span>
                  <div>
                    <strong>{hub.name}</strong>
                    <span>{hub.type.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default CommunityPulseMap;
