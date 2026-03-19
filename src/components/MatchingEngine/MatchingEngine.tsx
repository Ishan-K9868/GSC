import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'motion/react';
import { NoiseTexture } from '../shared';
import styles from './MatchingEngine.module.css';

// Motion configs from foundation
const springWarm = { type: 'spring', stiffness: 220, damping: 16 } as const;

// Weight bar data
interface WeightRow {
  label: string;
  percent: number;
  color: string;
}

const weights: WeightRow[] = [
  { label: 'Proximity', percent: 30, color: 'var(--accent)' },
  { label: 'Skill Fit', percent: 25, color: 'var(--accent)' },
  { label: 'Availability', percent: 20, color: 'var(--accent)' },
  { label: 'Reliability', percent: 15, color: 'var(--text-muted)' },
  { label: 'Equity Boost', percent: 5, color: 'var(--jade)' },
  { label: 'Need Urgency', percent: 5, color: 'var(--amber)' },
];

// Emergency override weights
const emergencyWeights: WeightRow[] = [
  { label: 'Proximity', percent: 50, color: 'var(--accent)' },
  { label: 'Skill Fit', percent: 15, color: 'var(--accent)' },
  { label: 'Availability', percent: 20, color: 'var(--accent)' },
];

// Timeline step data
interface TimelineStep {
  icon: React.ReactNode;
  title: string;
  sub: string;
  chips?: { text: string; type: 'amber' | 'jade' | 'default' | 'grid' }[];
}

// Step icons (stroke-based, currentColor, strokeWidth 1.5, 20×20px)
const InboxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 8h14M3 8v7a1 1 0 001 1h12a1 1 0 001-1V8M3 8l2-4h10l2 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 11V8M10 11l-2-2M10 11l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MagnifierIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 12l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BarChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="3" y="12" width="3" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="8.5" y="8" width="3" height="8" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="14" y="4" width="3" height="12" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const TrophyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M6 3h8v6c0 2.2-1.8 4-4 4s-4-1.8-4-4V3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 5H4a1 1 0 00-1 1v1a2 2 0 002 2h1M14 5h2a1 1 0 011 1v1a2 2 0 01-2 2h-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 13v2M7 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 2a1 1 0 011 1v1a5 5 0 014 4.9V12l1.5 2.5H3.5L5 12V8.9A5 5 0 019 4V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 14.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CheckCircleIcon = ({ active }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="7" stroke={active ? 'var(--jade)' : 'currentColor'} strokeWidth="1.5" />
    <path d="M7 10l2 2 4-4" stroke={active ? 'var(--jade)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CircularArrowsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M14 6a5 5 0 11-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6 14a5 5 0 118 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 6l2-1M14 6l1 2M6 14l-2 1M6 14l-1-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const timelineSteps: TimelineStep[] = [
  {
    icon: <InboxIcon />,
    title: 'Need report confirmed',
    sub: 'Category: Medical · Urgency: 0.87 · Location: encoded',
    chips: [{ text: 'HIGH URGENCY', type: 'amber' }],
  },
  {
    icon: <MagnifierIcon />,
    title: 'Agent scans 20 nearest candidates',
    sub: 'Within 5km radius, skill-matched by Gemini embeddings',
    chips: [{ text: '', type: 'grid' }],
  },
  {
    icon: <BarChartIcon />,
    title: 'Match scores computed in under 2 seconds',
    sub: 'Multi-dimensional scoring across 6 dimensions simultaneously',
  },
  {
    icon: <TrophyIcon />,
    title: 'Top 3 ranked, equity constraints applied',
    sub: 'No volunteer assigned more than 3 active tasks simultaneously',
  },
  {
    icon: <BellIcon />,
    title: 'Volunteer #1 notified simultaneously',
    sub: 'Push notification + WhatsApp in chosen language',
    chips: [
      { text: 'PUSH', type: 'default' },
      { text: 'WHATSAPP', type: 'default' },
      { text: 'SMS FALLBACK', type: 'default' },
    ],
  },
  {
    icon: <CheckCircleIcon active />,
    title: 'Accepted in 3 min 24 sec',
    sub: 'Task confirmed, Pulse Map updated',
    chips: [{ text: '3:24 RESPONSE', type: 'jade' }],
  },
  {
    icon: <CircularArrowsIcon />,
    title: 'Debrief captured on completion',
    sub: '30-second voice debrief transcribed by Gemini, added to task record',
  },
];

// Volunteer dot grid component (4×5 on desktop, 3×3 on mobile)
function VolunteerGrid({ isMobile }: { isMobile: boolean }) {
  const cols = isMobile ? 3 : 4;
  const rows = isMobile ? 3 : 5;
  const highlightIndices = isMobile ? [1, 4, 7] : [3, 9, 15]; // Top 3 matches

  return (
    <div className={styles.volunteerGrid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols * rows }, (_, i) => (
        <div
          key={i}
          className={styles.volunteerDot}
          style={{
            backgroundColor: highlightIndices.includes(i) ? 'var(--jade)' : 'var(--text-muted)',
          }}
        />
      ))}
    </div>
  );
}

