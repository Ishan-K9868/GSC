import { useEffect, useState } from 'react';
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
    const [dashRes, poolRes, compRes, leadRes, challRes, certRes, priceRes] =
      await Promise.all([
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
            Pricing tier: {pricing?.currentTier?.name || 'Loading...'} — {dashboard?.impactAnalytics?.volunteerHours || 0} volunteer hours to date.
          </p>
        </div>
      </section>

      {loading ? <div className={styles.notice}>Loading CSR portal...</div> : null}

      <section className={styles.grid}>
        {/* Volunteer Pool */}
        <article className={`${styles.panel} ${styles.span7}`}>
          <div className={styles.panelHeader}><AppIcon name="volunteer" size={15} /> Volunteer pool</div>
          <div className={styles.panelBody}>
            {volunteerPool.slice(0, 6).map((vol: any) => (
              <div key={vol.employeeId || vol.volunteerId} className={styles.itemCard}>
                <div className={styles.itemTop}>
                  <strong>{vol.name}</strong>
                  <span className={styles.badge}>{vol.preferredNgoMatch ? 'Preferred NGO' : 'Available'}</span>
                </div>
                <div className={styles.itemMeta}><span>{vol.completedTasks || 0} tasks</span><span>{vol.division}</span></div>
              </div>
            ))}
          </div>
        </article>

        {/* Team Challenges */}
        <article className={`${styles.panel} ${styles.span5}`}>
          <div className={styles.panelHeader}><AppIcon name="constellation" size={15} /> Team challenges</div>
          <div className={styles.panelBody}>
            {teamChallenges.slice(0, 4).map((ch: any) => (
              <div key={ch.id || ch.title} className={styles.itemCard}>
                <strong>{ch.title}</strong>
                <p>{ch.metric}</p>
                <div className={styles.itemMeta}><span>{ch.currentValue}/{ch.targetValue}</span><span>{ch.status}</span></div>
              </div>
            ))}
          </div>
        </article>

        {/* Division Leaderboard */}
        <article className={`${styles.panel} ${styles.span6}`}>
          <div className={styles.panelHeader}><AppIcon name="layers" size={15} /> Division leaderboard</div>
          <div className={styles.panelBody}>
            {leaderboard.slice(0, 5).map((div: any, i: number) => (
              <div key={div.divisionId || i} className={styles.leaderRow}>
                <span className={styles.rankNum}>#{i + 1}</span>
                <strong>{div.name}</strong>
                <span className={styles.leaderScore}>{div.totalHours}h</span>
              </div>
            ))}
          </div>
        </article>

        {/* Compliance */}
        <article className={`${styles.panel} ${styles.span6}`}>
          <div className={styles.panelHeader}><AppIcon name="shield" size={15} /> Compliance snapshot</div>
          <div className={styles.panelBody}>
            <div className={styles.storyBlock}>
              <strong>BRSR status</strong>
              <p>{compliance?.brsrStatus || 'No compliance data loaded yet.'}</p>
            </div>
            <div className={styles.kvList}>
              <div className={styles.kvRow}><span>Reports filed</span><strong>{compliance?.reportsFiled || 0}</strong></div>
              <div className={styles.kvRow}><span>Audit score</span><strong>{compliance?.auditScore || 'N/A'}</strong></div>
            </div>
          </div>
        </article>

        {/* NGO Vetting */}
        <article className={`${styles.panel} ${styles.span4}`}>
          <div className={styles.panelHeader}><AppIcon name="network" size={15} /> NGO vetting</div>
          <div className={styles.panelBody}>
            <p className={styles.notice}>NGO vetting data available on request.</p>
          </div>
        </article>

        {/* Certificates */}
        <article className={`${styles.panel} ${styles.span4}`}>
          <div className={styles.panelHeader}><AppIcon name="check" size={15} /> Certificates</div>
          <div className={styles.panelBody}>
            {certificates.slice(0, 4).map((cert: any) => (
              <div key={cert.id || cert.certificateId || cert.title} className={styles.itemCard}>
                <strong>{cert.employeeName || cert.title}</strong>
                <p>{cert.certificateId || cert.issuedDate || cert.status}</p>
              </div>
            ))}
          </div>
        </article>

        {/* Employee Onboarding */}
        <article className={`${styles.panel} ${styles.span4}`}>
          <div className={styles.panelHeader}><AppIcon name="volunteer" size={15} /> Employee onboarding</div>
          <div className={styles.panelBody}>
            <p className={styles.notice}>Bulk employee onboarding available via CSR portal.</p>
          </div>
        </article>
      </section>
    </div>
  );
}

export default CsrPortalPage;
