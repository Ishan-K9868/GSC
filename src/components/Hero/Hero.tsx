import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NoiseTexture } from '../shared';
import styles from './Hero.module.css';

// Motion configs from foundation
const springWarm = { type: 'spring', stiffness: 220, damping: 16 } as const;
const easeMapData = { duration: 1.2, ease: [0.25, 0, 0, 1] } as const;

// Category colors for mini hex grid (matching Section 7)
const categoryColors = [
  '#E85A4F', // Food/Hunger - warm red
  '#3DB88A', // Health - jade
  '#5B8DEF', // Education - blue
  '#D4922A', // Shelter - amber
  '#9B6DD7', // Clothing - purple
];

// Word animation variants
const wordVariants = {
  hidden: { y: '120%', opacity: 0, rotateX: -40 },
  visible: { y: '0%', opacity: 1, rotateX: 0, transition: springWarm },
};

const fadeRise = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: springWarm },
};

// ─────────────────────────────────────────────────────────────
// HEX GEOMETRY (FLAT-TOP) — matches PulseMapSection
// ─────────────────────────────────────────────────────────────

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i); // 0° offset for flat-top
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

function getHexCenter(col: number, row: number, r: number, offsetX: number, offsetY: number) {
  const x = offsetX + col * r * 1.5;
  const y = offsetY + row * r * Math.sqrt(3) + (col % 2 === 1 ? r * Math.sqrt(3) / 2 : 0);
  return { x, y };
}

