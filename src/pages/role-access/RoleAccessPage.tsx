import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AppIcon } from '../../components/shared';
import { roleDefaultPaths, type DemoRole } from '../../config/appNavigation';
import { useDemoRole } from '../../context/DemoRoleContext';
import styles from './RoleAccessPage.module.css';

type LoginRole = Exclude<DemoRole, 'all'>;

type RoleProfile = {
  role: LoginRole;
  title: string;
  shortTitle: string;
  ghost: string;
  eyebrow: string;
  headline: string;
  description: string;
  email: string;
  passphrase: string;
  destination: string;
  button: string;
  opening: string;
  icon: 'intake' | 'volunteer' | 'constellation';
  chips: string[];
  metrics: Array<{ value: string; label: string }>;
  flow: Array<{ title: string; detail: string }>;
};

const roleProfiles: Record<LoginRole, RoleProfile> = {
  reporter: {
    role: 'reporter',
    title: 'Reporter',
    shortTitle: 'Reporter',
    ghost: 'REPORTER',
    eyebrow: 'public intake',
    headline: 'Report fast. Stay out of the command room.',
    description:
      'A focused entry point for people who need to submit a need, confirm the location, and watch the live Delhi map update.',
    email: 'reporter.demo@sevasetu.in',
    passphrase: 'Delhi intake preview',
    destination: 'Report a Need',
    button: 'Enter reporter preview',
    opening: 'Opening reporter workspace...',
    icon: 'intake',
    chips: ['Voice intake', 'Photo proof', 'Live map'],
    metrics: [
      { value: '4', label: 'report paths' },
      { value: '1', label: 'public map' },
    ],
    flow: [
      { title: 'Capture', detail: 'Voice, photo, or form intake starts the case.' },
      { title: 'Confirm', detail: 'AI extracts category, urgency, and location.' },
      { title: 'Track', detail: 'Reporter sees the live public signal.' },
    ],
  },
  volunteer: {
    role: 'volunteer',
    title: 'Volunteer',
    shortTitle: 'Volunteer',
    ghost: 'VOLUNTEER',
    eyebrow: 'field responder',
    headline: 'Only the mission. None of the NGO controls.',
    description:
      'A field-first login that opens tasks, evidence upload, chat, inventory, and map context without exposing command tooling.',
    email: 'volunteer.demo@sevasetu.in',
    passphrase: 'Field mission preview',
    destination: 'Volunteer App',
    button: 'Enter volunteer preview',
    opening: 'Opening volunteer workspace...',
    icon: 'volunteer',
    chips: ['Assigned tasks', 'Completion proof', 'Rewards'],
    metrics: [
      { value: '30', label: 'active tasks' },
      { value: '12', label: 'visible dots' },
    ],
    flow: [
      { title: 'Brief', detail: 'Responder sees today’s task queue.' },
      { title: 'Move', detail: 'Map context and chat guide the handoff.' },
      { title: 'Verify', detail: 'Completion photo closes the loop.' },
    ],
  },
  ngo: {
    role: 'ngo',
    title: 'NGO Workspace',
    shortTitle: 'NGO',
    ghost: 'NGO OPS',
    eyebrow: 'operations desk',
    headline: 'The full command surface opens only for ops.',
    description:
      'Dispatch, dashboards, crisis mode, Gemini support, and partner workflows stay grouped for NGO coordinators.',
    email: 'ops.demo@sevasetu.in',
    passphrase: 'Command workspace preview',
    destination: 'Workspace',
    button: 'Enter NGO workspace preview',
    opening: 'Opening NGO workspace...',
    icon: 'constellation',
    chips: ['SEVA Agent', 'Dashboards', 'Crisis mode'],
    metrics: [
      { value: '48', label: 'active needs' },
      { value: '6h', label: 'avg response' },
    ],
    flow: [
      { title: 'See', detail: 'Workspace summaries keep the queue readable.' },
      { title: 'Assign', detail: 'SEVA Agent ranks responders and NGOs.' },
      { title: 'Escalate', detail: 'Crisis tools activate when clusters surge.' },
    ],
  },
};

const roleOrder: LoginRole[] = ['reporter', 'volunteer', 'ngo'];
const warmSpring = { type: 'spring', stiffness: 220, damping: 16 } as const;

