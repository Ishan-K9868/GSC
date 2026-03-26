import { useEffect, useMemo, useState } from 'react';
import {
  applyDispatchOverride,
  getDispatchTasks,
  runDispatchHeartbeat as runDispatchHeartbeatRequest,
} from '../../services/api';
import { AppIcon } from '../../components/shared';
import styles from './SevaAgentDashboard.module.css';

type DispatchTask = {
  id: string;
  needReportId: string;
  category: string;
  urgency: string;
  status: string;
  rankedDecisions: Array<{
    volunteerId: string;
    volunteerName: string;
    totalScore: number;
    explanation: string;
    distanceKm: number;
  }>;
  acceptedVolunteerId?: string;
  coordinatorOverride?: {
    overridden?: boolean;
    reason?: string;
    selectedVolunteerId?: string;
  };
  createdAt: string;
};

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatCategory(value: string): string {
  return value.replace(/_/g, ' ');
}

export function SevaAgentDashboard() {
  const [tasks, setTasks] = useState<DispatchTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [overrideVolunteerId, setOverrideVolunteerId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [runningHeartbeat, setRunningHeartbeat] = useState(false);

  useEffect(() => {
    void fetchTasks();
  }, []);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || tasks[0],
    [tasks, selectedTaskId]
  );

  const metrics = useMemo(() => {
    const accepted = tasks.filter((task) => task.acceptedVolunteerId).length;
    const overrideCount = tasks.filter((task) => task.coordinatorOverride?.overridden).length;
    const lowConfidence = tasks.filter((task) => (task.rankedDecisions[0]?.totalScore || 0) < 0.72).length;
    return {
      queue: tasks.length,
      accepted,
      overrideCount,
      lowConfidence,
    };
  }, [tasks]);

  useEffect(() => {
    if (selectedTask?.rankedDecisions?.[0]) {
      setOverrideVolunteerId(selectedTask.rankedDecisions[0].volunteerId);
    }
  }, [selectedTask?.id]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const response = await getDispatchTasks();
      if (!response.success || !response.data) {
        setTasks([]);
        return;
      }

      const list: DispatchTask[] = response.data.tasks || [];
      setTasks(list);
      if (list[0]) setSelectedTaskId((current) => current || list[0].id);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  async function runHeartbeat() {
    setRunningHeartbeat(true);
    await runDispatchHeartbeatRequest();
    setRunningHeartbeat(false);
    await fetchTasks();
  }

  async function applyOverride() {
    if (!selectedTask || !overrideVolunteerId || !overrideReason.trim()) return;
    await applyDispatchOverride(selectedTask.id, {
      selectedVolunteerId: overrideVolunteerId,
      reason: overrideReason,
    });

    setOverrideReason('');
    await fetchTasks();
  }

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>Dispatch Control</div>
          <h1 className={styles.heroTitle}>
            Review every match before the queue<br />
            becomes tomorrow's delay.
          </h1>
          <p className={styles.heroSub}>
            Queue on the left, ranked reasoning in the center, and coordinator action on the right.
          </p>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.btnGhost} type="button" onClick={() => void runHeartbeat()}>
            <AppIcon name="alert" size={15} />
            {runningHeartbeat ? 'Running...' : 'Heartbeat'}
          </button>
          <button className={styles.btnPrimary} type="button" onClick={() => void fetchTasks()}>
            <AppIcon name="dispatch" size={15} />
            Refresh
          </button>
        </div>
      </section>

      {/* Metrics Strip */}
      <section className={styles.metricStrip}>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Queue</span>
          <strong className={styles.metricValue}>{metrics.queue}</strong>
          <span className={styles.metricHint}>awaiting review</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Accepted</span>
          <strong className={styles.metricValue}>{metrics.accepted}</strong>
          <span className={styles.metricHint}>owned by responder</span>
        </article>
        <article className={styles.metricCard} data-accent="amber">
          <span className={styles.metricLabel}>Overrides</span>
          <strong className={styles.metricValue}>{metrics.overrideCount}</strong>
          <span className={styles.metricHint}>coordinator interventions</span>
        </article>
        <article className={styles.metricCard} data-warn={metrics.lowConfidence > 0 ? '' : undefined}>
          <span className={styles.metricLabel}>Low confidence</span>
          <strong className={styles.metricValue}>{metrics.lowConfidence}</strong>
          <span className={styles.metricHint}>needs review</span>
        </article>
      </section>

      {/* Three-Panel Dispatch Desk */}
      <section className={styles.desk}>
        {/* Left: Queue */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <AppIcon name="layers" size={15} />
            Dispatch Queue
          </div>
          {loading ? <p className={styles.notice}>Loading dispatch tasks...</p> : null}
          <div className={styles.queueList}>
            {tasks.map((task) => {
              const best = task.rankedDecisions[0];
              const isActive = selectedTask?.id === task.id;
              return (
                <button
                  key={task.id}
                  type="button"
                  className={`${styles.queueCard} ${isActive ? styles.queueCardActive : ''}`}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className={styles.queueTop}>
                    <strong>{formatCategory(task.category)}</strong>
                    <span className={styles.urgencyPill} data-urgency={task.urgency}>{task.urgency}</span>
                  </div>
                  <div className={styles.queueMeta}>
                    <span>{task.status}</span>
                    <span>{formatDateTime(task.createdAt)}</span>
                  </div>
                  <p className={styles.queueHint}>
                    Best: {best?.volunteerName || 'No ranking'} ·
                    {' '}{Math.round((best?.totalScore || 0) * 100)} score
                  </p>
                </button>
              );
            })}
            {tasks.length === 0 && !loading ? <p className={styles.notice}>No dispatch tasks yet.</p> : null}
          </div>
        </div>

        {/* Center: Ranked Decisions */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <AppIcon name="spark" size={15} />
            Ranked Decisions
          </div>
          {!selectedTask ? (
            <p className={styles.notice}>Select a queue item to inspect ranking logic.</p>
          ) : (
            <div className={styles.decisionContent}>
              <div className={styles.selectedCard}>
                <span className={styles.eyebrowSmall}>Selected report</span>
                <strong>{selectedTask.needReportId}</strong>
                <div className={styles.queueMeta}>
                  <span>{formatCategory(selectedTask.category)}</span>
                  <span>{selectedTask.status}</span>
                </div>
              </div>
              <div className={styles.decisionList}>
                {selectedTask.rankedDecisions.slice(0, 4).map((decision, index) => (
                  <article key={decision.volunteerId} className={styles.decisionCard}>
                    <div className={styles.decisionTop}>
                      <span className={styles.rankBadge}>#{index + 1}</span>
                      <strong>{decision.volunteerName}</strong>
                      <span className={styles.scorePill}>{Math.round(decision.totalScore * 100)}</span>
                    </div>
                    <div className={styles.queueMeta}>
                      <span>{decision.distanceKm.toFixed(1)} km</span>
                      <span>{decision.volunteerId}</span>
                    </div>
                    <p className={styles.decisionExplain}>{decision.explanation}</p>
                    {/* Score bar */}
                    <div className={styles.scoreBarTrack}>
                      <div
                        className={styles.scoreBarFill}
                        style={{ width: `${Math.round(decision.totalScore * 100)}%` }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Override */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <AppIcon name="shield" size={15} />
            Coordinator Override
          </div>
          {!selectedTask ? (
            <p className={styles.notice}>Open a task to apply a guided override.</p>
          ) : (
            <div className={styles.overrideContent}>
              <div className={styles.overrideState}>
                <span className={styles.eyebrowSmall}>Current acceptance</span>
                <strong>{selectedTask.acceptedVolunteerId || 'Awaiting acceptance'}</strong>
                <p className={styles.overrideHint}>
                  {selectedTask.coordinatorOverride?.overridden
                    ? selectedTask.coordinatorOverride.reason
                    : 'No intervention yet. Override only when route context beats the ranking.'}
                </p>
              </div>

              <label className={styles.field}>
                <span>Replacement responder</span>
                <select
                  value={overrideVolunteerId}
                  onChange={(e) => setOverrideVolunteerId(e.target.value)}
                  className={styles.select}
                >
                  {selectedTask.rankedDecisions.map((d) => (
                    <option key={d.volunteerId} value={d.volunteerId}>
                      {d.volunteerName} · {Math.round(d.totalScore * 100)} score
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Override reason</span>
                <textarea
                  className={styles.textarea}
                  placeholder="Route familiarity, local trust, on-ground constraints..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </label>

              <button className={styles.btnPrimary} type="button" onClick={() => void applyOverride()}>
                <AppIcon name="check" size={15} />
                Apply Override
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default SevaAgentDashboard;
