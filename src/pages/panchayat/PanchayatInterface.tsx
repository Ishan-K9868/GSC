import { useEffect, useState } from 'react';
import {
  getPanchayatOverview,
  getPanchayatHistory,
  getPanchayatMonthlyReport,
  getPanchayatPmGatiShaktiOverlay,
  flagPanchayatNeed,
  runPanchayatSchemeGapFinder,
} from '../../services/api';
import { AppIcon } from '../../components/shared';
import styles from './PanchayatInterface.module.css';

export function PanchayatInterface() {
  const [overview, setOverview] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [gatiShakti, setGatiShakti] = useState<any>(null);
  const [schemeGap, setSchemeGap] = useState<any>(null);

  const [flagDesc, setFlagDesc] = useState('');
  const [flagCat, setFlagCat] = useState('water_sanitation');
  const [flagResult, setFlagResult] = useState<any>(null);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    const [ovRes, histRes, mrRes, gsRes] = await Promise.all([
      getPanchayatOverview('panchayat_001'),
      getPanchayatHistory('panchayat_001'),
      getPanchayatMonthlyReport('panchayat_001', '2025-03'),
      getPanchayatPmGatiShaktiOverlay('panchayat_001'),
    ]);

    if (ovRes.success) setOverview(ovRes.data);
    if (histRes.success) setHistory(histRes.data?.events || []);
    if (mrRes.success) setMonthlyReport(mrRes.data);
    if (gsRes.success) setGatiShakti(gsRes.data);
  }

  async function onFlag() {
    if (!flagDesc.trim()) return;
    const res = await flagPanchayatNeed({
      panchayatId: 'panchayat_001',
      description: flagDesc,
      category: flagCat,
      urgency: 'high',
      location: { latitude: 28.6, longitude: 77.2, district: 'Delhi', state: 'Delhi' },
    });
    setFlagResult(res.data || res.error);
    setFlagDesc('');
  }

  async function onFindSchemeGap() {
    const res = await runPanchayatSchemeGapFinder({ panchayatId: 'panchayat_001', needsSummary: 'current needs', enrolledSchemes: [] });
    setSchemeGap(res.data);
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>Panchayat Coordination</div>
          <h1 className={styles.heroTitle}>
            Civic dashboard for village officials,<br />
            scheme matching, and local history.
          </h1>
          <p className={styles.heroSub}>
            Hindi-first civic coordination with scheme gap analysis and infrastructure overlay.
          </p>
        </div>
      </section>

      <section className={styles.grid}>
        {/* Issue Flagging */}
        <article className={`${styles.panel} ${styles.span5}`}>
          <div className={styles.panelHeader}><AppIcon name="alert" size={15} /> Flag a need</div>
          <div className={styles.panelBody}>
            <select className={styles.select} value={flagCat} onChange={(e) => setFlagCat(e.target.value)}>
               <option value="water_sanitation">Water</option>
               <option value="health">Health</option>
               <option value="shelter">Shelter</option>
               <option value="food_nutrition">Food</option>
               <option value="women_child">Women and child</option>
               <option value="education">Education</option>
            </select>
            <textarea className={styles.textarea} placeholder="Describe the need..." value={flagDesc} onChange={(e) => setFlagDesc(e.target.value)} />
            <button className={styles.btnPrimary} type="button" onClick={() => void onFlag()}>
              <AppIcon name="check" size={14} /> Submit flag
            </button>
            {flagResult ? (
              <div className={styles.storyBlock}>
                <strong>Flag result</strong>
                <p>{flagResult.reportId || flagResult.message || JSON.stringify(flagResult)}</p>
              </div>
            ) : null}
          </div>
        </article>

        {/* Jurisdiction Overview */}
        <article className={`${styles.panel} ${styles.span7}`}>
          <div className={styles.panelHeader}><AppIcon name="civic" size={15} /> Jurisdiction overview</div>
          <div className={styles.panelBody}>
            {overview ? (
              <>
                <div className={styles.metricRow}>
                  <div className={styles.metricTile}><span>Total needs</span><strong>{overview.totalNeeds || 0}</strong></div>
                  <div className={styles.metricTile}><span>Resolved</span><strong>{overview.resolved || 0}</strong></div>
                  <div className={styles.metricTile}><span>NGOs active</span><strong>{overview.coverageNgos?.length || 0}</strong></div>
                </div>
                {overview.coverageNgos?.slice(0, 3).map((ngo: any) => (
                  <div key={ngo.ngoId || ngo.name} className={styles.itemCard}>
                    <strong>{ngo.name}</strong>
                    <div className={styles.itemMeta}><span>{(ngo.categories || []).join(', ') || 'general'}</span><span>{ngo.activeCases || 0} active cases</span></div>
                  </div>
                ))}
              </>
            ) : <p className={styles.notice}>Loading overview...</p>}
          </div>
        </article>

        {/* Recurring Needs (History) */}
        <article className={`${styles.panel} ${styles.span6}`}>
          <div className={styles.panelHeader}><AppIcon name="clock" size={15} /> Recurring needs</div>
          <div className={styles.panelBody}>
            {history.slice(0, 5).map((event: any, i: number) => (
              <div key={i} className={styles.itemCard}>
                 <strong>{event.title || event.category}</strong>
                 <p>{event.summary || event.description}</p>
                <div className={styles.itemMeta}><span>{event.date || event.month}</span></div>
              </div>
            ))}
            {history.length === 0 ? <p className={styles.notice}>No history records.</p> : null}
          </div>
        </article>

        {/* Scheme Gap Finder */}
        <article className={`${styles.panel} ${styles.span6}`}>
          <div className={styles.panelHeader}><AppIcon name="spark" size={15} /> Scheme gap finder</div>
          <div className={styles.panelBody}>
            <button className={styles.btnGhost} type="button" onClick={() => void onFindSchemeGap()}>
              <AppIcon name="spark" size={14} /> Run scheme analysis
            </button>
            {schemeGap ? (
              <>
                 <div className={styles.storyBlock}>
                   <strong>Action plan</strong>
                   <p>{schemeGap.actionPlanHindi || schemeGap.summary || schemeGap.analysis || 'Scheme analysis complete.'}</p>
                 </div>
                 {Array.isArray(schemeGap.eligibleSchemes) ? (
                   <div className={styles.chipRow}>
                     {schemeGap.eligibleSchemes.map((g: any) => <span key={g.scheme || g} className={styles.chip}>{g.scheme || g}</span>)}
                   </div>
                 ) : null}
              </>
            ) : <p className={styles.notice}>Run to discover unmatched government schemes.</p>}
          </div>
        </article>

        {/* Monthly Report */}
        <article className={`${styles.panel} ${styles.span6}`}>
          <div className={styles.panelHeader}><AppIcon name="dashboard" size={15} /> Monthly report</div>
          <div className={styles.panelBody}>
            {monthlyReport ? (
              <div className={styles.storyBlock}>
                <strong>{monthlyReport.month || 'Report'}</strong>
                <p>{monthlyReport.summary || (Array.isArray(monthlyReport.highlights) ? monthlyReport.highlights.join(' · ') : 'No monthly summary available.')}</p>
              </div>
            ) : <p className={styles.notice}>Loading report...</p>}
          </div>
        </article>

        {/* Infrastructure */}
        <article className={`${styles.panel} ${styles.span6}`}>
          <div className={styles.panelHeader}><AppIcon name="route" size={15} /> Infrastructure overlay</div>
          <div className={styles.panelBody}>
            {gatiShakti ? (
              <div className={styles.storyBlock}>
                <strong>Gati Shakti</strong>
                <p>{gatiShakti.summary || (Array.isArray(gatiShakti.projects) ? gatiShakti.projects.map((item: any) => item.note || item.assetType).join(' · ') : 'Infrastructure overlay loaded.')}</p>
              </div>
            ) : <p className={styles.notice}>Loading Gati Shakti data...</p>}
          </div>
        </article>
      </section>
    </div>
  );
}

export default PanchayatInterface;
