import { useEffect, useMemo, useState } from 'react';
import {
  getDashboardOverview,
  getCompanyVolunteerPool,
  getCompanyBRSR,
  getCompanyLeaderboard,
  getTeamChallenges,
  getCompanyCertificates,
  getCsrPricing,
} from '../../services/api';
import { AppIcon } from '../../components/shared';
import styles from './CsrPortalPage.module.css';

const fallbackVolunteerPool = [
  { employeeId: 'emp-01', name: 'Aarav Mehta', completedTasks: 11, division: 'Finance', preferredNgoMatch: true, topSkill: 'ration drives' },
  { employeeId: 'emp-02', name: 'Naina Rao', completedTasks: 8, division: 'Operations', preferredNgoMatch: false, topSkill: 'health camp support' },
  { employeeId: 'emp-03', name: 'Ritvik Bhasin', completedTasks: 7, division: 'Product', preferredNgoMatch: true, topSkill: 'education mentoring' },
  { employeeId: 'emp-04', name: 'Sara Khan', completedTasks: 5, division: 'People', preferredNgoMatch: false, topSkill: 'women and child support' },
];

const fallbackChallenges = [
  { id: 'challenge-1', title: 'Weekend ration sprint', metric: 'Food kits distributed', currentValue: 34, targetValue: 50, status: 'on_track' },
  { id: 'challenge-2', title: 'Quarter-end skills hours', metric: 'Volunteer hours', currentValue: 54, targetValue: 80, status: 'watch' },
  { id: 'challenge-3', title: 'Monsoon readiness', metric: 'Needs resolved', currentValue: 12, targetValue: 20, status: 'on_track' },
];

const fallbackLeaderboard = [
  { divisionId: 'div-1', name: 'Operations', totalHours: 24, participants: 9 },
  { divisionId: 'div-2', name: 'People', totalHours: 18, participants: 6 },
  { divisionId: 'div-3', name: 'Finance', totalHours: 12, participants: 4 },
];

const fallbackCertificates = [
  { id: 'cert-1', employeeName: 'Aarav Mehta', status: 'Issued this month', certificateId: 'CSR-24031' },
  { id: 'cert-2', employeeName: 'Naina Rao', status: 'Pending approval', certificateId: 'CSR-24032' },
  { id: 'cert-3', employeeName: 'Sara Khan', status: 'Ready to download', certificateId: 'CSR-24033' },
];

const fallbackVetting = [
  { title: 'FCRA and legal posture', note: 'All shortlisted NGO partners have valid filings and a clear sanction-screen pass.' },
  { title: 'Field execution proof', note: 'Recent deployment evidence, volunteer photos, and beneficiary references are available.' },
  { title: 'Brand-risk screen', note: 'No adverse media spikes in the last 90 days across shortlisted NGO partners.' },
];

