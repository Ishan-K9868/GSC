import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'motion/react';
import { NoiseTexture, AnimatedCounter } from '../shared';
import styles from './ImpactStats.module.css';

// Motion config from foundation
const scaleFade = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1 },
};

const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

function ImpactStats() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-15%' });

  // Cell 1 (Response Time) three-stage animation state
  const [showArrow, setShowArrow] = useState(false);
  const [showFinalTime, setShowFinalTime] = useState(false);
  const arrowRef = useRef<SVGPathElement>(null);
  const [arrowLength, setArrowLength] = useState(0);

  // Get arrow path length
  useEffect(() => {
    if (arrowRef.current) {
      setArrowLength(arrowRef.current.getTotalLength());
    }
  }, []);

  // Trigger arrow after counter completes (~2100ms)
  useEffect(() => {
    if (!isInView) return;
    const arrowTimer = setTimeout(() => setShowArrow(true), 2100);
    return () => clearTimeout(arrowTimer);
  }, [isInView]);

  // Trigger final time after arrow completes (~2500ms)
  useEffect(() => {
    if (!isInView) return;
    const finalTimeTimer = setTimeout(() => setShowFinalTime(true), 2500);
    return () => clearTimeout(finalTimeTimer);
  }, [isInView]);

  return (
    <section id="impact" ref={sectionRef} className={styles.impactStats}>
      <NoiseTexture opacity={0.05} />

      {/* Devanagari texture */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '-2%',
          bottom: '-5%',
          fontSize: 'clamp(15rem, 40vw, 35rem)',
          fontFamily: "'Noto Sans Devanagari', sans-serif",
          fontWeight: 900,
          opacity: 0.065,
          color: '#1C0E06',
          userSelect: 'none',
          pointerEvents: 'none',
          lineHeight: 0.85,
          zIndex: 0,
        }}
      >
        सेतु
      </div>

      {/* Content container */}
      <div className={styles.contentContainer}>
        {/* Eyebrow */}
        <p
          style={{
            fontFamily: "'General Sans', sans-serif",
            fontWeight: 600,
            fontSize: '0.6875rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(245,237,224,0.6)',
            marginBottom: '80px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          TARGET IMPACT — 18 MONTHS POST-LAUNCH
        </p>

        {/* Headline */}
        <h2
          style={{
            fontFamily: "'Bricolage Grotesque', Georgia, serif",
            fontWeight: 700,
            fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            color: '#F5EDE0',
            marginBottom: '80px',
            letterSpacing: '-0.02em',
            position: 'relative',
            zIndex: 1,
          }}
        >
          What we're building toward.
        </h2>

        {/* Stats Grid */}
        <motion.div
          className={styles.statsGrid}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={gridVariants}
        >
          {/* SVG Cross-hair dividers */}
          <svg
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            <line
              x1="50%"
              y1="0"
              x2="50%"
              y2="100%"
              stroke="rgba(245,237,224,0.2)"
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="50%"
              x2="100%"
              y2="50%"
              stroke="rgba(245,237,224,0.2)"
              strokeWidth="1"
            />
          </svg>

          {/* Cell 1 — Response Time (complex three-stage) */}
          <motion.div className={styles.statCell} variants={scaleFade}>
            <div className={styles.statValue}>
              {isInView && <AnimatedCounter target={4} suffix=" days" duration={2000} />}
              
              {/* Arrow */}
              <svg
                width="18"
                height="12"
                viewBox="0 0 18 12"
                style={{
                  margin: '0 8px',
                  opacity: showArrow ? 1 : 0,
                  transition: 'opacity 0.4s',
                }}
                aria-hidden="true"
              >
                <motion.path
                  ref={arrowRef}
                  d="M2,6 L16,6 M11,2 L16,6 L11,10"
                  stroke="rgba(245,237,224,0.7)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ strokeDasharray: arrowLength, strokeDashoffset: arrowLength }}
                  animate={showArrow ? { strokeDashoffset: 0 } : { strokeDashoffset: arrowLength }}
                  transition={{ duration: 0.4 }}
                />
              </svg>

              {/* Final time */}
              <span
                style={{
                  opacity: showFinalTime ? 1 : 0,
                  transition: 'opacity 0.2s',
                }}
              >
                6 hours
              </span>
            </div>

            <p className={styles.statLabel}>Need-to-response time</p>
            <p className={styles.statNote}>85% reduction targeted</p>
          </motion.div>

          {/* Cell 2 — NGO Count */}
          <motion.div className={styles.statCell} variants={scaleFade}>
            <div className={styles.statValue}>
              {isInView && <AnimatedCounter target={500} suffix="+" duration={2000} />}
            </div>
            <p className={styles.statLabel}>NGOs onboarded across 15 states</p>
            <p className={styles.statNote}>Free forever for NGOs</p>
          </motion.div>

          {/* Cell 3 — Volunteers (Indian numbering) */}
          <motion.div className={styles.statCell} variants={scaleFade}>
            <div className={styles.statValue}>
              {isInView && <AnimatedCounter target={200000} suffix="" duration={2000} locale="en-IN" />}
            </div>
            <p className={styles.statLabel}>Volunteers matched and deployed</p>
            <p className={styles.statNote}>Across 15 states</p>
          </motion.div>

          {/* Cell 4 — Reach (static) */}
          <motion.div className={styles.statCell} variants={scaleFade}>
            <div className={styles.statValue}>10M+</div>
            <p className={styles.statLabel}>Community members covered by Pulse Map</p>
            <p className={styles.statNote}>Growing with every field report</p>
          </motion.div>
        </motion.div>

        {/* Bottom disclaimer */}
        <p
          style={{
            fontFamily: "'General Sans', sans-serif",
            fontWeight: 400,
            fontSize: '0.75rem',
            color: 'rgba(245,237,224,0.4)',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
            marginTop: '48px',
          }}
        >
          All metrics are 18-month post-launch targets. Platform is in active development.
        </p>
      </div>
    </section>
  );
}

export default ImpactStats;
