import { Link } from 'react-router-dom';
import { AppIcon } from '../../components/shared';
import styles from './ForNgosPage.module.css';

const pillars = [
  { title: 'Real-time Dispatch', description: 'AI-ranked volunteer matching with coordinator overrides, SLAs, and heartbeat checks.', icon: 'dispatch' as const, accent: 'terra' as const },
  { title: 'Unified Dashboard', description: 'Live operations, volunteer health, pipeline flow, supplies, and impact in one command center.', icon: 'dashboard' as const, accent: 'jade' as const },
  { title: 'AI Intelligence', description: 'Copilot suggestions, skill matching, surge forecasts, and burnout prediction from Gemini.', icon: 'spark' as const, accent: 'amber' as const },
];

const steps = [
  'Review the platform capabilities across dispatch, dashboard, and AI tools.',
  'Contact the SevaSetu operations team to begin onboarding.',
  'Configure your NGO profile, volunteer roster, and service categories.',
];

export function ForNgosPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>Partner Onboarding</div>
          <h1 className={styles.heroTitle}>
            Bring your NGO into the<br />
            SevaSetu network.
          </h1>
          <p className={styles.heroSub}>
            Dispatch, dashboards, and AI tools — designed for field-first organisations serving Delhi.
          </p>
        </div>
      </section>

      <div className={styles.pillarGrid}>
        {pillars.map((pillar) => (
          <article key={pillar.title} className={styles.pillarCard} data-accent={pillar.accent}>
            <span className={styles.pillarIcon} data-accent={pillar.accent}>
              <AppIcon name={pillar.icon} size={22} />
            </span>
            <strong>{pillar.title}</strong>
            <p>{pillar.description}</p>
          </article>
        ))}
      </div>

      <section className={styles.onboardingCard}>
        <div className={styles.panelHeader}>
          <AppIcon name="route" size={15} /> Get started
        </div>
        <div className={styles.stepList}>
          {steps.map((step, i) => (
            <div key={i} className={styles.stepRow}>
              <span className={styles.stepNum}>{i + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.actionRow}>
        <Link to="/workspace" className={styles.btnPrimary}>
          <AppIcon name="constellation" size={15} /> Explore Workspace
        </Link>
        <Link to="/ngo-dashboard" className={styles.btnGhost}>
          <AppIcon name="dashboard" size={15} /> See NGO Dashboard
        </Link>
        <Link to="/seva-agent" className={styles.btnGhost}>
          <AppIcon name="dispatch" size={15} /> Try Dispatch
        </Link>
      </div>
    </div>
  );
}

export default ForNgosPage;