export function RoleAccessPage() {
  const navigate = useNavigate();
  const { setRole, clearRole } = useDemoRole();
  const [activeRole, setActiveRole] = useState<LoginRole>('reporter');
  const [loadingRole, setLoadingRole] = useState<LoginRole | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const active = roleProfiles[activeRole];

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    stage.style.setProperty('--spotlight-x', `${event.clientX - rect.left}px`);
    stage.style.setProperty('--spotlight-y', `${event.clientY - rect.top}px`);
  };

  const enterPreview = () => {
    if (loadingRole) return;
    setLoadingRole(activeRole);
    window.setTimeout(() => {
      setRole(activeRole);
      navigate(roleDefaultPaths[activeRole]);
    }, 650);
  };

  const useMvpView = () => {
    clearRole();
    navigate('/workspace');
  };

  return (
    <main className={styles.page} data-role={activeRole} id="main-content">
      <section className={styles.storyPanel} aria-label={`${active.title} future access story`}>
        <div className={styles.storyTexture} aria-hidden="true" />
        <motion.div
          key={`ghost-${activeRole}`}
          className={styles.ghostWord}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={warmSpring}
          aria-hidden="true"
        >
          {active.ghost}
        </motion.div>

        <div className={styles.storyTop}>
          <Link to="/" className={styles.brand} aria-label="Back to SevaSetu landing page">
            <span className={styles.brandMark}>
              <AppIcon name="network" size={20} />
            </span>
            <span>
              <strong>SevaSetu</strong>
              <small>Future scope preview</small>
            </span>
          </Link>
          <span className={styles.comingSoon}>Coming soon</span>
        </div>

        <div className={styles.storyContent}>
          <motion.div
            key={`copy-${activeRole}`}
            initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={warmSpring}
          >
            <p className={styles.eyebrow}>{active.eyebrow}</p>
            <h1>{active.headline}</h1>
            <p className={styles.description}>{active.description}</p>
          </motion.div>

          <div className={styles.flowRail} aria-label={`${active.title} login flow`}>
            {active.flow.map((item, index) => (
              <motion.div
                className={styles.flowStep}
                key={`${activeRole}-${item.title}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...warmSpring, delay: index * 0.06 }}
              >
                <span className={styles.flowNode}>{index + 1}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className={styles.storyFooter}>
          {active.metrics.map((metric) => (
            <span key={metric.label} className={styles.metric}>
              <strong>{metric.value}</strong>
              <small>{metric.label}</small>
            </span>
          ))}
        </div>
      </section>

      <section
        className={styles.loginStage}
        ref={stageRef}
        onPointerMove={handlePointerMove}
        aria-label="Choose a simulated role login"
      >
        <div className={styles.stageGlow} aria-hidden="true" />

        <div className={styles.stageHeader}>
          <div>
            <p className={styles.stageEyebrow}>role access</p>
            <h2>Choose the door you want to preview.</h2>
          </div>
          <Link to="/" className={styles.backLink}>
            Back to SevaSetu
          </Link>
        </div>

        <div className={styles.selector} role="group" aria-label="Login mode selector">
          {roleOrder.map((role) => {
            const profile = roleProfiles[role];
            const selected = role === activeRole;
            return (
              <button
                type="button"
                key={role}
                className={styles.selectorButton}
                onClick={() => setActiveRole(role)}
                aria-pressed={selected}
              >
                {selected ? <motion.span className={styles.selectorActive} layoutId="role-selector" /> : null}
                <span className={styles.selectorIcon}>
                  <AppIcon name={profile.icon} size={18} />
                </span>
                <span>
                  <strong>{profile.title}</strong>
                  <small>{profile.eyebrow}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.loginCardShell}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRole}
              className={styles.loginCard}
              initial={{ opacity: 0, y: 24, scale: 0.98, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -18, scale: 0.98, filter: 'blur(8px)' }}
              transition={warmSpring}
            >
              <div className={styles.cardTopline}>
                <span className={styles.roleBadge}>
                  <AppIcon name={active.icon} size={16} />
                  {active.shortTitle}
                </span>
                <span className={styles.statusDot}>Simulated login</span>
              </div>

              <div className={styles.cardHeading}>
                <h3>{active.title}</h3>
                <p>
                  Credentials are prefilled for the hackathon preview. One click opens the role-specific
                  workspace without touching Firebase auth.
                </p>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Email</span>
                  <input value={active.email} readOnly />
                </label>
                <label className={styles.field}>
                  <span>Access note</span>
                  <input value={active.passphrase} readOnly />
                </label>
              </div>

              <div className={styles.destinationPanel}>
                <span>opens</span>
                <strong>{active.destination}</strong>
                <small>{active.chips.join(' / ')}</small>
              </div>

              <div className={styles.chips}>
                {active.chips.map((chip) => (
                  <span key={chip}>{chip}</span>
                ))}
              </div>

              <button
                type="button"
                className={styles.submitButton}
                onClick={enterPreview}
                disabled={loadingRole !== null}
              >
                <span>{loadingRole === activeRole ? active.opening : active.button}</span>
                <AppIcon name="route" size={17} />
              </button>

              <button type="button" className={styles.mvpButton} onClick={useMvpView}>
                Use MVP demo view
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}

export default RoleAccessPage;
