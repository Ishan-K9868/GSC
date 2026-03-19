import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import styles from './TechFoundation.module.css';

// Motion config from foundation
const springWarm = { type: 'spring', stiffness: 220, damping: 16 } as const;

const gridVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: springWarm }
};

// Google Product Logo Marks (all simplified monochrome)
function GoogleLogo({ product, size = 20, color = 'var(--text-muted)' }: { product: string; size?: number; color?: string }) {
  const svgStyle = {
    width: `${size}px`,
    height: `${size}px`,
    fill: color
  };

  switch (product) {
    case 'gemini':
      // Three diamond shapes at 0°/120°/240° overlapping at center
      return (
        <svg viewBox="0 0 40 40" style={svgStyle} aria-hidden="true">
          <path d="M20 4 L28 20 L20 36 L12 20 Z" />
          <path d="M6.93 13 L20 28.93 L33.07 13 L20 17.07 Z" />
          <path d="M6.93 27 L20 11.07 L33.07 27 L20 22.93 Z" />
        </svg>
      );
    case 'maps':
      // Map pin teardrop outline
      return (
        <svg viewBox="0 0 20 20" style={svgStyle} aria-hidden="true">
          <path d="M10 2 Q14 2 16 6 Q18 10 10 18 Q2 10 4 6 Q6 2 10 2 Z M10 8 Q11.5 8 11.5 10 Q11.5 12 10 12 Q8.5 12 8.5 10 Q8.5 8 10 8 Z" />
        </svg>
      );
    case 'vertex':
      // Three connected nodes (triangle formation)
      return (
        <svg viewBox="0 0 20 20" style={svgStyle} aria-hidden="true">
          <circle cx="10" cy="4" r="2" />
          <circle cx="4" cy="16" r="2" />
          <circle cx="16" cy="16" r="2" />
          <path d="M10 6 L6 14 M10 6 L14 14 M6 16 L14 16" stroke={color} strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'firebase':
      // Abstract flame path
      return (
        <svg viewBox="0 0 20 20" style={svgStyle} aria-hidden="true">
          <path d="M10 2 L14 8 L10 6 L6 10 L10 18 L18 10 L12 4 L10 2 Z M6 10 L10 18 L2 12 Z" />
        </svg>
      );
    case 'forecast':
      // Node network with directional arrows
      return (
        <svg viewBox="0 0 20 20" style={svgStyle} aria-hidden="true">
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="10" cy="6" r="1.5" />
          <circle cx="10" cy="14" r="1.5" />
          <circle cx="16" cy="10" r="1.5" />
          <path d="M5.5 9.5 L8.5 7 M5.5 10.5 L8.5 13 M11.5 7 L14.5 9.5 M11.5 13 L14.5 10.5" stroke={color} strokeWidth="1.2" fill="none" />
          <path d="M13 9 L14.5 9.5 L13.5 11" stroke={color} strokeWidth="1" fill="none" />
        </svg>
      );
    case 'bigquery':
      // Stylized "B" made from two data-bar shapes
      return (
        <svg viewBox="0 0 20 20" style={svgStyle} aria-hidden="true">
          <path d="M6 4 L6 16 L12 16 Q15 16 15 13 Q15 11 13 10.5 Q15 10 15 7 Q15 4 12 4 Z M8 6 L11 6 Q13 6 13 7.5 Q13 9 11 9 L8 9 Z M8 11 L11.5 11 Q13 11 13 13 Q13 14 11.5 14 L8 14 Z" />
        </svg>
      );
    default:
      return null;
  }
}

// Mini hex grid for Maps card
function HexGrid() {
  const hexPoints = (cx: number, cy: number, r: number) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  };

  const hexPositions = [
    { x: 12, y: 10, color: '#E05353' }, // emergency
    { x: 22, y: 6, color: '#50C078' }, // health
    { x: 32, y: 10, color: '#26BDE2' }, // water
    { x: 12, y: 20, color: '#E05353' },
    { x: 22, y: 16, color: '#50C078' },
    { x: 32, y: 20, color: '#26BDE2' },
    { x: 12, y: 30, color: '#E05353' },
    { x: 22, y: 26, color: '#50C078' },
    { x: 32, y: 30, color: '#26BDE2' }
  ];

  return (
    <svg width="44" height="40" viewBox="0 0 44 40" className={styles.hexGrid} aria-hidden="true">
      {hexPositions.map((pos, i) => (
        <polygon key={i} points={hexPoints(pos.x, pos.y, 6)} fill={pos.color} opacity="0.6" />
      ))}
    </svg>
  );
}

