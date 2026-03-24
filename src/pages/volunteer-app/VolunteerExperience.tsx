import { useEffect, useMemo, useState } from 'react';
import {
  getVolunteerProfile,
  runVolunteerSkillAssessment,
  updateVolunteerPreferences,
  getVolunteerTasks,
  acceptVolunteerTask,
  getVolunteerTaskChat,
  sendVolunteerTaskMessage,
  completeVolunteerTask,
  getVolunteerGamification,
} from '../../services/api';
import styles from './VolunteerExperience.module.css';

type Tab = 'onboarding' | 'tasks' | 'chat' | 'rewards';

const DEMO_VOLUNTEER_ID = 'vol_user_1';

export function VolunteerExperience() {
  const [tab, setTab] = useState<Tab>('onboarding');
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [gamification, setGamification] = useState<any>(null);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [assessmentAnswer, setAssessmentAnswer] = useState('I have first aid training and experience in flood response and child safety drives.');
  const [chatInput, setChatInput] = useState('');
  const [voiceDebrief, setVoiceDebrief] = useState('Delivered support and verified beneficiary handover.');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, []);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || tasks[0],
    [tasks, selectedTaskId]
  );

  async function bootstrap() {
    setLoading(true);

    const [profileRes, taskRes, gameRes] = await Promise.all([
      getVolunteerProfile(DEMO_VOLUNTEER_ID),
      getVolunteerTasks(DEMO_VOLUNTEER_ID),
      getVolunteerGamification(DEMO_VOLUNTEER_ID),
    ]);

    if (profileRes.success) setProfile(profileRes.data?.profile || null);
    if (taskRes.success) {
      const list = taskRes.data?.tasks || [];
      setTasks(list);
      if (list[0]) {
        setSelectedTaskId(list[0].id);
        await loadChat(list[0].id);
      }
    }
    if (gameRes.success) setGamification(gameRes.data || null);

    setLoading(false);
  }

  async function loadChat(taskId: string) {
    const res = await getVolunteerTaskChat(taskId);
    if (res.success) setChatMessages(res.data?.messages || []);
  }

  async function onRunAssessment() {
    await runVolunteerSkillAssessment(DEMO_VOLUNTEER_ID, [assessmentAnswer]);
    await bootstrap();
  }

  async function onSavePreferences() {
    await updateVolunteerPreferences({
      volunteerId: DEMO_VOLUNTEER_ID,
      sdgInterests: ['SDG 2', 'SDG 3', 'SDG 6'],
      weeklyHourLimit: 10,
      availabilityCalendar: [
        { day: 'Mon', isAvailable: true, slots: ['19:00-21:00'] },
        { day: 'Tue', isAvailable: false, slots: [] },
        { day: 'Wed', isAvailable: true, slots: ['19:00-21:00'] },
        { day: 'Thu', isAvailable: true, slots: ['19:00-21:00'] },
        { day: 'Fri', isAvailable: false, slots: [] },
      ],
    });
    await bootstrap();
  }

  async function onAcceptTask(taskId: string) {
    await acceptVolunteerTask(taskId, DEMO_VOLUNTEER_ID);
    await bootstrap();
  }

  async function onSendMessage() {
    if (!selectedTask || !chatInput.trim()) return;
    await sendVolunteerTaskMessage(selectedTask.id, {
      senderType: 'volunteer',
      senderId: DEMO_VOLUNTEER_ID,
      message: chatInput,
    });
    setChatInput('');
    await loadChat(selectedTask.id);
  }

  async function onCompleteTask() {
    if (!selectedTask) return;
    await completeVolunteerTask({
      taskId: selectedTask.id,
      volunteerId: DEMO_VOLUNTEER_ID,
      photoEvidenceUrls: ['https://example.com/proof-1.jpg'],
      voiceDebriefText: voiceDebrief,
      beneficiaryRating: 5,
    });
    await bootstrap();
  }

  return (
    <div className={styles.page}>
      <div className={styles.phoneShell}>
        <div className={styles.top}>
          <h1 className={styles.title}>Volunteer Experience App</h1>
          <p className={styles.sub}>Mobile-first mission flow: onboard, act, report, and grow.</p>
          <div className={styles.tabs}>
            {(['onboarding', 'tasks', 'chat', 'rewards'] as Tab[]).map((item) => (
              <button
                type="button"
                key={item}
                className={`${styles.tab} ${tab === item ? styles.tabActive : ''}`}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          {loading ? <div className={styles.card}>Loading volunteer app...</div> : null}

          {tab === 'onboarding' && (
            <>
              <div className={styles.card}>
                <strong>Profile Card</strong>
                <div className={styles.meta}>
                  <span className={styles.pill}>{profile?.displayName || 'Volunteer'}</span>
                  <span className={styles.pill}>ID verification: {profile?.identityVerificationStatus || 'not_provided'}</span>
                </div>
                <p className={styles.small}>Skills: {(profile?.skills || []).join(', ') || 'None yet'}</p>
                <p className={styles.small}>Languages: {(profile?.languages || []).join(', ')}</p>
                <p className={styles.small}>Interests: {(profile?.sdgInterests || []).join(', ')}</p>
              </div>

              <div className={styles.card}>
                <strong>5-Min Skill Assessment (Gemini-style)</strong>
                <textarea
                  className={styles.textarea}
                  value={assessmentAnswer}
                  onChange={(e) => setAssessmentAnswer(e.target.value)}
                />
                <div className={styles.row}>
                  <button className="btn btn-primary" type="button" onClick={() => void onRunAssessment()}>
                    Run Assessment
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => void onSavePreferences()}>
                    Save Interests + Availability
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'tasks' && (
            <>
              <div className={styles.card}>
                <strong>Task Feed</strong>
                <div className={styles.list}>
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className={styles.card}>
                      <strong>{task.title}</strong>
                      <p className={styles.small}>{task.summary}</p>
                      <div className={styles.meta}>
                        <span className={styles.pill}>{task.distanceKm} km</span>
                        <span className={styles.pill}>{task.estimatedTimeMinutes} min</span>
                        <span className={styles.pill}>x{task.urgencyMultiplier} points</span>
                        <span className={styles.pill}>{task.state}</span>
                      </div>
                      <p className={styles.small}>Skills: {(task.requiredSkills || []).join(', ')}</p>
                      <p className={styles.small}>Bring: {(task.whatToBring || []).join(', ')}</p>
                      <div className={styles.row}>
                        <a className="btn btn-ghost" href={task.navigationLink} target="_blank" rel="noreferrer">
                          Navigate
                        </a>
                        <button className="btn btn-primary" type="button" onClick={() => void onAcceptTask(task.id)}>
                          Accept Task
                        </button>
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            setTab('chat');
                            void loadChat(task.id);
                          }}
                        >
                          Open Task
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'chat' && (
            <>
              <div className={styles.card}>
                <strong>Coordinator Chat</strong>
                <p className={styles.small}>Real-time support while in task.</p>
                <div className={styles.chat}>
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={styles.bubble}>
                      <strong>{msg.senderType}</strong>: {msg.message}
                    </div>
                  ))}
                  {chatMessages.length === 0 ? <div className={styles.small}>No chat messages yet.</div> : null}
                </div>
                <div className={styles.row}>
                  <input
                    className={styles.input}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message coordinator"
                  />
                  <button className="btn btn-primary" type="button" onClick={() => void onSendMessage()}>
                    Send
                  </button>
                </div>
              </div>

              <div className={styles.card}>
                <strong>Completion Evidence</strong>
                <p className={styles.small}>Capture photo evidence and 30-second voice debrief.</p>
                <textarea
                  className={styles.textarea}
                  value={voiceDebrief}
                  onChange={(e) => setVoiceDebrief(e.target.value)}
                />
                <button className="btn btn-primary" type="button" onClick={() => void onCompleteTask()}>
                  Complete Task
                </button>
              </div>
            </>
          )}

          {tab === 'rewards' && (
            <>
              <div className={styles.card}>
                <strong>Seva Points & Milestones</strong>
                <div className={styles.meta}>
                  <span className={styles.pill}>{gamification?.sevaPoints || 0} points</span>
                  <span className={styles.pill}>{gamification?.tasksCompleted || 0} tasks</span>
                  <span className={styles.pill}>{gamification?.beneficiariesImpacted || 0} impacted</span>
                </div>
                <p className={styles.small}>{gamification?.impactMilestone || 'Start a task to unlock milestones.'}</p>
              </div>

              <div className={styles.card}>
                <strong>Skill Badges</strong>
                <div className={styles.row}>
                  {(gamification?.badges || []).map((badge: string) => (
                    <span key={badge} className={styles.btnMini}>{badge}</span>
                  ))}
                  {(gamification?.badges || []).length === 0 ? <span className={styles.small}>No badges yet.</span> : null}
                </div>
              </div>

              <div className={styles.card}>
                <strong>Squad Mode + Corporate League</strong>
                <p className={styles.small}>Squad: {gamification?.squad?.name || 'N/A'} · Rank {gamification?.squad?.rank || '-'}</p>
                <div className={styles.list}>
                  {(gamification?.corporateLeague?.companyLeaderboard || []).map((row: any) => (
                    <div key={row.company} className={styles.meta}>
                      <span className={styles.pill}>{row.company}</span>
                      <span>{row.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${styles.card} ${styles.passport}`}>
                <strong>Seva Passport</strong>
                <p className={styles.small}>Credential: {gamification?.sevaPassport?.credentialId || 'N/A'}</p>
                <p className={styles.small}>{gamification?.sevaPassport?.shareText || 'Complete tasks to build your passport.'}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VolunteerExperience;
