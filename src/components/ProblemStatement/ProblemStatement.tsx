import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView } from 'motion/react';
import { NoiseTexture, AnimatedCounter } from '../shared';
import styles from './ProblemStatement.module.css';

// Motion configs from foundation
const springWarm = { type: 'spring', stiffness: 220, damping: 16 } as const;

const fadeRise = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: springWarm },
};

const scaleFade = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: springWarm },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.4 },
  },
};

// Headline lines
const headlineLines = [
  "India has the world's",
  'largest NGO sector.',
  "And the world's worst",
  'coordination problem.',
];

// Card 1 - Response Time with animated sequence
function ResponseTimeCard({ isInView }: { isInView: boolean }) {
  const [stage, setStage] = useState(0);
  // Stage 0: Counter running
  // Stage 1: Arrow drawing
  // Stage 2: "6 hours" visible

  useEffect(() => {
    if (!isInView) return;

    // After counter completes (~2000ms)
    const timer1 = setTimeout(() => setStage(1), 2000);
    // After arrow draws (+400ms)
    const timer2 = setTimeout(() => setStage(2), 2600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isInView]);

  return (
    <div className={styles.statCard}>
      <span className={`${styles.chip} ${styles.chipAccent}`}>RESPONSE TIME</span>
      <div className={styles.statRow}>
        <span className={styles.statNumber}>
          <AnimatedCounter target={4} suffix=" days" duration={2000} />
        </span>
        <svg
          className={styles.arrowSvg}
          width="24"
          height="12"
          viewBox="0 0 18 12"
          fill="none"
          aria-hidden="true"
        >
          <motion.path
            d="M2 6L16 6M11 2L16 6L11 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={stage >= 1 ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </svg>
        <motion.span
          className={styles.statNumber}
          initial={{ opacity: 0 }}
          animate={stage >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          6 hours
        </motion.span>
      </div>
      <p className={styles.statLabel}>Average need-to-response time</p>
      <p className={styles.statNote}>85% reduction targeted</p>
    </div>
  );
}

// Card 2 - Retention Crisis
function RetentionCard() {
  return (
    <div className={styles.statCard}>
      <span className={`${styles.chip} ${styles.chipAmber}`}>RETENTION CRISIS</span>
      <p className={styles.statNumber}>
        <AnimatedCounter target={63} suffix="%" duration={2000} />
      </p>
      <p className={styles.statLabel}>Volunteers who drop off after their first task</p>
      <p className={styles.statNote}>Industry-wide retention problem</p>
    </div>
  );
}

// Card 3 - Infrastructure
function InfrastructureCard() {
  return (
    <div className={styles.statCard}>
      <span className={`${styles.chip} ${styles.chipMuted}`}>INFRASTRUCTURE</span>
      <p className={styles.statNumber}>Rs. 0</p>
      <p className={styles.statLabel}>Typical NGO technology budget</p>
      <p className={styles.statNote}>Paper forms. WhatsApp groups. Excel.</p>
    </div>
  );
}

function ProblemStatement() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const isContentInView = useInView(contentRef, { once: true, margin: '-15%' });
  const isQuoteInView = useInView(quoteRef, { once: true, margin: '-15%' });
  const isCardsInView = useInView(cardsRef, { once: true, margin: '-15%' });

  // Parallax for bleed element
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const bleedX = useTransform(scrollYProgress, [0, 1], [0, 40]);

  // Check for mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section id="problem" ref={sectionRef} className={styles.problem}>
      {/* Background layers */}
      <NoiseTexture opacity={0.04} />
      <div className={styles.radialGlow} aria-hidden="true" />

      {/* Bleed element - "3.3 million" */}
      <motion.div
        className={styles.bleedElement}
        aria-hidden="true"
        style={{ x: isMobile ? 0 : bleedX }}
      >
        3.3 million
      </motion.div>

      <motion.div
        className={styles.rightVisual}
        aria-hidden="true"
        initial={{ opacity: 0, x: 36 }}
        animate={isContentInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 36 }}
        transition={{ ...springWarm, delay: 0.25 }}
      >
        <svg viewBox="0 0 640 380" className={styles.visualSvg}>
          <defs>
            <linearGradient id="problem-flow-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(245,237,224,0.05)" />
              <stop offset="100%" stopColor="rgba(245,237,224,0.015)" />
            </linearGradient>
            <linearGradient id="problem-flow-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(245,237,224,0.45)" />
              <stop offset="100%" stopColor="rgba(245,237,224,0.15)" />
            </linearGradient>
          </defs>

          <rect x="1" y="1" width="638" height="378" rx="24" fill="url(#problem-flow-bg)" stroke="rgba(245,237,224,0.12)" />

          <rect x="56" y="72" width="176" height="72" rx="14" fill="rgba(245,237,224,0.06)" stroke="rgba(245,237,224,0.14)" />
          <text x="76" y="102" fill="#F5EDE0" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em' }}>
            FIELD NEEDS
          </text>
          <text x="76" y="124" fill="rgba(245,237,224,0.72)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '13px' }}>
            Voice, photo, WhatsApp
          </text>

          <rect x="56" y="236" width="176" height="72" rx="14" fill="rgba(245,237,224,0.06)" stroke="rgba(245,237,224,0.14)" />
          <text x="76" y="266" fill="#F5EDE0" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em' }}>
            RESOURCES
          </text>
          <text x="76" y="288" fill="rgba(245,237,224,0.72)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '13px' }}>
            NGOs, volunteers, kits
          </text>

          <rect x="408" y="154" width="176" height="72" rx="14" fill="rgba(245,237,224,0.06)" stroke="rgba(245,237,224,0.14)" />
          <text x="428" y="184" fill="#F5EDE0" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em' }}>
            NGO RESPONSE
          </text>
          <text x="428" y="206" fill="rgba(245,237,224,0.72)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '13px' }}>
            Delayed manual dispatch
          </text>

          <path d="M232 108 C292 108 304 164 388 174" fill="none" stroke="url(#problem-flow-line)" strokeWidth="2.5" strokeDasharray="8 10" />
          <path d="M232 272 C292 272 304 216 388 206" fill="none" stroke="url(#problem-flow-line)" strokeWidth="2.5" strokeDasharray="8 10" />

          <motion.circle
            cx="320"
            cy="190"
            r="20"
            fill="rgba(212,98,42,0.2)"
            stroke="rgba(212,98,42,0.55)"
            strokeWidth="1.5"
            animate={{ scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '320px 190px' }}
          />
          <path d="M320 180 L320 193 M320 201 L320 202" stroke="#F5EDE0" strokeWidth="2.2" strokeLinecap="round" />

          <text x="320" y="336" textAnchor="middle" fill="rgba(245,237,224,0.6)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '12px', letterSpacing: '0.06em' }}>
            DISCONNECTED WORKFLOWS CREATE RESPONSE DELAY
          </text>
        </svg>
      </motion.div>

      {/* Content area */}
      <div className={styles.content}>
        <div ref={contentRef}>
          {/* Eyebrow */}
          <motion.p
            className={`eyebrow-jade ${styles.eyebrow}`}
            initial="hidden"
            animate={isContentInView ? 'visible' : 'hidden'}
            variants={fadeRise}
          >
            THE BROKEN LOOP
          </motion.p>

          {/* Headline - stagger per line */}
          <motion.h2
            className={styles.headline}
            initial="hidden"
            animate={isContentInView ? 'visible' : 'hidden'}
          >
            {headlineLines.map((line, index) => (
              <motion.span
                key={index}
                className={styles.headlineLine}
                variants={fadeRise}
                transition={{ ...springWarm, delay: index * 0.1 }}
              >
                {line}
              </motion.span>
            ))}
          </motion.h2>

          {/* Body text */}
          <motion.p
            className={styles.bodyText}
            initial="hidden"
            animate={isContentInView ? 'visible' : 'hidden'}
            variants={fadeRise}
            transition={{ ...springWarm, delay: 0.4 }}
          >
            The problem is not a lack of will or resources. It is a fundamental information asymmetry:
            needs exist in one place, resources exist in another, and no system connects them intelligently.
          </motion.p>
        </div>

        {/* Stat cards */}
        <motion.div
          ref={cardsRef}
          className={styles.statGrid}
          initial="hidden"
          animate={isCardsInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
        >
          <motion.div variants={scaleFade} className={styles.cardWrapper}>
            <ResponseTimeCard isInView={isCardsInView} />
          </motion.div>
          <motion.div variants={scaleFade} className={styles.cardWrapper}>
            <RetentionCard />
          </motion.div>
          <motion.div variants={scaleFade} className={styles.cardWrapper}>
            <InfrastructureCard />
          </motion.div>
        </motion.div>

        {/* Pull quote + "Until now." */}
        <div ref={quoteRef} className={styles.quoteSection}>
          <div className="divider" style={{ margin: '64px 0 48px' }} />

          <motion.blockquote
            className={styles.pullQuote}
            initial="hidden"
            animate={isQuoteInView ? 'visible' : 'hidden'}
            variants={fadeRise}
          >
            Needs exist in one place. Resources in another. No system connects them intelligently.
          </motion.blockquote>

          <motion.span
            className={styles.untilNow}
            initial="hidden"
            animate={isQuoteInView ? 'visible' : 'hidden'}
            variants={scaleFade}
            transition={{ ...springWarm, delay: 0.3 }}
          >
            Until now.
          </motion.span>
        </div>
      </div>
    </section>
  );
}

export default ProblemStatement;
