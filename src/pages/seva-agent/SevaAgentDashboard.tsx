import { useEffect, useMemo, useState } from 'react';
import {
  applyDispatchOverride,
  getDispatchTasks,
  runDispatchHeartbeat as runDispatchHeartbeatRequest,
} from '../../services/api';
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

export function SevaAgentDashboard() {
  const [tasks, setTasks] = useState<DispatchTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [overrideVolunteerId, setOverrideVolunteerId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetchTasks();
  }, []);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || tasks[0],
    [tasks, selectedTaskId]
  );

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
      if (list[0]) setSelectedTaskId(list[0].id);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  async function runHeartbeat() {
    await runDispatchHeartbeatRequest();
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
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>SEVA Agent Control Room</h1>
            <p className={styles.subtitle}>
              Monitor autonomous dispatch, review ranked matches, and apply coordinator overrides.
            </p>
          </div>
          <div className={styles.actions}>
            <button className="btn btn-ghost" type="button" onClick={() => void runHeartbeat()}>
              Run Heartbeat
            </button>
            <button className="btn btn-primary" type="button" onClick={() => void fetchTasks()}>
              Refresh Tasks
            </button>
          </div>
        </header>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2>Dispatch Queue</h2>
            {loading ? <p>Loading tasks...</p> : null}
            <div className={styles.list}>
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={`${styles.item} ${selectedTask?.id === task.id ? styles.itemActive : ''}`}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <strong>{task.category.replace(/_/g, ' ')} · {task.urgency}</strong>
                  <div className={styles.meta}>
                    <span className={styles.pill}>{task.status}</span>
                    <span>Report: {task.needReportId}</span>
                    <span>{formatDateTime(task.createdAt)}</span>
                  </div>
                </button>
              ))}
              {tasks.length === 0 && !loading ? <p>No dispatch tasks yet.</p> : null}
            </div>
          </section>

          <section className={styles.card}>
            <h2>Top Decisions</h2>
            {!selectedTask ? (
              <p>Select a task to view AI reasoning.</p>
            ) : (
              <div className={styles.decision}>
                {selectedTask.rankedDecisions.slice(0, 3).map((decision, index) => (
                  <div key={decision.volunteerId} className={styles.item}>
                    <strong>#{index + 1} {decision.volunteerName}</strong>
                    <div className={styles.meta}>
                      <span className={styles.pill}>{decision.distanceKm.toFixed(1)}km</span>
                      <span className={styles.pill}>{Math.round(decision.totalScore * 100)} score</span>
                    </div>
                    <p>{decision.explanation}</p>
                  </div>
                ))}

                <div>
                  <div className={styles.meta}>
                    <span className={styles.pill}>Accepted: {selectedTask.acceptedVolunteerId || 'N/A'}</span>
                    {selectedTask.coordinatorOverride?.overridden ? (
                      <span className={styles.pill}>Override Active</span>
                    ) : null}
                  </div>
                </div>

                <div>
                  <h3>Coordinator Override</h3>
                  <input
                    className={styles.input}
                    placeholder="Volunteer ID"
                    value={overrideVolunteerId}
                    onChange={(e) => setOverrideVolunteerId(e.target.value)}
                  />
                  <input
                    className={styles.input}
                    placeholder="Reason"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                  <div className={styles.actions}>
                    <button className="btn btn-primary" type="button" onClick={() => void applyOverride()}>
                      Apply Override
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default SevaAgentDashboard;
