import { useEffect, useMemo, useState } from 'react';
import { getDashboardOverview } from '../../services/api';
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
      location: {
        district: string | null;
        state: string | null;
      };
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

function PipelineColumn({ title, items }: { title: string; items: any[] }) {
  return (
    <div className={styles.column}>
      <h3 className={styles.columnTitle}>{title} ({items.length})</h3>
      <div className={styles.list}>
        {items.slice(0, 6).map((item) => (
          <div className={styles.item} key={item.reportId}>
            <strong>{formatCategory(item.category)}</strong>
            <div className={styles.meta}>
              <span className={styles.pill}>{item.urgency}</span>
              {item.slaBreached ? <span className={styles.pill}>SLA Breach</span> : null}
            </div>
            <small>{item.timeInStageHours}h in stage</small>
            {item.escalationDraft ? <p>{item.escalationDraft}</p> : null}
          </div>
        ))}
        {items.length === 0 ? <div className={styles.empty}>No records</div> : null}
      </div>
    </div>
  );
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

  const topLiveTasks = useMemo(() => data?.liveOperations.activeTasks.slice(0, 6) || [], [data]);
  const topBurnout = useMemo(
    () => data?.volunteerHealth.volunteers.filter((item) => item.burnoutRisk).slice(0, 6) || [],
    [data]
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div>
            <h1 className={styles.title}>NGO Intelligence Dashboard</h1>
            <p className={styles.subtitle}>
              Coordinator command center for live operations, volunteer health, analytics, and forecasting.
            </p>
            {data ? <p className={styles.subtitle}>Last sync: {niceDate(data.generatedAt)}</p> : null}
          </div>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Active Tasks</div>
              <div className={styles.statValue}>{data?.liveOperations.activeCount ?? 0}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Stalled</div>
              <div className={styles.statValue}>{data?.liveOperations.stalledCount ?? 0}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Volunteers</div>
              <div className={styles.statValue}>{data?.volunteerHealth.totalVolunteers ?? 0}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Beneficiaries</div>
              <div className={styles.statValue}>{data?.impactAnalytics.beneficiariesServed ?? 0}</div>
            </div>
          </div>
        </section>

        {loading ? <div className={styles.card}>Loading dashboard...</div> : null}
        {error ? <div className={styles.card}>Error: {error}</div> : null}

        {data ? (
          <div className={styles.grid}>
            <section className={`${styles.card} ${styles.span7}`}>
              <h2>Live Operations</h2>
              <p>Real-time active deployments and stalled-task rerouting suggestions.</p>
              <div className={styles.list}>
                {topLiveTasks.map((task) => (
                  <div className={styles.item} key={task.reportId}>
                    <strong>{formatCategory(task.category)} · {task.urgency}</strong>
                    <div className={styles.meta}>
                      <span className={styles.pill}>{task.status}</span>
                      {task.stalled ? <span className={styles.pill}>Stalled</span> : null}
                      <span>{task.location.district || 'Unknown zone'}</span>
                      <span>{niceDate(task.lastActivity)}</span>
                    </div>
                    {task.rerouteSuggestion ? <p>{task.rerouteSuggestion}</p> : null}
                  </div>
                ))}
                {topLiveTasks.length === 0 ? <div className={styles.empty}>No active operations.</div> : null}
              </div>
            </section>

            <section className={`${styles.card} ${styles.span5}`}>
              <h2>Volunteer Health Index</h2>
              <p>Burnout risk detection and AI appreciation prompts.</p>
              <div className={styles.list}>
                {topBurnout.map((volunteer) => (
                  <div className={styles.item} key={volunteer.volunteerId}>
                    <strong>{volunteer.name}</strong>
                    <div className={styles.meta}>
                      <span className={styles.pill}>Reliability {Math.round(volunteer.reliabilityScore * 100)}%</span>
                      <span className={styles.pill}>{volunteer.tasksLast7d} tasks/7d</span>
                    </div>
                    <p>{volunteer.appreciationMessage}</p>
                  </div>
                ))}
                {topBurnout.length === 0 ? <div className={styles.empty}>No burnout-risk volunteers right now.</div> : null}
              </div>
            </section>

            <section className={`${styles.card} ${styles.span12}`}>
              <h2>Needs Pipeline</h2>
              <p>Kanban flow with SLA breach alerts and escalation drafts.</p>
              <div className={styles.kanban}>
                <PipelineColumn title="Unassigned" items={data.needsPipeline.unassigned} />
                <PipelineColumn title="Assigned" items={data.needsPipeline.assigned} />
                <PipelineColumn title="In-Progress" items={data.needsPipeline.inProgress} />
                <PipelineColumn title="Resolved" items={data.needsPipeline.resolved} />
              </div>
            </section>

            <section className={`${styles.card} ${styles.span6}`}>
              <h2>Impact Analytics</h2>
              <p>Beneficiaries, volunteer effort, category outcomes, and response trend.</p>
              <div className={styles.meta}>
                <span className={styles.pill}>Avg response {data.impactAnalytics.averageResponseTimeHours}h</span>
                <span className={styles.pill}>Volunteer hours {data.impactAnalytics.volunteerHours}</span>
              </div>
              <div className={styles.list}>
                {Object.entries(data.impactAnalytics.resolvedByCategory).map(([category, count]) => (
                  <div className={styles.item} key={category}>
                    <strong>{formatCategory(category)}</strong>
                    <div>{count} resolved</div>
                  </div>
                ))}
              </div>
              <div className={styles.narrative}>
                <strong>Impact Narrative (EN)</strong>
                <p>{data.impactAnalytics.impactNarrativeEn}</p>
                <strong>Impact Narrative (HI)</strong>
                <p>{data.impactAnalytics.impactNarrativeHi}</p>
              </div>
            </section>

            <section className={`${styles.card} ${styles.span6}`}>
              <h2>Resource Inventory</h2>
              <p>Stock levels with predictive depletion alerts.</p>
              <div className={styles.list}>
                {data.resourceInventory.items.map((item) => (
                  <div className={styles.item} key={item.id}>
                    <strong>{item.name}</strong>
                    <div className={styles.meta}>
                      <span>{item.quantity} {item.unit}</span>
                      <span>{item.location}</span>
                      <span>{item.daysRemaining} days left</span>
                      {item.depletionAlert ? <span className={styles.pill}>Depletion Alert</span> : null}
                    </div>
                    {item.recommendation ? <p>{item.recommendation}</p> : null}
                  </div>
                ))}
              </div>
            </section>

            <section className={`${styles.card} ${styles.span4}`}>
              <h2>SDG Alignment</h2>
              <p>Activity linkage to SDG goals and BRSR/GRI summary.</p>
              <div className={styles.list}>
                {Object.entries(data.sdgAlignment.mapping).map(([sdg, count]) => (
                  <div className={styles.item} key={sdg}>
                    <strong>{sdg}</strong>
                    <div>{count} linked activities</div>
                  </div>
                ))}
              </div>
              <div className={styles.narrative}>
                <p>{data.sdgAlignment.brsrSummary}</p>
              </div>
            </section>

            <section className={`${styles.card} ${styles.span4}`}>
              <h2>Surge Forecast</h2>
              <p>{data.surgeForecast.horizonDays}-day predictive demand by zone and category.</p>
              <div className={styles.list}>
                {data.surgeForecast.forecasts.map((forecast, index) => (
                  <div className={styles.item} key={`${forecast.zone}-${forecast.category}-${index}`}>
                    <strong>{forecast.zone} · {formatCategory(forecast.category)}</strong>
                    <div className={styles.meta}>
                      <span>{forecast.observed14d} observed</span>
                      <span>{forecast.projected14d} projected</span>
                    </div>
                    <p>{forecast.recommendation}</p>
                  </div>
                ))}
                {data.surgeForecast.forecasts.length === 0 ? <div className={styles.empty}>No surge signal yet.</div> : null}
              </div>
            </section>

            <section className={`${styles.card} ${styles.span4}`}>
              <h2>Cross-NGO Coordination</h2>
              <p>Overlap visibility and duplicate response alerts.</p>
              <div className={styles.list}>
                {data.crossNgoCoordination.overlaps.map((overlap, index) => (
                  <div className={styles.item} key={`${overlap.zone}-${overlap.category}-${index}`}>
                    <strong>{overlap.zone} · {formatCategory(overlap.category)}</strong>
                    <div className={styles.meta}>
                      {overlap.ngos.map((ngo) => (
                        <span className={styles.pill} key={ngo}>{ngo}</span>
                      ))}
                    </div>
                    <p>{overlap.alert}</p>
                  </div>
                ))}
                {data.crossNgoCoordination.overlaps.length === 0 ? (
                  <div className={styles.empty}>No overlap alerts right now.</div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default NgoDashboard;
