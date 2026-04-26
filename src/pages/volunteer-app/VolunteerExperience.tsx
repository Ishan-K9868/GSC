import { useEffect, useMemo, useState } from 'react';
import {
  getVolunteerProfile,
  getVolunteerTasks,
  acceptVolunteerTask,
  getVolunteerTaskChat,
  getVolunteerGamification,
  getReport,
  uploadPhoto,
} from '../../services/api';
import { auth } from '../../config/firebase';
import { AppIcon } from '../../components/shared';
import InventoryTab from './InventoryTab';
import styles from './VolunteerExperience.module.css';

type Tab = 'today' | 'missions' | 'chat' | 'rewards' | 'inventory';

const DEMO_VOLUNTEER_ID = 'dev-user-001';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const DEV_MODE = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS !== 'false';
const DEV_TOKEN = 'dev-mock-token-for-prototype';

type CompletionState = {
  photoUrl?: string;
  uploading?: boolean;
  verifying?: boolean;
  tier?: 'auto_resolved' | 'needs_review' | 'rejected';
  message?: string;
  error?: string;
};

async function getDispatchToken(): Promise<string | null> {
  if (DEV_MODE) return DEV_TOKEN;
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export function VolunteerExperience() {
  const [tab, setTab] = useState<Tab>('today');
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [gamification, setGamification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [completionState, setCompletionState] = useState<Record<string, CompletionState>>({});

  useEffect(() => {
    void loadAll();
  }, []);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.taskId === selectedTaskId) || tasks[0] || null,
    [tasks, selectedTaskId]
  );

  useEffect(() => {
    if (selectedTask?.taskId) {
      void loadChat(selectedTask.taskId);
    } else {
      setChatMessages([]);
    }
  }, [selectedTask?.taskId]);

  async function loadAll() {
    setLoading(true);
    const [profileRes, tasksRes, gamRes] = await Promise.all([
      getVolunteerProfile(DEMO_VOLUNTEER_ID),
      getVolunteerTasks(DEMO_VOLUNTEER_ID),
      getVolunteerGamification(DEMO_VOLUNTEER_ID),
    ]);

    if (profileRes.success) setProfile(profileRes.data);
    if (tasksRes.success) {
      const nextTasks = tasksRes.data?.tasks || [];
      setTasks(nextTasks);
      setSelectedTaskId((current) => current || nextTasks[0]?.taskId || '');
    }
    if (gamRes.success) setGamification(gamRes.data);
    setLoading(false);
  }

  async function loadChat(taskId: string) {
    const chatRes = await getVolunteerTaskChat(taskId);
    if (chatRes.success) {
      setChatMessages(chatRes.data?.messages || []);
    }
  }

  async function onAcceptTask(taskId: string) {
    await acceptVolunteerTask(taskId, DEMO_VOLUNTEER_ID);
    void loadAll();
  }

  async function onSelectCompletionPhoto(taskId: string, file: File | null) {
    if (!file) return;

    setCompletionState((current) => ({
      ...current,
      [taskId]: { ...current[taskId], uploading: true, error: undefined, message: 'Uploading completion photo...' },
    }));

    const uploadResult = await uploadPhoto(file);

    if (!uploadResult.success || !uploadResult.data?.url) {
      setCompletionState((current) => ({
        ...current,
        [taskId]: {
          ...current[taskId],
          uploading: false,
          error: uploadResult.error?.message || 'Photo upload failed',
        },
      }));
      return;
    }

    const uploadedPhotoUrl = uploadResult.data.url;

    setCompletionState((current) => ({
      ...current,
      [taskId]: {
        ...current[taskId],
        photoUrl: uploadedPhotoUrl,
        uploading: false,
        message: 'Photo ready. You can now submit completion for AI verification.',
        error: undefined,
      },
    }));
  }

  async function onCompleteTask(task: any) {
    const taskId = task.taskId;
    const taskCompletion = completionState[taskId];

    if (!taskCompletion?.photoUrl) {
      setCompletionState((current) => ({
        ...current,
        [taskId]: { ...current[taskId], error: 'Upload a completion photo before marking this mission complete.' },
      }));
      return;
    }

    setCompletionState((current) => ({
      ...current,
      [taskId]: { ...current[taskId], verifying: true, error: undefined, message: 'AI is verifying your completion...' },
    }));

    try {
      const reportId = task.reportId || task.id;
      const reportResult = await getReport(reportId);
      const reporterId = reportResult.success ? (reportResult.data?.report as any)?.reporterId : null;

      if (!reporterId) {
        throw new Error('Reporter context is missing for this task.');
      }

      const token = await getDispatchToken();
      const response = await fetch(`${API_BASE_URL}/dispatch/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          taskId,
          needReportId: reportId,
          volunteerId: DEMO_VOLUNTEER_ID,
          reporterId,
          needCategory: task.category,
          photoUrl: taskCompletion.photoUrl,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Completion verification failed');
      }

      const tier = result.data?.tier as CompletionState['tier'];
      const tierMessage =
        tier === 'auto_resolved'
          ? 'Completion verified. Mission auto-resolved and reporter confirmation was requested.'
          : tier === 'needs_review'
            ? 'Completion submitted. Coordinator review is pending.'
            : 'Photo rejected. Please upload a clearer completion photo and resubmit.';

      setCompletionState((current) => ({
        ...current,
        [taskId]: {
          ...current[taskId],
          verifying: false,
          tier,
          message: tierMessage,
          error: undefined,
        },
      }));

      void loadAll();
    } catch (completionError: any) {
      setCompletionState((current) => ({
        ...current,
        [taskId]: {
          ...current[taskId],
          verifying: false,
          error: completionError.message || 'Completion verification failed',
        },
      }));
    }
  }

  function renderCompletionControls(task: any) {
    const state = completionState[task.taskId] || {};
    const toneColor =
      state.tier === 'auto_resolved'
        ? 'var(--jade)'
        : state.tier === 'needs_review'
          ? 'var(--amber)'
          : state.tier === 'rejected'
            ? '#D44425'
            : 'var(--text-muted)';

    return (
      <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.45rem' }}>
        {/* Upload zone — wraps native input, never shows native UI */}
        <div
          className={`${styles.uploadZone} ${state.photoUrl ? styles.uploadZone__hasFile : ''}`}
          role="button"
          tabIndex={0}
        >
          <input
            type="file"
            accept="image/*"
            onChange={(event) => void onSelectCompletionPhoto(task.taskId, event.target.files?.[0] || null)}
          />
          <span className={styles.uploadZoneText}>
            {state.photoUrl ? '✓ Photo ready' : 'Upload completion photo'}
          </span>
          <span className={styles.uploadZoneHint}>
            {state.photoUrl ? 'Photo uploaded. AI verification ready.' : 'JPG or PNG — tap to select'}
          </span>
        </div>
        {state.message ? <span style={{ fontSize: '0.72rem', color: toneColor }}>{state.message}</span> : null}
        {state.error ? <span style={{ fontSize: '0.72rem', color: '#D44425' }}>{state.error}</span> : null}
        <button
          className={styles.btnSmall}
          type="button"
          disabled={!state.photoUrl || state.uploading || state.verifying}
          onClick={() => void onCompleteTask(task)}
        >
          <AppIcon name={state.tier === 'auto_resolved' ? 'check' : state.tier === 'needs_review' ? 'alert' : 'check'} size={13} />
          {state.uploading ? 'Uploading photo...' : state.verifying ? 'AI is verifying...' : 'Mark Complete'}
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'today', label: 'Today', icon: 'dashboard' },
    { id: 'missions', label: 'Missions', icon: 'dispatch' },
    { id: 'chat', label: 'Chat', icon: 'network' },
    { id: 'rewards', label: 'Rewards', icon: 'spark' },
    { id: 'inventory', label: 'Inventory', icon: 'shield' },
  ];

  const activeTasks = tasks.filter((t) => t.status === 'accepted' || t.status === 'in_progress');
  const pendingTasks = tasks.filter((t) => t.status === 'pending');

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>Volunteer Mission</div>
          <h1 className={styles.heroTitle}>
            {profile ? `Welcome back, ${profile.name}` : 'Volunteer Workspace'}
          </h1>
          <p className={styles.heroSub}>
            Tasks, coordination chat, and your growing impact — all in one surface.
          </p>
        </div>
      </section>

      {/* Tab Rail */}
      <nav className={styles.tabRail}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            <AppIcon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </nav>

      {loading ? <div className={styles.notice}>Loading volunteer data...</div> : null}

      <div className={styles.workspace}>
        {/* Profile Sidebar */}
        <aside className={styles.sidebar}>
          {profile ? (
            <div className={styles.profileCard}>
              <div className={styles.profileHeader}>
                <div className={styles.avatar}>{profile.name?.charAt(0) || 'V'}</div>
                <div>
                  <strong>{profile.name}</strong>
                  <span className={styles.profileMeta}>{profile.zone || 'Delhi NCR'}</span>
                </div>
              </div>
              <div className={styles.profileStats}>
                <div><span>Reliability</span><strong>{Math.round((profile.reliabilityScore || 0) * 100)}%</strong></div>
                <div><span>Active tasks</span><strong>{activeTasks.length}</strong></div>
              </div>
            </div>
          ) : null}

          {profile?.skills ? (
            <div className={styles.sideCard}>
              <div className={styles.sideCardHeader}>Skills</div>
              <div className={styles.skillsList}>
                {(profile.skills || []).slice(0, 6).map((skill: any) => (
                  <span key={skill.name || skill} className={styles.skillChip}>
                    {typeof skill === 'string' ? skill : skill.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className={styles.sideCard}>
            <div className={styles.sideCardHeader}>Preferences</div>
            <div className={styles.kvList}>
              <div className={styles.kvRow}><span>Max distance</span><strong>10 km</strong></div>
              <div className={styles.kvRow}><span>Time slot</span><strong>Morning</strong></div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          {/* Today Tab */}
          {tab === 'today' && (
            <section className={styles.tabContent}>
              <div className={styles.panelHeader}>
                <AppIcon name="dashboard" size={15} /> Today's briefing
              </div>

              <div className={styles.briefing}>
                <div className={styles.briefingMetrics}>
                  <article className={styles.metricTile}><span>Active</span><strong>{activeTasks.length}</strong></article>
                  <article className={styles.metricTile}><span>Pending</span><strong>{pendingTasks.length}</strong></article>
                  <article className={styles.metricTile}><span>Points</span><strong>{gamification?.totalPoints || 0}</strong></article>
                </div>
                {activeTasks.slice(0, 3).map((task) => (
                  <div key={task.taskId} className={styles.taskCard}>
                    <div className={styles.taskTop}>
                      <strong>{task.category?.replace(/_/g, ' ') || 'Task'}</strong>
                      <span className={styles.badge}>{task.urgency || task.status}</span>
                    </div>
                    <p>{task.description || task.location?.address || task.title || 'Field task assigned'}</p>
                    {renderCompletionControls(task)}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Missions Tab */}
          {tab === 'missions' && (
            <section className={styles.tabContent}>
              <div className={styles.panelHeader}>
                <AppIcon name="dispatch" size={15} /> All missions
              </div>
              <div className={styles.missionList}>
                 {tasks.map((task) => (
                   <div key={task.taskId} className={styles.taskCard}>
                     <div className={styles.taskTop}>
                       <strong>{task.category?.replace(/_/g, ' ') || 'Task'}</strong>
                       <span className={styles.badge} data-status={task.status}>{task.status}</span>
                     </div>
                     <p>{task.description || task.location?.address || task.title || 'No details'}</p>
                     <div className={styles.taskMeta}>
                       <span>{task.distance ? `${task.distance}km` : ''}</span>
                       <span>{task.eta || ''}</span>
                     </div>
                     <div className={styles.taskActions}>
                       <button className={styles.btnSmall} type="button" onClick={() => { setSelectedTaskId(task.taskId); setTab('chat'); }}>
                         Open chat
                       </button>
                       {task.status === 'pending' ? (
                         <button className={styles.btnSmall} type="button" onClick={() => void onAcceptTask(task.taskId)}>
                           Accept
                        </button>
                      ) : null}
                       {task.status === 'accepted' || task.status === 'in_progress' ? (
                         renderCompletionControls(task)
                       ) : null}
                     </div>
                   </div>
                ))}
                {tasks.length === 0 ? <p className={styles.notice}>No missions available right now.</p> : null}
              </div>
            </section>
          )}

          {/* Chat Tab */}
          {tab === 'chat' && (
            <section className={styles.tabContent}>
              <div className={styles.panelHeader}>
                <AppIcon name="network" size={15} /> Coordination chat
              </div>
              <div className={styles.chatArea}>
                {selectedTask ? (
                  <div className={styles.chatTaskHeader}>
                    <strong>{selectedTask.title}</strong>
                    <span>{selectedTask.taskId}</span>
                  </div>
                ) : null}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`${styles.chatBubble} ${msg.sender === 'volunteer' ? styles.chatSent : styles.chatReceived}`}>
                    <strong>{msg.sender}</strong>
                    <p>{msg.text || msg.content}</p>
                    <span className={styles.chatTime}>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}</span>
                  </div>
                ))}
                {chatMessages.length === 0 ? <p className={styles.notice}>No messages yet.</p> : null}
              </div>
            </section>
          )}

          {/* Rewards Tab */}
          {tab === 'rewards' && (
            <section className={styles.tabContent}>
              <div className={styles.panelHeader}>
                <AppIcon name="spark" size={15} /> Rewards + progress
              </div>
              <div className={styles.rewardsGrid}>
                <article className={styles.rewardCard}>
                  <span>Total points</span>
                  <strong>{gamification?.totalPoints || 0}</strong>
                </article>
                <article className={styles.rewardCard}>
                  <span>Current streak</span>
                  <strong>{gamification?.streak || 0} days</strong>
                </article>
                <article className={styles.rewardCard}>
                  <span>Level</span>
                  <strong>{gamification?.level || 1}</strong>
                </article>
                <article className={styles.rewardCard}>
                  <span>Missions done</span>
                  <strong>{gamification?.completedMissions || 0}</strong>
                </article>
              </div>
              {gamification?.badges?.length > 0 ? (
                <div className={styles.badgeList}>
                  <div className={styles.sideCardHeader}>Earned badges</div>
                  <div className={styles.chipRow}>
                    {gamification.badges.map((b: any) => (
                      <span key={b.id || b.name} className={styles.skillChip}>{b.name || b}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {tab === 'inventory' && (
            <section className={styles.tabContent}>
              <div className={styles.panelHeader}>
                <AppIcon name="shield" size={15} /> Inventory + supplies
              </div>
              <InventoryTab volunteerId={DEMO_VOLUNTEER_ID} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default VolunteerExperience;
