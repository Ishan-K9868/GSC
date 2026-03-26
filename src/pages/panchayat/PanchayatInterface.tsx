import { useEffect, useState } from 'react';
import {
  flagPanchayatNeed,
  getPanchayatOverview,
  getPanchayatHistory,
  runPanchayatSchemeGapFinder,
  getPanchayatMonthlyReport,
  getPanchayatPmGatiShaktiOverlay,
} from '../../services/api';
import styles from './PanchayatInterface.module.css';

const PANCHAYAT_ID = 'panchayat_demo_001';

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function PanchayatInterface() {
  const [overview, setOverview] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [schemeGap, setSchemeGap] = useState<any>(null);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [gatiOverlay, setGatiOverlay] = useState<any>(null);
  const [needDesc, setNeedDesc] = useState('हमारे गांव के पूर्वी हिस्से में पेयजल की गंभीर कमी है।');
  const [schemeInput, setSchemeInput] = useState(
    'Recurring water scarcity and maternal health service gaps in two hamlets.'
  );

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    const [ov, hs, mr, gt] = await Promise.all([
      getPanchayatOverview(PANCHAYAT_ID),
      getPanchayatHistory(PANCHAYAT_ID, 6),
      getPanchayatMonthlyReport(PANCHAYAT_ID, 'March 2026'),
      getPanchayatPmGatiShaktiOverlay(PANCHAYAT_ID),
    ]);
    if (ov.success) setOverview(ov.data);
    if (hs.success) setHistory(hs.data);
    if (mr.success) setMonthlyReport(mr.data);
    if (gt.success) setGatiOverlay(gt.data);
  }

  async function onFlagNeed() {
    await flagPanchayatNeed({
      panchayatId: PANCHAYAT_ID,
      description: needDesc,
      category: 'water_sanitation',
      urgency: 'high',
      location: {
        latitude: 28.58,
        longitude: 77.31,
        district: 'Demo District',
        state: 'Uttar Pradesh',
        address: 'Ward 3, East Hamlet',
      },
    });
    await loadData();
  }

  async function onRunSchemeGapFinder() {
    const res = await runPanchayatSchemeGapFinder({
      panchayatId: PANCHAYAT_ID,
      needsSummary: schemeInput,
      enrolledSchemes: ['PM Kisan', 'Jan Dhan'],
    });
    setSchemeGap(res.data || res.error);
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <h1 className={styles.title}>Panchayat Interface</h1>
          <p className={styles.sub}>
            Hindi-first civic coordination view for sarpanches and local officials with duplication checks and scheme-gap insights.
          </p>
        </section>

        <div className={styles.grid}>
          <section className={`${styles.card} ${styles.span5}`}>
            <h2>Direct Need Flagging (Verified Sarpanch)</h2>
            <textarea className={styles.textarea} value={needDesc} onChange={(e) => setNeedDesc(e.target.value)} />
            <button className="btn btn-primary" type="button" onClick={() => void onFlagNeed()}>
              Flag Need on Map
            </button>
            <p>Write access should be verified-sarpanch only; others stay read-only by policy.</p>
          </section>

          <section className={`${styles.card} ${styles.span7}`}>
            <h2>Jurisdiction Overview</h2>
            <div className={styles.meta}>
              <span className={styles.pill}>Active needs: {overview?.activeNeedsCount || 0}</span>
              <span className={styles.pill}>Active NGOs: {(overview?.activeNgos || []).length}</span>
            </div>
            <div className={styles.list}>
              {(overview?.activeNgos || []).slice(0, 6).map((ngo: any) => (
                <div key={ngo.ngoId} className={styles.item}>
                  <strong>{ngo.name}</strong>
                  <div className={styles.meta}>
                    <span>{ngo.activeCases} active cases</span>
                    <span>{(ngo.categories || []).join(', ') || 'general'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Duplication Prevention + Need History</h2>
            <div className={styles.output}>{pretty({
              duplicateClusters: overview?.duplicateClusters || [],
              recurringNeeds: overview?.recurringNeeds || [],
              history: history?.history || [],
            })}</div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Government Scheme Gap Finder</h2>
            <textarea className={styles.textarea} value={schemeInput} onChange={(e) => setSchemeInput(e.target.value)} />
            <button className="btn btn-primary" type="button" onClick={() => void onRunSchemeGapFinder()}>
              Run Gap Finder
            </button>
            <div className={styles.output}>{pretty(schemeGap || { info: 'Run analysis to view eligible but unenrolled groups' })}</div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Monthly Village Health One-Pager</h2>
            <div className={styles.output}>{pretty(monthlyReport || { info: 'Report unavailable' })}</div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>PM GatiShakti Overlay (Infrastructure Signals)</h2>
            <div className={styles.output}>{pretty(gatiOverlay || { info: 'Overlay unavailable' })}</div>
          </section>

          <section className={`${styles.card} ${styles.span12}`}>
            <h2>Design Principles Coverage</h2>
            <div className={styles.row}>
              <span className={styles.pill}>Hindi-first UI</span>
              <span className={styles.pill}>SMS/WhatsApp-compatible workflows</span>
              <span className={styles.pill}>No training required mobile patterns</span>
              <span className={styles.pill}>Read-only by default (policy)</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default PanchayatInterface;
