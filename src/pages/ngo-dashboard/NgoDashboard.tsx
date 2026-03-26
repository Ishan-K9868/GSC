import { useEffect, useMemo, useState } from 'react';
import { getDashboardOverview } from '../../services/api';
import { AppIcon } from '../../components/shared';
import styles from './NgoDashboard.module.css';

type DashboardOverview = {
  liveOperations: {
    activeCount: number;
    stalledCount: number;
    activeTasks: Array<{
      reportId: string;
      category: string;
      urgency: string;
      status: string;
      volunteerId: string | null;
      ngoId: string | null;
      lastActivity: string;
      stalled: boolean;
      rerouteSuggestion?: string;
      location: { district: string | null; state: string | null };
    }>;
  };
  volunteerHealth: {
    totalVolunteers: number;
    burnoutRiskCount: number;
    volunteers: Array<{
      volunteerId: string;
      name: string;
      reliabilityScore: number;
      activeTasks: number;
      tasksLast7d: number;
      burnoutRisk: boolean;
      skills: string[];
      appreciationMessage: string;
      lastActiveAt: string;
    }>;
  };
  needsPipeline: {
    unassigned: any[];
    assigned: any[];
    inProgress: any[];
    resolved: any[];
  };
  impactAnalytics: {
    beneficiariesServed: number;
    volunteerHours: number;
    resolvedByCategory: Record<string, number>;
    averageResponseTimeHours: number;
    responseTimeTrend: Array<{ week: string; avgHours: number }>;
    impactNarrativeEn: string;
    impactNarrativeHi: string;
  };
  resourceInventory: {
    totalItems: number;
    depletionAlerts: number;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
      location: string;
      daysRemaining: number;
      depletionAlert: boolean;
      recommendation: string | null;
    }>;
  };
  sdgAlignment: {
    mapping: Record<string, number>;
    brsrSummary: string;
  };
  surgeForecast: {
    horizonDays: number;
    forecasts: Array<{
      zone: string;
      category: string;
      observed14d: number;
      projected14d: number;
      recommendation: string;
    }>;
  };
  crossNgoCoordination: {
    overlapCount: number;
    overlaps: Array<{
      zone: string;
      category: string;
      ngos: string[];
      alert: string;
    }>;
  };
  generatedAt: string;
};

function niceDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatCategory(value: string): string {
  return value.replace(/_/g, ' ');
}