export default function TechFoundation() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15, margin: '-15%' });

  return (
    <section id="tech" className={styles.techFoundation} ref={ref}>
      {/* Section header */}
      <p className="eyebrow-jade" style={{ textAlign: 'center', marginBottom: '16px' }}>
        BUILT ON GOOGLE AI
      </p>

        <h2
          style={{
            fontFamily: "'Bricolage Grotesque', Georgia, serif",
            fontWeight: 800,
            fontSize: 'clamp(2.5rem, 5.5vw, 5rem)',
            lineHeight: 0.92,
            letterSpacing: '-0.03em',
            color: '#F5EDE0',
            maxWidth: '20ch',
            margin: '0 auto 64px',
            textAlign: 'center'
          }}
        >
        Every layer powered by a Google technology designed for this exact problem.
      </h2>

      {/* Bento grid */}
      <motion.div
        className={styles.bentoGrid}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={gridVariants}
      >
        {/* Cell 1 — Gemini 2.5 (2×2 hero card) */}
        <motion.div className={`${styles.bentoCard} ${styles.cardGemini}`} variants={cardVariants}>
          {/* Jade-colored large Gemini mark */}
          <div style={{ marginBottom: '16px' }}>
            <GoogleLogo product="gemini" size={40} color="var(--jade)" />
          </div>

          <h3 className={styles.cardTitle} style={{ fontSize: '1.25rem' }}>
            Gemini 2.5 Flash + Live API
          </h3>

          <p className={styles.cardBody} style={{ marginBottom: '20px' }}>
            Processes voice intake natively in 8 Indian languages. No intermediate speech-to-text —
            tone and urgency preserved. Multimodal: voice, photo, and text in one unified pipeline.
          </p>

          {/* Feature chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['Multimodal', '8 Languages', 'Live API'].map((label) => (
              <span key={label} className={styles.featureChip}>
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Cell 2 — Google Maps + H3 (2×1 wide) */}
        <motion.div className={`${styles.bentoCard} ${styles.cardMaps}`} variants={cardVariants}>
          <div className={styles.logoMark}>
            <GoogleLogo product="maps" size={20} />
          </div>

          <h3 className={styles.cardTitle}>Google Maps Platform + Uber H3</h3>

          <p className={styles.cardBody}>
            Hexagonal spatial indexing at 1km squared resolution. Powers the Pulse Map, volunteer
            proximity scoring, and surge forecasting geography.
          </p>

          {/* Mini hex grid */}
          <div className={styles.hexGridContainer}>
            <HexGrid />
          </div>
        </motion.div>

        {/* Cell 3 — Vertex AI Agent Builder (1×1) */}
        <motion.div className={`${styles.bentoCard} ${styles.cardVertex}`} variants={cardVariants}>
          <div className={styles.logoMark}>
            <GoogleLogo product="vertex" size={20} />
          </div>

          <h3 className={styles.cardTitle}>Vertex AI Agent Builder</h3>

          <p className={styles.cardBody}>
            SEVA Agent reasoning engine. Persistent memory. Agent2Agent protocol for cross-NGO
            coordination.
          </p>
        </motion.div>

        {/* Cell 4 — Firebase Real-time (1×1) */}
        <motion.div className={`${styles.bentoCard} ${styles.cardFirebase}`} variants={cardVariants}>
          <div className={styles.logoMark}>
            <GoogleLogo product="firebase" size={20} />
          </div>

          <h3 className={styles.cardTitle}>Firebase Real-time Infrastructure</h3>

          <p className={styles.cardBody}>
            Sub-200ms volunteer status sync. Live GPS tracking during active tasks. Offline-first
            conflict resolution.
          </p>
        </motion.div>

        {/* Cell 5 — Vertex AI Forecasting (2×1 wide) */}
        <motion.div className={`${styles.bentoCard} ${styles.cardForecast}`} variants={cardVariants}>
          <div className={styles.logoMark}>
            <GoogleLogo product="forecast" size={20} />
          </div>

          <h3 className={styles.cardTitle}>Vertex AI Forecasting</h3>

          <p className={styles.cardBody}>
            14-day surge prediction. Transitions NGOs from reactive to proactive operations.
          </p>
        </motion.div>

        {/* Cell 6 — BigQuery Analytics (2×1 wide) */}
        <motion.div className={`${styles.bentoCard} ${styles.cardBigQuery}`} variants={cardVariants}>
          <div className={styles.logoMark}>
            <GoogleLogo product="bigquery" size={20} />
          </div>

          <h3 className={styles.cardTitle}>BigQuery Analytics</h3>

          <p className={styles.cardBody}>
            Impact data warehouse. Every need and resolution feeds model retraining.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
