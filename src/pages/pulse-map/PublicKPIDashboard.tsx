import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { db } from '../../config/firebase';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

type NeedReport = {
  id: string;
  category: string;
  status: string;
  urgency?: string;
  urgencyScore?: number;
  estimatedPeopleAffected?: number;
  createdAt?: string | { toMillis?: () => number; seconds?: number };
  updatedAt?: string | { toMillis?: () => number; seconds?: number };
  resolvedAt?: string | { toMillis?: () => number; seconds?: number };
  location?: {
    latitude?: number;
    longitude?: number;
    district?: string;
    state?: string;
    address?: string;
  };
};

type DispatchTask = {
  id: string;
  status?: string;
  needReportId?: string;
  verificationRejected?: boolean;
  reporterConfirmed?: boolean;
  createdAt?: string | { toMillis?: () => number; seconds?: number };
  updatedAt?: string | { toMillis?: () => number; seconds?: number };
};

function toMillis(value: NeedReport['createdAt'] | DispatchTask['createdAt']): number {
  if (!value) return Date.now();
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : Date.now();
  }
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return Date.now();
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
}

function formatCategory(value: string): string {
  return value.replace(/_/g, ' ');
}

function percentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function PublicKPIDashboard() {
  const { wardSlug } = useParams();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const [needReports, setNeedReports] = useState<NeedReport[]>([]);
  const [dispatchTasks, setDispatchTasks] = useState<DispatchTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!(db as any)?.app) {
      setError('Firebase is not configured for public KPI reads in this environment.');
      setLoading(false);
      return;
    }

    const reportsQuery = query(collection(db, 'needReports'), limit(500));
    const tasksQuery = query(collection(db, 'dispatchTasks'), limit(500));

    const unsubReports = onSnapshot(
      reportsQuery,
      (snapshot) => {
        setNeedReports(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as NeedReport)));
        setLoading(false);
      },
      (snapshotError) => {
        console.error('Public KPI need listener failed:', snapshotError);
        setError(snapshotError.message || 'Unable to load need metrics.');
        setLoading(false);
      }
    );

    const unsubTasks = onSnapshot(
      tasksQuery,
      (snapshot) => {
        setDispatchTasks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as DispatchTask)));
      },
      (snapshotError) => {
        console.error('Public KPI task listener failed:', snapshotError);
      }
    );

    return () => {
      unsubReports();
      unsubTasks();
    };
  }, []);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapRef.current) return;

    if ((window as any).google?.maps && !mapInstance.current) {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: { lat: 28.6139, lng: 77.209 },
        zoom: 10,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: 'administrative.country', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#d7c2a6' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b2d9d0' }] },
        ],
      });
      return;
    }

    const existing = document.getElementById('public-kpi-map-script');
    if (existing) return;

    const script = document.createElement('script');
    script.id = 'public-kpi-map-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (mapRef.current && !mapInstance.current) {
        mapInstance.current = new google.maps.Map(mapRef.current, {
          center: { lat: 28.6139, lng: 77.209 },
          zoom: 10,
          disableDefaultUI: true,
          zoomControl: true,
        });
      }
    };
    document.head.appendChild(script);
  }, []);

  const filteredReports = useMemo(() => {
    if (!wardSlug || wardSlug === 'live') return needReports;
    return needReports.filter((report) => {
      const district = report.location?.district || report.location?.state || '';
      return slugify(district) === wardSlug;
    });
  }, [needReports, wardSlug]);

  const filteredTasks = useMemo(() => {
    if (!wardSlug || wardSlug === 'live') return dispatchTasks;
    const validReportIds = new Set(filteredReports.map((report) => report.id));
    return dispatchTasks.filter((task) => task.needReportId && validReportIds.has(task.needReportId));
  }, [dispatchTasks, filteredReports, wardSlug]);

  const unresolvedReports = useMemo(
    () => filteredReports.filter((report) => !['resolved', 'cancelled'].includes(report.status)),
    [filteredReports]
  );

  const metrics = useMemo(() => {
    const totalNeeds = filteredReports.length;
    const resolvedNeeds = filteredReports.filter((report) => report.status === 'resolved').length;
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter((task) => task.status === 'completed').length;
    const escalatedTasks = filteredTasks.filter((task) => task.status === 'escalated').length;
    const verifiedPositiveTasks = filteredTasks.filter(
      (task) => task.status === 'completed' && !task.verificationRejected
    ).length;

    const resourceUtilizationRate = totalTasks > 0 ? ((completedTasks + unresolvedReports.length) / (totalTasks + unresolvedReports.length)) * 100 : 0;
    const demandCoverageRate = totalNeeds > 0 ? (resolvedNeeds / totalNeeds) * 100 : 0;
    const allocationAccuracyRate = totalTasks > 0 ? (verifiedPositiveTasks / totalTasks) * 100 : 0;
    const overflowRate = totalTasks > 0 ? (escalatedTasks / totalTasks) * 100 : 0;

    const responseByCategory = filteredReports.reduce<Record<string, number[]>>((acc, report) => {
      const endMs = report.status === 'resolved' ? toMillis(report.resolvedAt || report.updatedAt) : toMillis(report.updatedAt);
      const startMs = toMillis(report.createdAt);
      const hours = Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
      if (!acc[report.category]) acc[report.category] = [];
      acc[report.category].push(hours);
      return acc;
    }, {});

    const averageResponseByCategory = Object.entries(responseByCategory)
      .map(([category, values]) => ({
        category,
        avgHours: values.length > 0 ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.avgHours - a.avgHours)
      .slice(0, 6);

    const averageResponseTimeHours = averageResponseByCategory.length > 0
      ? Number((averageResponseByCategory.reduce((sum, item) => sum + item.avgHours, 0) / averageResponseByCategory.length).toFixed(2))
      : 0;

    return {
      resourceUtilizationRate,
      demandCoverageRate,
      averageResponseTimeHours,
      allocationAccuracyRate,
      overflowRate,
      unmetDemandCount: unresolvedReports.length,
      responseByCategory: averageResponseByCategory,
    };
  }, [filteredReports, filteredTasks, unresolvedReports.length]);

  useEffect(() => {
    if (!mapInstance.current) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    unresolvedReports.slice(0, 50).forEach((report) => {
      if (typeof report.location?.latitude !== 'number' || typeof report.location?.longitude !== 'number') return;

      const marker = new google.maps.Marker({
        map: mapInstance.current,
        position: { lat: report.location.latitude, lng: report.location.longitude },
        title: `${formatCategory(report.category)} · ${report.location.district || 'Unknown district'}`,
      });

      markersRef.current.push(marker);
      bounds.extend({ lat: report.location.latitude, lng: report.location.longitude });
    });

    if (!bounds.isEmpty()) {
      mapInstance.current.fitBounds(bounds, 60);
      mapInstance.current.setZoom(Math.min(mapInstance.current.getZoom() || 10, 12));
    }
  }, [unresolvedReports]);

  const lastUpdated = useMemo(() => {
    const latest = filteredReports.reduce((max, report) => Math.max(max, toMillis(report.updatedAt || report.createdAt)), 0);
    if (!latest) return 'Awaiting live updates';
    const diffMinutes = Math.max(0, Math.round((tick - latest) / (1000 * 60)));
    return diffMinutes === 0 ? 'Updated just now' : `Updated ${diffMinutes} min ago`;
  }, [filteredReports, tick]);

  const pageTitle = wardSlug && wardSlug !== 'live'
    ? `${wardSlug.replace(/-/g, ' ')} impact dashboard`
    : 'SevaSetu live impact dashboard';

  async function copyShareLink() {
    await navigator.clipboard.writeText(window.location.href);
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 10%, rgba(212,98,42,0.12), transparent 30%), radial-gradient(circle at 85% 15%, rgba(45,157,120,0.12), transparent 32%), var(--bg)',
        color: 'var(--text-primary)',
        padding: '1.2rem',
      }}
    >
      <section
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gap: '1rem',
        }}
      >
        <div
          style={{
            borderRadius: '32px',
            border: '1px solid var(--glass-border)',
            background: 'var(--surface-glass)',
            boxShadow: 'var(--shadow-lg)',
            padding: '1.2rem 1.25rem',
            display: 'grid',
            gap: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
                Public impact telemetry
              </div>
              <h1 style={{ marginTop: '0.3rem', fontFamily: 'Bricolage Grotesque, sans-serif', fontSize: 'clamp(2rem, 4vw, 3.8rem)', lineHeight: 0.96 }}>
                {pageTitle}
              </h1>
              <p style={{ marginTop: '0.45rem', maxWidth: '55ch', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Live response coverage, allocation quality, and unmet-demand pressure from the SevaSetu field graph.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '999px',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--glass-border)',
                  fontSize: '0.78rem',
                }}
              >
                <span style={{ width: '0.55rem', height: '0.55rem', borderRadius: '999px', background: 'var(--jade)', boxShadow: '0 0 0 6px rgba(45,157,120,0.12)' }} />
                {lastUpdated}
              </span>
              <button type="button" onClick={() => void copyShareLink()} style={{ borderRadius: '999px', border: '1px solid var(--glass-border)', background: 'var(--surface-1)', padding: '0.68rem 0.95rem', cursor: 'pointer' }}>
                Share
              </button>
              <button type="button" onClick={() => window.print()} style={{ borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, var(--accent), #c65423)', color: '#fff8f0', padding: '0.68rem 1rem', cursor: 'pointer' }}>
                Download PDF
              </button>
            </div>
          </div>

          {loading ? <p style={{ color: 'var(--text-subtle)' }}>Loading live impact metrics...</p> : null}
          {error ? <p style={{ color: '#A53A20' }}>{error}</p> : null}
        </div>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.85rem' }}>
          {[
            ['Resource utilization', percentage(metrics.resourceUtilizationRate)],
            ['Demand coverage', percentage(metrics.demandCoverageRate)],
            ['Avg response time', `${metrics.averageResponseTimeHours}h`],
            ['Allocation accuracy', percentage(metrics.allocationAccuracyRate)],
            ['Overflow rate', percentage(metrics.overflowRate)],
            ['Unmet demand', `${metrics.unmetDemandCount}`],
          ].map(([label, value]) => (
            <article
              key={label}
              style={{
                borderRadius: '26px',
                border: '1px solid var(--glass-border)',
                background: 'var(--surface-glass)',
                padding: '1rem',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-subtle)' }}>{label}</span>
              <strong style={{ display: 'block', marginTop: '0.5rem', fontFamily: 'Bricolage Grotesque, sans-serif', fontSize: '2rem', lineHeight: 0.95 }}>{value}</strong>
            </article>
          ))}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: '1rem' }}>
          <article
            style={{
              borderRadius: '28px',
              border: '1px solid var(--glass-border)',
              background: 'var(--surface-glass)',
              boxShadow: 'var(--shadow-md)',
              padding: '1rem',
              display: 'grid',
              gap: '0.85rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-subtle)' }}>Average response time by category</span>
              <h2 style={{ marginTop: '0.35rem', fontSize: '1.2rem' }}>Operational friction by service lane</h2>
            </div>
            <div style={{ display: 'grid', gap: '0.7rem' }}>
              {metrics.responseByCategory.map((item) => (
                <div key={item.category} style={{ display: 'grid', gap: '0.28rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.82rem' }}>
                    <span>{formatCategory(item.category)}</span>
                    <strong>{item.avgHours}h</strong>
                  </div>
                  <div style={{ height: '0.7rem', borderRadius: '999px', background: 'rgba(28,14,6,0.08)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, (item.avgHours / Math.max(metrics.averageResponseTimeHours || 1, 1)) * 55 + 20)}%`,
                        height: '100%',
                        borderRadius: 'inherit',
                        background: 'linear-gradient(90deg, #D4622A, #E7A54B)',
                      }}
                    />
                  </div>
                </div>
              ))}
              {metrics.responseByCategory.length === 0 ? <p style={{ color: 'var(--text-subtle)' }}>No response-time data available yet.</p> : null}
            </div>
          </article>

          <article
            style={{
              borderRadius: '28px',
              border: '1px solid var(--glass-border)',
              background: 'var(--surface-glass)',
              boxShadow: 'var(--shadow-md)',
              padding: '1rem',
              display: 'grid',
              gap: '0.85rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-subtle)' }}>Unmet-demand map</span>
              <h2 style={{ marginTop: '0.35rem', fontSize: '1.2rem' }}>Open need concentration</h2>
            </div>
            <div ref={mapRef} style={{ minHeight: '320px', borderRadius: '22px', background: 'linear-gradient(180deg, #ebe1cf, #dfcfb7)' }} />
            {!GOOGLE_MAPS_API_KEY ? (
              <p style={{ color: 'var(--text-subtle)', fontSize: '0.78rem' }}>Add `VITE_GOOGLE_MAPS_API_KEY` to render the embedded unmet-demand map.</p>
            ) : null}
          </article>
        </section>
      </section>
    </main>
  );
}

export default PublicKPIDashboard;