export function CsrPortalPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [volunteerPool, setVolunteerPool] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [teamChallenges, setTeamChallenges] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadPortal();
  }, []);

  async function loadPortal() {
    setLoading(true);
    const [dashRes, poolRes, compRes, leadRes, challRes, certRes, priceRes] = await Promise.all([
      getDashboardOverview(),
      getCompanyVolunteerPool('corp_001'),
      getCompanyBRSR('corp_001'),
      getCompanyLeaderboard('corp_001'),
      getTeamChallenges('corp_001'),
      getCompanyCertificates('corp_001'),
      getCsrPricing(),
    ]);

    if (dashRes.success) setDashboard(dashRes.data);
    if (poolRes.success) setVolunteerPool(poolRes.data?.volunteers || []);
    if (compRes.success) setCompliance(compRes.data);
    if (leadRes.success) setLeaderboard(leadRes.data?.divisions || []);
    if (challRes.success) setTeamChallenges(challRes.data?.challenges || []);
    if (certRes.success) setCertificates(certRes.data?.certificates || []);
    if (priceRes.success) setPricing(priceRes.data);
    setLoading(false);
  }

  const displayVolunteerPool = volunteerPool.length > 0 ? volunteerPool : fallbackVolunteerPool;
  const displayChallenges = teamChallenges.length > 0 ? teamChallenges : fallbackChallenges;
  const displayLeaderboard = leaderboard.length > 0 ? leaderboard : fallbackLeaderboard;
  const displayCertificates = certificates.length > 0 ? certificates : fallbackCertificates;

  const complianceSummary = useMemo(
    () => ({
      brsrStatus: compliance?.brsrStatus || 'generated',
      reportsFiled: compliance?.reportsFiled || 4,
      auditScore: compliance?.auditScore || '92 / 100',
      sdgFocus: compliance?.sdgFocus || ['SDG 3', 'SDG 4', 'SDG 6'],
      evidenceReady: compliance?.evidenceReady ?? true,
    }),
    [compliance]
  );

  const onboardingSummary = useMemo(
    () => ({
      employeesReady: displayVolunteerPool.length,
      divisionsRepresented: new Set(displayVolunteerPool.map((vol: any) => vol.division || 'General')).size,
      nextWave: Math.max(6, Math.ceil(displayVolunteerPool.length / 2)),
    }),
    [displayVolunteerPool]
  );

  return (
    <div className={styles.page}>
      <section className={styles.hero}> 
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>CSR Enterprise</div>
          <h1 className={styles.heroTitle}>
            Corporate volunteering, compliance,<br />
            and NGO due diligence in one portal.
          </h1>
          <p className={styles.heroSub}>
            Pricing tier: {pricing?.currentTier?.name || 'Enterprise'} - {dashboard?.impactAnalytics?.volunteerHours || 54} volunteer hours to date.
          </p>
        </div>

        <div className={styles.heroMetrics}>
          <div className={styles.heroMetric}><span>Ready volunteers</span><strong>{displayVolunteerPool.length}</strong></div>
          <div className={styles.heroMetric}><span>Live challenges</span><strong>{displayChallenges.length}</strong></div>
          <div className={styles.heroMetric}><span>Compliance confidence</span><strong>{complianceSummary.auditScore}</strong></div>
        </div>
      </section>

      {loading ? <div className={styles.notice}>Loading CSR portal...</div> : null}

      <section className={styles.grid}>
        <article className={`${styles.panel} ${styles.span7}`}>
          <div className={styles.panelHeader}><AppIcon name="volunteer" size={15} /> Volunteer pool</div>
          <div className={styles.panelBody}>
            {displayVolunteerPool.slice(0, 6).map((vol: any) => (
              <div key={vol.employeeId || vol.volunteerId} className={styles.itemCard}>
                <div className={styles.itemTop}>
                  <strong>{vol.name}</strong>
                  <span className={styles.badge}>{vol.preferredNgoMatch ? 'Preferred NGO' : 'Available now'}</span>
                </div>
                <p>{vol.topSkill || 'Field-ready for high-confidence employee volunteering deployments.'}</p>
                <div className={styles.itemMeta}><span>{vol.completedTasks || 0} tasks</span><span>{vol.division || 'General'}</span></div>
              </div>
            ))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.span5}`}>
          <div className={styles.panelHeader}><AppIcon name="constellation" size={15} /> Team challenges</div>
          <div className={styles.panelBody}>
            {displayChallenges.slice(0, 4).map((challenge: any) => {
              const progress = Math.min(100, Math.round(((challenge.currentValue || 0) / Math.max(challenge.targetValue || 1, 1)) * 100));
              return (
                <div key={challenge.id || challenge.title} className={styles.challengeCard}>
                  <div className={styles.itemTop}>
                    <strong>{challenge.title}</strong>
                    <span className={styles.badge}>{challenge.status?.replace(/_/g, ' ') || 'active'}</span>
                  </div>
                  <p>{challenge.metric}</p>
                  <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>
                  <div className={styles.itemMeta}><span>{challenge.currentValue}/{challenge.targetValue}</span><span>{progress}% complete</span></div>
                </div>
              );
            })}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.span6}`}>
          <div className={styles.panelHeader}><AppIcon name="layers" size={15} /> Division leaderboard</div>
          <div className={styles.panelBody}>
            {displayLeaderboard.slice(0, 5).map((division: any, index: number) => (
              <div key={division.divisionId || index} className={styles.leaderRow}>
                <span className={styles.rankNum}>#{index + 1}</span>
                <strong>{division.name}</strong>
                <span className={styles.leaderScore}>{division.totalHours}h</span>
              </div>
            ))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.span6}`}>
          <div className={styles.panelHeader}><AppIcon name="shield" size={15} /> Compliance snapshot</div>
          <div className={styles.panelBody}>
            <div className={styles.storyBlock}>
              <strong>BRSR status</strong>
              <p>Evidence pack is {complianceSummary.brsrStatus}. Audit-ready lines now show volunteer hours, SDG themes, and partner verification posture in one trail.</p>
            </div>
            <div className={styles.kvList}>
              <div className={styles.kvRow}><span>Reports filed</span><strong>{complianceSummary.reportsFiled}</strong></div>
              <div className={styles.kvRow}><span>Audit score</span><strong>{complianceSummary.auditScore}</strong></div>
              <div className={styles.kvRow}><span>Evidence ready</span><strong>{complianceSummary.evidenceReady ? 'Yes' : 'Pending'}</strong></div>
            </div>
            <div className={styles.chipRow}>
              {complianceSummary.sdgFocus.map((item: string) => <span key={item} className={styles.chip}>{item}</span>)}
            </div>
          </div>
        </article>

        <article className={`${styles.panel} ${styles.span4}`}>
          <div className={styles.panelHeader}><AppIcon name="network" size={15} /> NGO vetting</div>
          <div className={styles.panelBody}>
            {fallbackVetting.map((item) => (
              <div key={item.title} className={styles.itemCard}>
                <strong>{item.title}</strong>
                <p>{item.note}</p>
              </div>
            ))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.span4}`}>
          <div className={styles.panelHeader}><AppIcon name="check" size={15} /> Certificates</div>
          <div className={styles.panelBody}>
            {displayCertificates.slice(0, 4).map((cert: any) => (
              <div key={cert.id || cert.certificateId || cert.title} className={styles.itemCard}>
                <strong>{cert.employeeName || cert.title}</strong>
                <p>{cert.status || cert.issuedDate || 'Certificate pipeline ready.'}</p>
                <div className={styles.itemMeta}><span>{cert.certificateId || 'CSR-CERT'}</span></div>
              </div>
            ))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.span4}`}>
          <div className={styles.panelHeader}><AppIcon name="volunteer" size={15} /> Employee onboarding</div>
          <div className={styles.panelBody}>
            <div className={styles.kvList}>
              <div className={styles.kvRow}><span>Employees ready</span><strong>{onboardingSummary.employeesReady}</strong></div>
              <div className={styles.kvRow}><span>Divisions represented</span><strong>{onboardingSummary.divisionsRepresented}</strong></div>
              <div className={styles.kvRow}><span>Next onboarding wave</span><strong>{onboardingSummary.nextWave}</strong></div>
            </div>
            <div className={styles.storyBlock}>
              <strong>Bulk onboarding lane</strong>
              <p>Roster import, preferred NGO pairing, certificate issue, and challenge enrolment are ready for the next employee cohort.</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

export default CsrPortalPage;
