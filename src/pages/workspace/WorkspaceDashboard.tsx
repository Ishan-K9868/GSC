/**
 * Workspace Dashboard
 * Master hub linking every SevaSetu surface with live context and next actions.
 *
 * Static data only — no API calls.
 */

import { Link } from 'react-router-dom';
import { AppIcon } from '../../components/shared';
import { appNavItems } from '../../config/appNavigation';
import styles from './WorkspaceDashboard.module.css';

const missionStats = [
  { label: 'Active deployments', value: '23', hint: 'Field teams responding live', accent: 'terra' as const },
  { label: 'Reports today', value: '67', hint: 'Intake across all channels', accent: 'jade' as const },
  { label: 'Avg response', value: '2.4h', hint: 'From report to first contact', accent: 'amber' as const },
  { label: 'Volunteer base', value: '142', hint: 'Verified field responders', accent: 'terra' as const },
];

const liveRibbon = [
  { text: 'Seelampur water cluster — 5 alerts, lead: Arjun Dabas', accent: 'amber' },
  { text: 'Okhla shelter surge — 6 needs, ETA 9 min', accent: 'terra' },
  { text: 'Mustafabad health restock — paediatric cases escalated', accent: 'terra' },
  { text: 'North East Delhi — highest density of water pressure', accent: 'jade' },
  { text: 'Crisis evaluation: zone_4b score above threshold', accent: 'amber' },
];

const nextActions = [
  { label: 'Review dispatch queue', description: 'Low-confidence matches need coordinator override before night handoff.', path: '/seva-agent', icon: 'dispatch' as const },
  { label: 'Check volunteer burnout', description: 'Two responders flagged for elevated usage patterns this week.', path: '/volunteer-app', icon: 'volunteer' as const },
  { label: 'Generate impact report', description: 'March reporting window closes soon — run the AI workbench summary.', path: '/gemini-lab', icon: 'spark' as const },
];

const delhiZones = [
  { zone: 'North East Delhi', clusters: 4, urgency: 'high' as const, topCategory: 'Water & Health' },
  { zone: 'South East Delhi', clusters: 3, urgency: 'medium' as const, topCategory: 'Shelter & Sanitation' },
  { zone: 'North West Delhi', clusters: 1, urgency: 'medium' as const, topCategory: 'Food & Nutrition' },
  { zone: 'South West Delhi', clusters: 1, urgency: 'low' as const, topCategory: 'Eldercare' },
];

export function WorkspaceDashboard() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>Mission Control</div>
          <h1 className={styles.heroTitle}>
            Start from here, then drop into<br />
            the tool the field needs right now.
          </h1>
          <p className={styles.heroSub}>
            Every surface in SevaSetu is reachable from this workspace. Metrics are live, actions are prioritised, and the map is one click away.
          </p>
        </div>
      </section>

      {/* Stat Cards */}
      <section className={styles.statGrid}>
        {missionStats.map((stat) => (
          <article key={stat.label} className={styles.statCard} data-accent={stat.accent}>
            <span className={styles.statLabel}>{stat.label}</span>
            <strong className={styles.statValue}>{stat.value}</strong>
            <span className={styles.statHint}>{stat.hint}</span>
          </article>
        ))}
      </section>

      {/* Live Ribbon */}
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
        {/* Next Actions */}
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

        {/* Delhi Zones */}
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
                  <span>{zone.clusters} clusters</span>
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

      {/* Route Board */}
      <section className={styles.routeSection}>
        <div className={styles.panelHeader}>
          <AppIcon name="constellation" size={15} />
          All surfaces
        </div>
        <div className={styles.routeGrid}>
          {appNavItems.filter((item) => item.path !== '/workspace').map((item) => (
            <Link key={item.path} to={item.path} className={styles.routeCard} data-accent={item.accent}>
              <span className={styles.routeIcon} data-accent={item.accent}>
                <AppIcon name={item.icon as any} size={18} />
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
