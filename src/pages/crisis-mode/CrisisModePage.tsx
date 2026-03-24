import { useEffect, useState } from 'react';
import {
  evaluateCrisisActivation,
  activateCrisisMode,
  getCrisisDashboard,
  resolveCrisisMode,
  generatePostCrisisReport,
} from '../../services/api';
import styles from './CrisisModePage.module.css';

const ZONE_ID = 'zone_4b';

function pretty(v: unknown) {
  return JSON.stringify(v, null, 2);
}

export function CrisisModePage() {
  const [evaluation, setEvaluation] = useState<any>(null);
  const [activation, setActivation] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [postReport, setPostReport] = useState<any>(null);
  const [evidence, setEvidence] = useState('5+ emergency cases in dense cluster plus rising flood-risk signals from field teams.');

  useEffect(() => {
    void refreshDashboard();
  }, []);

  async function refreshDashboard() {
    const res = await getCrisisDashboard(ZONE_ID);
    if (res.success) setDashboard(res.data);
  }

  async function onEvaluate() {
    const res = await evaluateCrisisActivation(ZONE_ID, true);
    setEvaluation(res.data || res.error);
  }

  async function onActivate() {
    const res = await activateCrisisMode({
      zoneId: ZONE_ID,
      reason: 'Threshold reached for emergency cluster and weather signal',
      evidenceSummary: evidence,
    });
    setActivation(res.data || res.error);
    await refreshDashboard();
  }

  async function onResolve() {
    const crisisId = activation?.crisisId || dashboard?.crisis?.id;
    if (!crisisId) return;
    await resolveCrisisMode(crisisId);
    await refreshDashboard();
  }

  async function onGeneratePostReport() {
    const crisisId = activation?.crisisId || dashboard?.crisis?.id || 'crisis_demo';
    const res = await generatePostCrisisReport(crisisId, ZONE_ID);
    setPostReport(res.data || res.error);
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <h1 className={styles.title}>SEVA Crisis Mode Command</h1>
          <p className={styles.sub}>
            Disaster response overlay with rapid dispatch, surge mobilization, cross-NGO requisition, and auto government escalation.
          </p>
          <div className={styles.row}>
            <span className={styles.pill}>Dispatch target: 60 sec</span>
            <span className={styles.pill}>Volunteer radius: 25km</span>
            <span className={styles.pill}>Proximity weight: 0.50</span>
          </div>
        </section>

        <div className={styles.grid}>
          <section className={`${styles.card} ${styles.span5}`}>
            <h2>Activation Thresholds</h2>
            <p>Triggers: 5+ emergency reports in 5km/2h OR IMD alert.</p>
            <textarea className={styles.textarea} value={evidence} onChange={(e) => setEvidence(e.target.value)} />
            <div className={styles.row}>
              <button className="btn btn-ghost" type="button" onClick={() => void onEvaluate()}>
                Evaluate Threshold
              </button>
              <button className="btn btn-primary" type="button" onClick={() => void onActivate()}>
                Activate Crisis Mode
              </button>
            </div>
            <div className={styles.output}>{pretty(evaluation || { info: 'Run threshold evaluation first' })}</div>
          </section>

          <section className={`${styles.card} ${styles.span7}`}>
            <h2>Crisis Dashboard (Full-screen equivalent)</h2>
            <div className={styles.meta}>
              <span className={styles.pill}>Mode: {dashboard?.mode || 'standard'}</span>
              <span className={styles.pill}>Active deployments: {dashboard?.liveOperations?.activeDeployments || 0}</span>
              <span className={styles.pill}>High urgency: {dashboard?.liveOperations?.highUrgencyDeployments || 0}</span>
            </div>
            <div className={styles.output}>{pretty(dashboard || { info: 'Dashboard not loaded yet' })}</div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Volunteer Surge Queue</h2>
            <div className={styles.list}>
              {(dashboard?.volunteerSurgeQueue?.queue || []).slice(0, 6).map((vol: any) => (
                <div className={styles.item} key={vol.volunteerId}>
                  <strong>{vol.name}</strong>
                  <div className={styles.meta}>
                    <span>ETA {vol.etaMinutes} min</span>
                    <span>{(vol.skills || []).slice(0, 3).join(', ') || 'general support'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Resource Tracking + Requisition</h2>
            <div className={styles.output}>{pretty({
              activation,
              resourceTracking: dashboard?.resourceTracking,
            })}</div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Media Bulletin</h2>
            <div className={styles.output}>{pretty(dashboard?.mediaBulletin || { info: 'Bulletin unavailable' })}</div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Government Notification + Post-Crisis Report</h2>
            <div className={styles.row}>
              <button className="btn btn-ghost" type="button" onClick={() => void onResolve()}>
                Resolve Crisis
              </button>
              <button className="btn btn-primary" type="button" onClick={() => void onGeneratePostReport()}>
                Generate Post-Crisis Report
              </button>
            </div>
            <div className={styles.output}>{pretty(postReport || activation?.governmentNotification || { info: 'No report generated yet' })}</div>
          </section>

          <section className={`${styles.card} ${styles.span12}`}>
            <h2>Crisis vs Standard Parameters</h2>
            <div className={styles.row}>
              <span className={styles.pill}>Notification radius: 5km → 25km</span>
              <span className={styles.pill}>Proximity weight: 0.30 → 0.50</span>
              <span className={styles.pill}>Skill weight: 0.25 → 0.15</span>
              <span className={styles.pill}>Dispatch target: 15 min → 60 sec</span>
              <span className={styles.pill}>Government notification: Manual → Automatic</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default CrisisModePage;
