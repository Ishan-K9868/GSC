import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import styles from './Personas.module.css';

// Motion configs from foundation
const springSnap = { type: 'spring', stiffness: 400, damping: 30 } as const;
const scaleFade = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

// Abstract avatar SVGs (geometric silhouettes, no faces)
const Avatar1 = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    {/* Abstract circles suggesting a person with dupatta/head covering */}
    <circle cx="32" cy="24" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
    <path
      d="M18 28 Q18 40, 32 48 Q46 40, 46 28"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <rect x="22" y="38" width="20" height="22" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
  </svg>
);

const Avatar2 = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    {/* Abstract rectangle figure with laptop/clipboard shape */}
    <circle cx="32" cy="20" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
    <rect x="20" y="32" width="24" height="28" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    <rect x="26" y="38" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

const Avatar3 = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    {/* Abstract geometric figure suggesting professional/corporate context */}
    <circle cx="32" cy="22" r="11" stroke="currentColor" strokeWidth="2" fill="none" />
    <path
      d="M18 34 L32 38 L46 34 L46 56 Q46 58, 44 58 L20 58 Q18 58, 18 56 Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <rect x="28" y="44" width="8" height="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

// SDG Chip component
function SDGChip({ label }: { label: string }) {
  return <span className={styles.sdgChip}>{label}</span>;
}

// Persona data
interface Persona {
  avatar: React.ReactNode;
  nameChip: string;
  headline: string;
  before: string;
  after: string;
  sdgs: string[];
  activeAccent: string;
  activeShadow: string;
}

const personas: Persona[] = [
  {
    avatar: <Avatar1 />,
    nameChip: 'REKHA DEVI · HEALTH OUTREACH · MUZAFFARPUR, BIHAR',
    headline: 'She reports needs before the coordinator even asks.',
    before:
      'Drives 2 hours to submit paper forms at district office. Needs go unaddressed for days. No confirmation that reports led to action.',
    after:
      '20-second voice report in Hindi. Offline-first. Real-time confirmation. She knows her reports drive action.',
    sdgs: ['SDG 3', 'SDG 6'],
    activeAccent: 'var(--accent)',
    activeShadow: '0 4px 8px rgba(212,98,42,0.12), 0 16px 52px rgba(212,98,42,0.14)',
  },
  {
    avatar: <Avatar2 />,
    nameChip: 'ANAND KUMAR · PROGRAM MANAGER · PRATHAM, DELHI',
    headline: 'He stopped spending his mornings sorting WhatsApp messages.',
    before:
      'Excel sheets, forwarded WhatsApp photos, volunteer no-shows, zero deployment visibility.',
    after:
      'Live operations dashboard. AI dispatch with plain-language reasoning. Volunteer retention improved.',
    sdgs: ['SDG 4', 'SDG 17'],
    activeAccent: 'var(--jade)',
    activeShadow: '0 4px 8px rgba(45,157,120,0.12), 0 16px 52px rgba(45,157,120,0.14)',
  },
  {
    avatar: <Avatar3 />,
    nameChip: 'PRIYA MEHTA · HEAD OF CSR · MUMBAI',
    headline: 'She recovered 3 weeks of Q4 that used to go to data entry.',
    before:
      'Manually compiling BRSR Section C from 12 different Excel files across divisions every quarter.',
    after:
      'One-click BRSR export. Employee volunteer leaderboard live. Individual SDG certificates auto-generated.',
    sdgs: ['SDG 8', 'SDG 11'],
    activeAccent: 'var(--amber)',
    activeShadow: '0 4px 8px rgba(212,146,26,0.12), 0 16px 52px rgba(212,146,26,0.14)',
  },
];

function Personas() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-15%' });

  const [activeCard, setActiveCard] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-advance logic (disabled on mobile)
  function startTimer() {
    if (isMobile) return;
    timerRef.current = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % 3);
    }, 4000);
  }

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimer();
  }

  useEffect(() => {
    if (!isPaused && !isMobile) startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isMobile]);

  return (
    <section id="personas" ref={sectionRef} className={styles.personas}>
      {/* Section header */}
      <p className={styles.eyebrow}>THREE PEOPLE. ONE PLATFORM.</p>

      <h2 className={styles.headline}>
        SevaSetu is built for the people who carry India's social sector.
      </h2>

      {/* Persona cards */}
      <motion.div
        className={styles.personaGrid}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={staggerContainer}
      >
        {personas.map((persona, index) => {
          const isActive = activeCard === index;

          return (
            <motion.div
              key={index}
              className={`${styles.personaCard} ${styles[`personaCard${index + 1}`]}`}
              variants={scaleFade}
              animate={{
                scale: isActive ? 1 : 0.98,
                opacity: isActive ? 1 : 0.7,
              }}
              transition={springSnap}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              style={{
                background: isActive ? 'var(--bg)' : 'var(--bg-2)',
                border: isActive ? `1px solid ${persona.activeAccent}` : '1px solid var(--border)',
                boxShadow: isActive ? persona.activeShadow : 'none',
              }}
            >
              {/* Avatar */}
              <div className={styles.avatar} style={{ color: persona.activeAccent }}>
                {persona.avatar}
              </div>

              {/* Name chip */}
              <span className={styles.nameChip}>{persona.nameChip}</span>

              {/* Headline */}
              <h3 className={styles.cardHeadline}>{persona.headline}</h3>

              {/* Before block */}
              <div className={styles.beforeBlock}>
                <p className={styles.beforeEyebrow}>BEFORE SEVASETU</p>
                <p className={styles.beforeText}>{persona.before}</p>
              </div>

              {/* After block */}
              <div className={styles.afterBlock}>
                <div className={styles.afterEyebrowContainer}>
                  <div className={styles.jadeDot} />
                  <p className={styles.afterEyebrow}>WITH SEVASETU</p>
                </div>
                <p className={styles.afterText}>{persona.after}</p>
              </div>

              {/* SDG chips */}
              <div className={styles.sdgChips}>
                {persona.sdgs.map((sdg) => (
                  <SDGChip key={sdg} label={sdg} />
                ))}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Navigation dots */}
      <div className={styles.navigationDots}>
        {[0, 1, 2].map((index) => (
          <motion.button
            key={index}
            type="button"
            className={styles.navDot}
            onClick={() => {
              setActiveCard(index);
              resetTimer();
            }}
            animate={{
              scale: activeCard === index ? 1 : 0.9,
              backgroundColor:
                activeCard === index ? 'var(--accent)' : 'transparent',
            }}
            transition={springSnap}
            style={{
              border:
                activeCard === index
                  ? 'none'
                  : '1.5px solid var(--border-strong)',
            }}
            aria-label={`View persona ${index + 1}`}
            aria-current={activeCard === index ? 'true' : undefined}
          />
        ))}
      </div>
    </section>
  );
}

export default Personas;