export function NgoDashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    const response = await getDashboardOverview();
    if (!response.success || !response.data) {
      setError(response.error?.message || 'Failed to load dashboard');
      setLoading(false);
      return;
    }
    setData(response.data as DashboardOverview);
    setLoading(false);
  }

  const topLiveTasks = useMemo(() => data?.liveOperations.activeTasks.slice(0, 5) || [], [data]);
  const topBurnout = useMemo(
    () => data?.volunteerHealth.volunteers.filter((v) => v.burnoutRisk).slice(0, 4) || [],
    [data]
  );
  const pipelineColumns = useMemo(
    () => [
      { title: 'Unassigned', items: data?.needsPipeline.unassigned || [] },
      { title: 'Assigned', items: data?.needsPipeline.assigned || [] },
      { title: 'In Progress', items: data?.needsPipeline.inProgress || [] },
      { title: 'Resolved', items: data?.needsPipeline.resolved || [] },
    ],
    [data]
  );

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>NGO Intelligence</div>
          <h1 className={styles.heroTitle}>
            Command the field, the volunteer pulse,<br />
            and the donor story from one surface.
          </h1>
          <p className={styles.heroSub}>
            Live operations first, then health, supplies, impact, and coordination.
          </p>
        </div>
        <div className={styles.heroActions}>
          <div className={styles.liveCard}>
            <span className={styles.liveDot} />
            Synced {data ? niceDate(data.generatedAt) : 'just now'}
          </div>
          <button className={styles.btnPrimary} type="button" onClick={() => void loadDashboard()}>
            Refresh
          </button>
        </div>
      </section>

      {/* Metric Strip */}
      <section className={styles.metricStrip}>
        <article className={styles.metricCard}>
          <span>Active deployments</span>
          <strong>{data?.liveOperations.activeCount ?? 0}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Stalled attention</span>
          <strong>{data?.liveOperations.stalledCount ?? 0}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Volunteer base</span>
          <strong>{data?.volunteerHealth.totalVolunteers ?? 0}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Beneficiaries</span>
          <strong>{data?.impactAnalytics.beneficiariesServed ?? 0}</strong>
        </article>
      </section>

      {loading ? <div className={styles.notice}>Loading NGO dashboard...</div> : null}
      {error ? <div className={styles.notice}>{error}</div> : null}

      {data ? (
        <section className={styles.grid}>
          {/* Live Operations */}
          <article className={`${styles.panel} ${styles.span7}`}>
            <div className={styles.panelHeader}>
              <AppIcon name="dispatch" size={15} /> Live operations
            </div>
            <div className={styles.panelBody}>
              {topLiveTasks.map((task) => (
                <div key={task.reportId} className={styles.taskCard}>
                  <div className={styles.taskTop}>
                    <strong>{formatCategory(task.category)}</strong>
                    <span className={`${styles.badge} ${task.stalled ? styles.badgeAlert : ''}`}>{task.urgency}</span>
                  </div>
                  <div className={styles.taskMeta}>
                    <span>{task.status}</span>
                    <span>{task.location.district || 'Unknown zone'}</span>
                    <span>{niceDate(task.lastActivity)}</span>
                  </div>
                  <p>{task.rerouteSuggestion || 'On track with current assignment.'}</p>
                </div>
              ))}
            </div>
          </article>

          {/* Volunteer Health */}
          <article className={`${styles.panel} ${styles.span5}`}>
            <div className={styles.panelHeader}>
              <AppIcon name="volunteer" size={15} /> Volunteer health
            </div>
            <div className={styles.panelBody}>
              {topBurnout.length > 0 ? (
                topBurnout.map((vol) => (
                  <div key={vol.volunteerId} className={styles.healthCard}>
                    <strong>{vol.name}</strong>
                    <div className={styles.taskMeta}>
                      <span>{Math.round(vol.reliabilityScore * 100)}% reliability</span>
                      <span>{vol.tasksLast7d} tasks/7d</span>
                    </div>
                    <p>{vol.appreciationMessage}</p>
                  </div>
                ))
              ) : (
                <p className={styles.helper}>No burnout-risk volunteers right now.</p>
              )}
            </div>
          </article>

          {/* Pipeline */}
          <article className={`${styles.panel} ${styles.span12}`}>
            <div className={styles.panelHeader}>
              <AppIcon name="layers" size={15} /> Needs pipeline
            </div>
            <div className={styles.pipelineGrid}>
              {pipelineColumns.map((col) => (
                <div key={col.title} className={styles.pipelineCol}>
                  <div className={styles.pipelineColHeader}>{col.title} ({col.items.length})</div>
                  {col.items.slice(0, 4).map((item) => (
                    <div key={item.reportId} className={styles.pipelineCard}>
                      <strong>{formatCategory(item.category)}</strong>
                      <div className={styles.taskMeta}>
                        <span>{item.urgency}</span>
                        <span>{item.timeInStageHours}h in stage</span>
                      </div>
                      {item.escalationDraft ? <p>{item.escalationDraft}</p> : null}
                    </div>
                  ))}
                  {col.items.length === 0 ? <p className={styles.helper}>No records</p> : null}
                </div>
              ))}
            </div>
          </article>

          {/* Impact */}
          <article className={`${styles.panel} ${styles.span6}`}>
            <div className={styles.panelHeader}>
              <AppIcon name="spark" size={15} /> Impact + reporting
            </div>
            <div className={styles.panelBody}>
              <div className={styles.splitMetric}>
                <div><span>Avg response</span><strong>{data.impactAnalytics.averageResponseTimeHours}h</strong></div>
                <div><span>Volunteer hours</span><strong>{data.impactAnalytics.volunteerHours}</strong></div>
              </div>
              <div className={styles.storyBlock}>
                <strong>Donor-ready narrative</strong>
                <p>{data.impactAnalytics.impactNarrativeEn}</p>
                <p>{data.impactAnalytics.impactNarrativeHi}</p>
              </div>
              <div className={styles.kvList}>
                {Object.entries(data.impactAnalytics.resolvedByCategory).map(([cat, count]) => (
                  <div key={cat} className={styles.kvRow}>
                    <span>{formatCategory(cat)}</span><strong>{count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* Supplies */}
          <article className={`${styles.panel} ${styles.span6}`}>
            <div className={styles.panelHeader}>
              <AppIcon name="shield" size={15} /> Supplies + compliance
            </div>
            <div className={styles.panelBody}>
              {data.resourceInventory.items.slice(0, 5).map((item) => (
                <div key={item.id} className={styles.supplyCard}>
                  <strong>{item.name}</strong>
                  <div className={styles.taskMeta}>
                    <span>{item.quantity} {item.unit}</span>
                    <span>{item.location}</span>
                    <span>{item.daysRemaining}d left</span>
                  </div>
                  {item.recommendation ? <p>{item.recommendation}</p> : null}
                </div>
              ))}
              <div className={styles.storyBlock}>
                <strong>BRSR / SDG framing</strong>
                <p>{data.sdgAlignment.brsrSummary}</p>
              </div>
            </div>
          </article>

          {/* Bottom Row: Surge + Cross-NGO + SDG */}
          <article className={`${styles.panel} ${styles.span4}`}>
            <div className={styles.panelHeader}>
              <AppIcon name="alert" size={15} /> Surge forecast
            </div>
            <div className={styles.panelBody}>
              {data.surgeForecast.forecasts.map((f, i) => (
                <div key={`${f.zone}-${i}`} className={styles.compactCard}>
                  <strong>{f.zone}</strong>
                  <div className={styles.taskMeta}>
                    <span>{formatCategory(f.category)}</span>
                    <span>{f.projected14d} projected</span>
                  </div>
                  <p>{f.recommendation}</p>
                </div>
              ))}
            </div>
          </article>

          <article className={`${styles.panel} ${styles.span4}`}>
            <div className={styles.panelHeader}>
              <AppIcon name="network" size={15} /> Cross-NGO coordination
            </div>
            <div className={styles.panelBody}>
              {data.crossNgoCoordination.overlaps.length > 0 ? (
                data.crossNgoCoordination.overlaps.map((o, i) => (
                  <div key={`${o.zone}-${i}`} className={styles.compactCard}>
                    <strong>{o.zone}</strong>
                    <div className={styles.chipRow}>
                      {o.ngos.map((ngo) => <span key={ngo} className={styles.chip}>{ngo}</span>)}
                    </div>
                    <p>{o.alert}</p>
                  </div>
                ))
              ) : (
                <p className={styles.helper}>No overlap alerts.</p>
              )}
            </div>
          </article>

          <article className={`${styles.panel} ${styles.span4}`}>
            <div className={styles.panelHeader}>
              <AppIcon name="csr" size={15} /> SDG footprint
            </div>
            <div className={styles.panelBody}>
              <div className={styles.kvList}>
                {Object.entries(data.sdgAlignment.mapping).map(([sdg, count]) => (
                  <div key={sdg} className={styles.kvRow}>
                    <span>{sdg}</span><strong>{count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>
      ) : null}
    </div>
  );
}

export default NgoDashboard;
