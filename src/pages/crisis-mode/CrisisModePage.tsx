import { useEffect, useState } from 'react';
import {
  evaluateCrisisActivation,
  activateCrisisMode,
  getCrisisDashboard,
  resolveCrisisMode,
  generatePostCrisisReport,
} from '../../services/api';
import { AppIcon } from '../../components/shared';
import styles from './CrisisModePage.module.css';

const ZONE_ID = 'zone_4b';

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

  const governmentNotice = activation?.governmentNotification || dashboard?.governmentNotification;
  const requisitionRequests = Array.isArray(activation?.resourceRequisition?.requests)
    ? activation.resourceRequisition.requests
    : [];
  const resourceRows = Array.isArray(dashboard?.resourceTracking?.resources) ? dashboard.resourceTracking.resources : [];
  const postHighlights = Array.isArray(postReport?.highlights) ? postReport.highlights : [];

  return (
    <div className={styles.page}>
      {/* Hero + Alert Strip */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>Crisis Command</div>
          <h1 className={styles.heroTitle}>
            Incident activation, live response,<br />
            and controlled resolution.
          </h1>
          <p className={styles.heroSub}>
            Mode state, surge queue, government notice, and response levers in one console.
          </p>
        </div>
        <div className={styles.alertStrip}>
          <span className={styles.alertBadge}>{ZONE_ID}</span>
          <span className={styles.alertBadge} data-mode={dashboard?.mode || 'standard'}>
            {dashboard?.mode || 'standard'}
          </span>
          <span className={styles.alertBadge}>
            {dashboard?.liveOperations?.activeDeployments || 0} deployments
          </span>
        </div>
      </section>

      {/* Grid */}
      <section className={styles.grid}>
        {/* Activation Panel */}
        <article className={`${styles.panel} ${styles.span5}`}>
          <div className={styles.panelHeader}>
            <AppIcon name="alert" size={15} />
            Activation thresholds
          </div>
          <div className={styles.panelBody}>
            <textarea className={styles.textarea} value={evidence} onChange={(e) => setEvidence(e.target.value)} />
            <div className={styles.btnRow}>
              <button className={styles.btnGhost} type="button" onClick={() => void onEvaluate()}>
                Evaluate threshold
              </button>
              <button className={styles.btnPrimary} type="button" onClick={() => void onActivate()}>
                Activate crisis
              </button>
            </div>
            <div className={styles.storyBlock}>
              <strong>Evaluation</strong>
              <p>{evaluation?.reason || evaluation?.message || 'Run the threshold evaluation to inspect trigger conditions.'}</p>
            </div>
            {typeof evaluation?.score === 'number' ? (
              <div className={styles.inlineMetric}>
                <span>Trigger score</span>
                <strong>{evaluation.score}</strong>
              </div>
            ) : null}
          </div>
        </article>

        {/* Incident Overview */}
        <article className={`${styles.panel} ${styles.span7}`}>
          <div className={styles.panelHeader}>
            <AppIcon name="dashboard" size={15} />
            Incident overview
          </div>
          <div className={styles.panelBody}>
            <div className={styles.metricRow}>
              <div className={styles.metricTile}>
                <span>Mode</span>
                <strong>{dashboard?.mode || 'standard'}</strong>
              </div>
              <div className={styles.metricTile}>
                <span>High urgency</span>
                <strong>{dashboard?.liveOperations?.highUrgencyDeployments || 0}</strong>
              </div>
              <div className={styles.metricTile}>
                <span>Resource alerts</span>
                <strong>{dashboard?.resourceTracking?.replenishmentAlerts || 0}</strong>
              </div>
            </div>
            <div className={styles.storyBlock}>
              <strong>Government notice</strong>
              <p>{governmentNotice?.subject || 'Notice is auto-generated once crisis mode is live.'}</p>
              {governmentNotice?.letter ? <p>{governmentNotice.letter}</p> : null}
            </div>
          </div>
        </article>

        {/* Volunteer Surge */}
        <article className={`${styles.panel} ${styles.span6}`}>
          <div className={styles.panelHeader}>
            <AppIcon name="volunteer" size={15} />
            Volunteer surge queue
          </div>
          <div className={styles.panelBody}>
            <div className={styles.cardList}>
              {(dashboard?.volunteerSurgeQueue?.queue || []).slice(0, 6).map((vol: any) => (
                <div key={vol.volunteerId} className={styles.itemCard}>
                  <strong>{vol.name}</strong>
                  <div className={styles.cardMeta}>
                    <span>ETA {vol.etaMinutes} min</span>
                    <span>{(vol.skills || []).slice(0, 3).join(', ') || 'general support'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* Resource Requisition */}
        <article className={`${styles.panel} ${styles.span6}`}>
          <div className={styles.panelHeader}>
            <AppIcon name="network" size={15} />
            Resource requisition
          </div>
          <div className={styles.panelBody}>
            {requisitionRequests.length > 0 ? (
              <div className={styles.chipRow}>
                {requisitionRequests.map((req: any) => (
                  <span key={req.ngoId} className={styles.chip}>{req.ngoName}</span>
                ))}
              </div>
            ) : null}
            <div className={styles.cardList}>
              {requisitionRequests.map((req: any) => (
                <div key={req.ngoId} className={styles.itemCard}>
                  <strong>{req.ngoName}</strong>
                  <p>{(req.requestedResources || []).join(', ')}</p>
                </div>
              ))}
              {resourceRows.slice(0, 4).map((res: any) => (
                <div key={res.resourceId} className={styles.itemCard}>
                  <strong>{res.name}</strong>
                  <div className={styles.cardMeta}>
                    <span>{res.remaining} remaining</span>
                    <span>{res.replenishmentEtaHours}h ETA</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* Media Bulletin */}
        <article className={`${styles.panel} ${styles.span6}`}>
          <div className={styles.panelHeader}>
            <AppIcon name="spark" size={15} />
            Media bulletin
          </div>
          <div className={styles.panelBody}>
            <div className={styles.storyBlock}>
              <strong>{dashboard?.mediaBulletin?.tone || 'assuring'}</strong>
              <p>{dashboard?.mediaBulletin?.bulletin || 'Bulletin appears once crisis mode is live.'}</p>
            </div>
          </div>
        </article>

        {/* Resolution */}
        <article className={`${styles.panel} ${styles.span6}`}>
          <div className={styles.panelHeader}>
            <AppIcon name="shield" size={15} />
            Resolution + report
          </div>
          <div className={styles.panelBody}>
            <div className={styles.btnRow}>
              <button className={styles.btnGhost} type="button" onClick={() => void onResolve()}>
                Resolve crisis
              </button>
              <button className={styles.btnPrimary} type="button" onClick={() => void onGeneratePostReport()}>
                Generate post-crisis report
              </button>
            </div>
            <div className={styles.storyBlock}>
              <strong>Post-crisis output</strong>
              <p>{postReport?.summary || postReport?.title || 'Generate a report once response stabilises.'}</p>
            </div>
            {postHighlights.length > 0 ? (
              <div className={styles.chipRow}>
                {postHighlights.map((item: string) => <span key={item} className={styles.chip}>{item}</span>)}
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}

export default CrisisModePage;