function MatchingEngine() {
  const sectionRef = useRef<HTMLElement>(null);
  const formulaRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const [lineLength, setLineLength] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // isInView for formula bars
  const isFormulaInView = useInView(formulaRef, { once: true, margin: '-15%' });

  // Scroll progress for timeline line draw
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start center', 'end center'],
  });

  // Transform scroll progress to stroke dash offset
  const strokeDashoffset = useTransform(scrollYProgress, [0, 0.8], [lineLength, 0]);

  // Calculate completed steps based on scroll progress
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      const stepProgress = latest / 0.8;
      const steps = Math.floor(stepProgress * 7);
      setCompletedSteps(Math.min(steps, 7));
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Get line length on mount
  useEffect(() => {
    if (lineRef.current) {
      setLineLength(lineRef.current.getTotalLength());
    }
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section id="matching-engine" ref={sectionRef} className={styles.matchingEngine}>
      <NoiseTexture opacity={0.025} />

      <div className={styles.matchingGrid}>
        {/* LEFT COLUMN — Formula */}
        <div className={styles.formulaColumn} ref={formulaRef}>
          <p className={styles.eyebrow}>SEVA MATCHING SCORE</p>

          <h2 className={styles.headline}>The formula behind the dispatch.</h2>

          {/* Formula block */}
          <div className={styles.formulaBlock}>
            {`Match Score = w1(Proximity)
              + w2(SkillFit)
              + w3(Availability)
              + w4(Reliability)
              + w5(Equity)
              + w6(Urgency)`}
          </div>

          {/* Weight bars */}
          <div className={styles.weightBars}>
            {weights.map((row, index) => (
              <div key={row.label} className={styles.weightRow}>
                <span className={styles.weightLabel}>{row.label}</span>
                <div className={styles.weightTrack}>
                  <motion.div
                    className={styles.weightFill}
                    initial={{ width: 0 }}
                    animate={isFormulaInView ? { width: `${row.percent}%` } : { width: 0 }}
                    transition={{ duration: 0.8, ease: [0.25, 0, 0, 1], delay: index * 0.1 }}
                    style={{ backgroundColor: row.color }}
                  />
                </div>
                <span className={styles.weightPercent}>{row.percent}%</span>
              </div>
            ))}
          </div>

          {/* Emergency override */}
          <div className={styles.emergencyOverride}>
            <p className={styles.emergencyText}>
              Emergency override: Proximity weight shifts to 50%. Speed over everything.
            </p>
            <div className={styles.miniWeightBars}>
              {emergencyWeights.map((row, index) => (
                <div key={row.label} className={styles.miniWeightRow}>
                  <span className={styles.miniWeightLabel}>{row.label}</span>
                  <div className={styles.miniWeightTrack}>
                    <motion.div
                      className={styles.miniWeightFill}
                      initial={{ width: 0 }}
                      animate={isFormulaInView ? { width: `${row.percent}%` } : { width: 0 }}
                      transition={{ duration: 0.8, ease: [0.25, 0, 0, 1], delay: 0.6 + index * 0.1 }}
                      style={{ backgroundColor: row.color }}
                    />
                  </div>
                  <span className={styles.miniWeightPercent}>{row.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pull quote */}
          <blockquote className={styles.pullQuote}>
            Every AI decision is logged in plain language. Override it with one tap — and it learns.
          </blockquote>
        </div>

        {/* RIGHT COLUMN — Timeline */}
        <div className={styles.timelineColumn} ref={timelineRef}>
          {/* SVG connecting line */}
          <svg className={styles.timelineLine} aria-hidden="true">
            <motion.line
              ref={lineRef}
              x1="20"
              y1="20"
              x2="20"
              y2="100%"
              stroke="var(--border-strong)"
              strokeWidth="1"
              strokeDasharray={lineLength}
              style={{ strokeDashoffset }}
            />
          </svg>

          {/* Timeline steps */}
          <div className={styles.timelineSteps}>
            {timelineSteps.map((step, index) => {
              const isCompleted = index < completedSteps;

              return (
                <motion.div
                  key={index}
                  className={styles.timelineStep}
                  initial={{ opacity: 0, y: 24 }}
                  animate={isFormulaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                  transition={{ ...springWarm, delay: 0.2 + index * 0.1 }}
                >
                  {/* Node */}
                  <div
                    className={styles.stepNode}
                    style={{
                      backgroundColor: isCompleted ? 'var(--accent)' : 'var(--bg-2)',
                      borderColor: isCompleted ? 'var(--accent)' : 'var(--border)',
                      color: isCompleted ? '#F5EDE0' : 'var(--text-muted)',
                    }}
                  >
                    {index === 5 ? <CheckCircleIcon active={isCompleted} /> : step.icon}
                  </div>

                  {/* Content */}
                  <div className={styles.stepContent}>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepSub}>{step.sub}</p>

                    {/* Chips */}
                    {step.chips && (
                      <div className={styles.stepChips}>
                        {step.chips.map((chip, chipIndex) =>
                          chip.type === 'grid' ? (
                            <VolunteerGrid key={chipIndex} isMobile={isMobile} />
                          ) : (
                            <span
                              key={chipIndex}
                              className={styles.chip}
                              data-type={chip.type}
                            >
                              {chip.text}
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MatchingEngine;
