/**
 * Workspace Dashboard
 * Master hub linking every SevaSetu surface with live context and next actions.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppIcon } from '../../components/shared';
import { appNavItems } from '../../config/appNavigation';
import { getWorkspaceSummary } from '../../services/api';
import styles from './WorkspaceDashboard.module.css';

type Accent = 'terra' | 'jade' | 'amber';

type WorkspaceSummary = {
  stats: {
    activeNeeds: number;
    activeDeployments: number;
    reportsToday: number;
    resolvedToday: number;
    volunteerBase: number;
    averageResponseHours: number;
  };
  highlights: Array<{
    text: string;
    accent: Accent;
  }>;
  districtSnapshots: Array<{
    zone: string;
    clusters: number;
    urgency: 'high' | 'medium' | 'low';
    topCategory: string;
  }>;
  generatedAt: string;
};

const nextActions = [
  { label: 'Review dispatch queue', description: 'Low-confidence matches need coordinator override before night handoff.', path: '/seva-agent', icon: 'dispatch' as const },
  { label: 'Check volunteer burnout', description: 'Review field load and active mission distribution before assigning the next wave.', path: '/volunteer-app', icon: 'volunteer' as const },
  { label: 'Generate impact report', description: 'Turn today\'s operations into a judge-friendly impact narrative with the AI workbench.', path: '/gemini-lab', icon: 'spark' as const },
];

function formatMetricValue(value: number, suffix = '') {
  if (!Number.isFinite(value)) return '--';
  if (suffix) return `${value}${suffix}`;
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}

function formatTimestamp(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return 'Live data unavailable';
  return `Updated ${value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export function WorkspaceDashboard() {
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspaceSummary() {
      setLoading(true);
      setError(null);

      const response = await getWorkspaceSummary();
      if (!isMounted) return;

      if (response.success && response.data) {
        setSummary(response.data as WorkspaceSummary);
        setLoading(false);
        return;
      }

      setError(response.error?.message || 'Unable to load live workspace metrics.');
      setLoading(false);
    }

    void loadWorkspaceSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  const missionStats = useMemo(() => {
    const stats = summary?.stats;
    return [
      {
        label: 'Active needs',
        value: loading ? '...' : formatMetricValue(stats?.activeNeeds ?? 0),
        hint: loading ? 'Pulling live queue' : `${formatMetricValue(stats?.activeDeployments ?? 0)} active deployments in motion`,
        accent: 'terra' as const,
      },
      {
        label: 'Reports today',
        value: loading ? '...' : formatMetricValue(stats?.reportsToday ?? 0),
        hint: loading ? 'Checking daily intake' : `${formatMetricValue(stats?.resolvedToday ?? 0)} resolved since midnight`,
        accent: 'jade' as const,
      },
      {
        label: 'Avg response',
        value: loading ? '...' : formatMetricValue(stats?.averageResponseHours ?? 0, 'h'),
        hint: 'Resolution time across resolved cases',
        accent: 'amber' as const,
      },
      {
        label: 'Volunteer base',
        value: loading ? '...' : formatMetricValue(stats?.volunteerBase ?? 0),
        hint: 'Registered field responders available to deploy',
        accent: 'terra' as const,
      },
    ];
  }, [loading, summary]);

  const liveRibbon = summary?.highlights?.length
    ? summary.highlights
    : [{ text: loading ? 'Loading live operational highlights...' : 'No live updates yet - seed data or recent activity will appear here.', accent: 'jade' as const }];

  const delhiZones = summary?.districtSnapshots?.length
    ? summary.districtSnapshots
    : [{ zone: 'Delhi', clusters: 0, urgency: 'low' as const, topCategory: 'Awaiting live reports' }];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>Mission Control</div>
          <h1 className={styles.heroTitle}>
            Start from here, then drop into<br />
            the tool the field needs right now.
          </h1>
          <p className={styles.heroSub}>
            Every surface in SevaSetu is reachable from this workspace. Metrics are now sourced from live Firestore activity so operators can gauge volume, response speed, and volunteer capacity before switching views.
          </p>
        </div>
      </section>

      <section className={styles.statusRow}>
        <div className={styles.statusPill} data-state={error ? 'error' : loading ? 'loading' : 'live'}>
          <span className={styles.statusDot} />
          <span>{error ? error : loading ? 'Syncing workspace metrics...' : formatTimestamp(summary?.generatedAt || '')}</span>
        </div>
      </section>

      <section className={styles.statGrid}>
        {missionStats.map((stat) => (
          <article key={stat.label} className={styles.statCard} data-accent={stat.accent}>
            <span className={styles.statLabel}>{stat.label}</span>
            <strong className={styles.statValue}>{stat.value}</strong>
            <span className={styles.statHint}>{stat.hint}</span>
          </article>
        ))}
      </section>

      <section className={styles.ribbon}>
        <div className={styles.ribbonHeader}>
          <AppIcon name="alert" size={14} />
          <span>Live feed</span>
        </div>
        <div className={styles.ribbonTrack}>
          {liveRibbon.map((item) => (
            <div key={item.text} className={styles.ribbonItem} data-accent={item.accent}>
              {item.text}
            </div>
          ))}
        </div>
      </section>

      <div className={styles.twoCol}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <AppIcon name="layers" size={15} />
            Priority actions
          </div>
          <div className={styles.actionList}>
            {nextActions.map((action) => (
              <Link key={action.path} to={action.path} className={styles.actionCard}>
                <span className={styles.actionIcon}>
                  <AppIcon name={action.icon} size={18} />
                </span>
                <div className={styles.actionCopy}>
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </div>
                <span className={styles.actionArrow}>
                  <AppIcon name="route" size={14} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <AppIcon name="map" size={15} />
            Delhi coverage
          </div>
          <div className={styles.zoneList}>
            {delhiZones.map((zone) => (
              <div key={zone.zone} className={styles.zoneCard} data-urgency={zone.urgency}>
                <div className={styles.zoneTop}>
                  <strong>{zone.zone}</strong>
                  <span className={styles.urgencyBadge} data-urgency={zone.urgency}>{zone.urgency}</span>
                </div>
                <div className={styles.zoneMeta}>
                  <span>{zone.clusters} active clusters</span>
                  <span>{zone.topCategory}</span>
                </div>
              </div>
            ))}
            <Link to="/pulse-map" className={styles.zoneLink}>
              <AppIcon name="map" size={14} />
              Open full operations atlas
            </Link>
          </div>
        </section>
      </div>

      <section className={styles.routeSection}>
        <div className={styles.panelHeader}>
          <AppIcon name="constellation" size={15} />
          All surfaces
        </div>
        <div className={styles.routeGrid}>
          {appNavItems.filter((item) => item.path !== '/workspace').map((item) => (
            <Link key={item.path} to={item.path} className={styles.routeCard} data-accent={item.accent}>
              <span className={styles.routeIcon} data-accent={item.accent}>
                <AppIcon name={item.icon as never} size={18} />
              </span>
              <strong>{item.label}</strong>
              <span className={styles.routeDesc}>{item.description}</span>
              <span className={styles.routeGroup}>{item.group}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default WorkspaceDashboard;