// Mini HexGrid Component (5×4 grid preview for Hero)
function MiniHexGrid() {
  const COLS = 5;
  const ROWS = 4;
  const HEX_RADIUS = 22;
  const OFFSET_X = HEX_RADIUS + 4;
  const OFFSET_Y = HEX_RADIUS * Math.sqrt(3) / 2 + 4;

  // Generate hexagons with random colors and phase offsets
  const [hexagons] = useState(() => {
    const hexes: { id: string; col: number; row: number; color: string; phase: number; cx: number; cy: number }[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const { x: cx, y: cy } = getHexCenter(col, row, HEX_RADIUS, OFFSET_X, OFFSET_Y);
        hexes.push({
          id: `${col}-${row}`,
          col,
          row,
          color: categoryColors[Math.floor(Math.random() * categoryColors.length)],
          phase: Math.random() * Math.PI * 2,
          cx,
          cy,
        });
      }
    }
    return hexes;
  });

  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [volunteerPositions, setVolunteerPositions] = useState(() => {
    const centers = hexagons.map(h => ({ x: h.cx, y: h.cy }));
    return [
      centers[Math.floor(Math.random() * centers.length)],
      centers[Math.floor(Math.random() * centers.length)],
    ];
  });

  // Resolution animation - every 4s resolve a random hex
  useEffect(() => {
    const interval = setInterval(() => {
      setResolvedIds((prev) => {
        const unresolved = hexagons.filter((h) => !prev.has(h.id));
        if (unresolved.length === 0) return new Set(); // Reset
        const toResolve = unresolved[Math.floor(Math.random() * unresolved.length)];
        return new Set([...prev, toResolve.id]);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [hexagons]);

  // Volunteer dot movement between hex centers
  useEffect(() => {
    const interval = setInterval(() => {
      setVolunteerPositions((prev) =>
        prev.map(() => {
          const target = hexagons[Math.floor(Math.random() * hexagons.length)];
          return { x: target.cx, y: target.cy };
        })
      );
    }, 2500);
    return () => clearInterval(interval);
  }, [hexagons]);

  // Calculate viewBox dimensions
  const svgWidth = COLS * HEX_RADIUS * 1.5 + HEX_RADIUS + 8;
  const svgHeight = ROWS * HEX_RADIUS * Math.sqrt(3) + HEX_RADIUS * Math.sqrt(3) / 2 + 8;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className={styles.miniHexGrid}
      aria-hidden="true"
    >
      {hexagons.map((hex) => {
        const isResolved = resolvedIds.has(hex.id);
        const color = isResolved ? '#3DB88A' : hex.color;

        return (
          <g key={hex.id}>
            <motion.polygon
              points={hexPoints(hex.cx, hex.cy, HEX_RADIUS * 0.9)}
              fill={color}
              fillOpacity={0.6}
              stroke={color}
              strokeWidth={1}
              strokeOpacity={0.8}
              initial={{ scale: 0.92 }}
              animate={{
                scale: [0.92, 1, 0.92],
                fillOpacity: isResolved ? 0.8 : 0.6,
              }}
              transition={{
                scale: {
                  duration: 2.5,
                  repeat: Infinity,
                  delay: hex.phase / (Math.PI * 2) * 2.5,
                  ease: 'easeInOut',
                },
                fillOpacity: { duration: 0.5 },
              }}
              style={{ transformOrigin: `${hex.cx}px ${hex.cy}px` }}
            />
            {isResolved && (
              <motion.path
                d={`M${hex.cx - 5},${hex.cy} L${hex.cx - 1},${hex.cy + 4} L${hex.cx + 6},${hex.cy - 4}`}
                fill="none"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </g>
        );
      })}
      {/* Volunteer dots */}
      {volunteerPositions.map((pos, i) => (
        <motion.circle
          key={i}
          r={4}
          fill="rgba(245,237,224,0.9)"
          initial={false}
          animate={{ cx: pos.x, cy: pos.y }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        />
      ))}
    </svg>
  );
}

// Demo Video Modal
function DemoModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.modalBackdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Demo video"
            className={styles.modalPanel}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={springWarm}
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={onClose}
              aria-label="Close modal"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <p className={styles.modalPlaceholder}>Demo video will be embedded here</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Headline words for split text animation
  const headlineLines = [
    { words: ['Where', 'every', 'need'], accent: false },
    { words: ['finds', 'its'], accent: false },
    { words: ['bridge.'], accent: true },
  ];

  return (
    <section id="hero" className={styles.hero}>
      {/* Background Layers */}
      <NoiseTexture opacity={0.03} />
      <div className={styles.hexGridBg} aria-hidden="true" />

      {/* Devanagari Texture */}
      <div className={styles.devanagariTexture} aria-hidden="true">
        सेवा
      </div>

      {/* Main Content */}
      <div className={styles.heroInner}>
        {/* Left Column */}
        <div className={styles.leftColumn}>
          {/* Eyebrow */}
          <motion.p
            className={`eyebrow ${styles.eyebrow}`}
            initial="hidden"
            animate="visible"
            variants={fadeRise}
          >
            GOOGLE SOLUTION CHALLENGE 2026 · THEME 5: SMART RESOURCE ALLOCATION
          </motion.p>

          {/* Headline with Split Text Animation */}
          <motion.h1
            className={styles.headline}
            initial="hidden"
            animate="visible"
            style={{ perspective: 800 }}
          >
            {headlineLines.map((line, lineIndex) => (
              <span key={lineIndex} className={styles.headlineLine}>
                {line.words.map((word, wordIndex) => {
                  const globalIndex =
                    headlineLines
                      .slice(0, lineIndex)
                      .reduce((acc, l) => acc + l.words.length, 0) + wordIndex;
                  return (
                    <span key={wordIndex} className={styles.wordWrapper}>
                      <motion.span
                        className={styles.word}
                        variants={isMobile ? fadeRise : wordVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{
                          ...springWarm,
                          delay: isMobile ? 0 : globalIndex * 0.06,
                        }}
                        style={line.accent ? { color: 'var(--accent)' } : undefined}
                      >
                        {word}
                      </motion.span>
                    </span>
                  );
                })}
              </span>
            ))}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className={styles.subheadline}
            initial="hidden"
            animate="visible"
            variants={fadeRise}
            transition={{ ...springWarm, delay: 0.4 }}
          >
            SevaSetu connects India's 3.3 million NGOs to communities in need — powered by AI that
            understands Hindi, sees photos, and dispatches help in minutes.
          </motion.p>

          {/* CTA Row */}
          <motion.div
            className={styles.ctaRow}
            initial="hidden"
            animate="visible"
            variants={fadeRise}
            transition={{ ...springWarm, delay: 0.5 }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => scrollToSection('three-pillars')}
              aria-label="Explore the SevaSetu platform"
            >
              Explore the Platform
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 8L12 8M9 5L12 8L9 11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDemoOpen(true)}
              aria-label="Watch the SevaSetu demo video"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                <path d="M5 3L14 8L5 13Z" />
              </svg>
              Watch the Demo
            </button>
          </motion.div>

          {/* Micro Trust Strip */}
          <motion.p
            className={styles.microTrust}
            initial="hidden"
            animate="visible"
            variants={fadeRise}
            transition={{ ...springWarm, delay: 0.6 }}
          >
            500+ NGOs · 15 States · 2,00,000 Volunteers
          </motion.p>
        </div>

        {/* Right Column */}
        <motion.div
          className={styles.rightColumn}
          initial={{ scale: isMobile ? 1 : 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...easeMapData, delay: 0.2 }}
        >
          {/* Browser Frame */}
          <div className={styles.browserFrame}>
            {/* Chrome Bar */}
            <div className={styles.chromeBar}>
              <div className={styles.trafficLights} aria-hidden="true">
                <span className={styles.trafficLight} style={{ background: '#E05353' }} />
                <span className={styles.trafficLight} style={{ background: '#D4921A' }} />
                <span className={styles.trafficLight} style={{ background: '#50C078' }} />
              </div>
              <span className={styles.chromeUrl}>sevasetu.app</span>
            </div>
            {/* Screen Area */}
            <div className={styles.screenArea}>
              <MiniHexGrid />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Demo Modal */}
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}

export default Hero;
