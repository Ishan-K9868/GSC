import { useEffect, useMemo, useState } from 'react';
import {
  getCsrPricing,
  bulkOnboardEmployees,
  getCompanyVolunteerPool,
  getCompanyLeaderboard,
  getCompanyBRSR,
  getCompanyAuditTrail,
  getCompanyCertificates,
  createTeamChallenge,
  getTeamChallenges,
  generateNgoVetting,
} from '../../services/api';
import styles from './CsrPortalPage.module.css';

const COMPANY_ID = 'corp_demo_001';
const COMPANY_NAME = 'AstraWorks India';

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function CsrPortalPage() {
  const [pricing, setPricing] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [pool, setPool] = useState<any>(null);
  const [brsr, setBrsr] = useState<any>(null);
  const [auditTrail, setAuditTrail] = useState<any>(null);
  const [certificates, setCertificates] = useState<any>(null);
  const [challenges, setChallenges] = useState<any>(null);
  const [ngoVetting, setNgoVetting] = useState<any>(null);
  const [challengeTitle, setChallengeTitle] = useState('Our Delhi office will distribute 500 food kits this quarter');
  const [loading, setLoading] = useState(false);

  const defaultRows = useMemo(
    () => [
      { employeeId: 'E001', name: 'Ritika Sharma', email: 'ritika@astraworks.com', division: 'Finance', location: 'Delhi' },
      { employeeId: 'E002', name: 'Manav Gupta', email: 'manav@astraworks.com', division: 'Engineering', location: 'Noida' },
      { employeeId: 'E003', name: 'Sana Khan', email: 'sana@astraworks.com', division: 'People Ops', location: 'Gurgaon' },
    ],
    []
  );

  useEffect(() => {
    void loadPortal();
  }, []);

  async function loadPortal() {
    setLoading(true);
    const [pricingRes, poolRes, boardRes, brsrRes, auditRes, certRes, challengeRes] = await Promise.all([
      getCsrPricing(),
      getCompanyVolunteerPool(COMPANY_ID, ['SDG 2', 'SDG 3', 'SDG 11']),
      getCompanyLeaderboard(COMPANY_ID),
      getCompanyBRSR(COMPANY_ID),
      getCompanyAuditTrail(COMPANY_ID),
      getCompanyCertificates(COMPANY_ID),
      getTeamChallenges(COMPANY_ID),
    ]);

    if (pricingRes.success) setPricing(pricingRes.data);
    if (poolRes.success) setPool(poolRes.data);
    if (boardRes.success) setLeaderboard(boardRes.data);
    if (brsrRes.success) setBrsr(brsrRes.data);
    if (auditRes.success) setAuditTrail(auditRes.data);
    if (certRes.success) setCertificates(certRes.data);
    if (challengeRes.success) setChallenges(challengeRes.data);
    setLoading(false);
  }

  async function runBulkOnboard() {
    await bulkOnboardEmployees(COMPANY_ID, COMPANY_NAME, defaultRows);
    await loadPortal();
  }

  async function runCreateChallenge() {
    await createTeamChallenge({
      companyId: COMPANY_ID,
      title: challengeTitle,
      targetValue: 500,
      metric: 'food_kits',
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await loadPortal();
  }

  async function runNgoVetting() {
    const res = await generateNgoVetting({
      ngoName: 'Sahyog Foundation',
      fcraStatus: 'active',
      darpanRating: 'good',
      pastProjects: ['Flood response 2024', 'School nutrition drive', 'Urban hygiene initiative'],
      mediaCoverageNotes: 'Positive local coverage with no major controversy signals.',
    });
    setNgoVetting(res.data || res.error);
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <h1 className={styles.title}>Corporate CSR Portal</h1>
          <p className={styles.sub}>
            Employee volunteer management, compliance automation, and impact governance for enterprise CSR teams.
          </p>
          {pricing ? (
            <div className={styles.pricing}>
              {pricing.tier} · INR {pricing.priceMonthlyInr}/month
            </div>
          ) : null}
        </section>

        <div className={styles.grid}>
          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Employee Onboarding</h2>
            <p>Bulk onboarding auto-creates volunteer profiles from roster uploads.</p>
            <div className={styles.row}>
              <button className="btn btn-primary" type="button" onClick={() => void runBulkOnboard()}>
                Bulk Onboard Demo Employees
              </button>
            </div>
            <div className={styles.list}>
              {defaultRows.map((row) => (
                <div className={styles.item} key={row.employeeId}>
                  <strong>{row.name}</strong>
                  <div className={styles.meta}>
                    <span className={styles.pill}>{row.employeeId}</span>
                    <span>{row.division}</span>
                    <span>{row.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Dedicated Company Volunteer Pool</h2>
            <p>Alignment score against selected SDG areas and preferred NGO network.</p>
            <div className={styles.list}>
              {(pool?.volunteers || []).slice(0, 6).map((vol: any) => (
                <div className={styles.item} key={vol.volunteerId}>
                  <strong>{vol.name}</strong>
                  <div className={styles.meta}>
                    <span className={styles.pill}>{vol.division}</span>
                    <span>Alignment {Math.round((vol.alignmentScore || 0) * 100)}%</span>
                    <span>Reliability {Math.round((vol.reliabilityScore || 0) * 100)}%</span>
                  </div>
                </div>
              ))}
              {(!pool || (pool?.volunteers || []).length === 0) && <div className={styles.item}>No volunteers yet.</div>}
            </div>
          </section>

          <section className={`${styles.card} ${styles.span7}`}>
            <h2>Live Leaderboard</h2>
            <p>Volunteer hours across divisions with top employee highlights.</p>
            <div className={styles.list}>
              {(leaderboard?.divisionLeaderboard || []).map((row: any) => (
                <div className={styles.item} key={row.division}>
                  <strong>{row.division}</strong>
                  <div className={styles.meta}>
                    <span>{row.hours.toFixed(1)} hours</span>
                    <span>{row.volunteers} volunteers</span>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.meta}>
              Top employees: {(leaderboard?.topEmployees || []).slice(0, 3).map((emp: any) => emp.name).join(', ') || 'N/A'}
            </div>
          </section>

          <section className={`${styles.card} ${styles.span5}`}>
            <h2>Team Challenges</h2>
            <input
              className={styles.input}
              value={challengeTitle}
              onChange={(e) => setChallengeTitle(e.target.value)}
            />
            <button className="btn btn-primary" type="button" onClick={() => void runCreateChallenge()}>
              Create Challenge
            </button>
            <div className={styles.list}>
              {(challenges?.challenges || []).slice(0, 5).map((c: any) => (
                <div className={styles.item} key={c.id}>
                  <strong>{c.title}</strong>
                  <div className={styles.meta}>
                    <span className={styles.pill}>{c.metric}</span>
                    <span>{c.currentValue}/{c.targetValue}</span>
                    <span>{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.card} ${styles.span8}`}>
            <h2>BRSR Section C + GRI 413 Automation</h2>
            <p>One-click compliance-ready social capital metrics and methodology notes.</p>
            <div className={styles.output}>{pretty(brsr || { info: 'BRSR not loaded yet' })}</div>
          </section>

          <section className={`${styles.card} ${styles.span4}`}>
            <h2>Impact Certificates</h2>
            <div className={styles.list}>
              {(certificates?.certificates || []).slice(0, 5).map((cert: any) => (
                <div className={styles.item} key={cert.certificateId}>
                  <strong>{cert.employeeName}</strong>
                  <div className={styles.meta}>
                    <span className={styles.pill}>{cert.certificateId}</span>
                    <a href={cert.pdfUrl} target="_blank" rel="noreferrer">PDF</a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>NGO Vetting</h2>
            <button className="btn btn-primary" type="button" onClick={() => void runNgoVetting()}>
              Generate Vetting Brief
            </button>
            <div className={styles.output}>{pretty(ngoVetting || { info: 'Run vetting to generate report' })}</div>
          </section>

          <section className={`${styles.card} ${styles.span6}`}>
            <h2>Cryptographic Audit Trail</h2>
            <p>Signed records for volunteer hours and need-resolution events.</p>
            <div className={styles.output}>{pretty(auditTrail || { info: 'Audit trail not loaded yet' })}</div>
          </section>
        </div>

        {loading ? <div className={styles.card}>Loading CSR portal data...</div> : null}
      </div>
    </div>
  );
}

export default CsrPortalPage;
