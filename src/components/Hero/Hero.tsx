import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NoiseTexture } from '../shared';
import styles from './Hero.module.css';

// Motion configs from foundation
const springWarm = { type: 'spring', stiffness: 220, damping: 16 } as const;
const springSnappy = { type: 'spring', stiffness: 400, damping: 25 } as const;
const easeMapData = { duration: 1.2, ease: [0.25, 0, 0, 1] } as const;

// Category configuration with full metadata
const CATEGORIES = [
  { id: 'food', label: 'Food', color: '#E85A4F' },
  { id: 'health', label: 'Health', color: '#3DB88A' },
  { id: 'education', label: 'Education', color: '#5B8DEF' },
  { id: 'shelter', label: 'Shelter', color: '#D4922A' },
  { id: 'clothing', label: 'Clothing', color: '#9B6DD7' },
] as const;

// SVG icon paths for each category (rendered inside hexagons)
const CATEGORY_ICONS: Record<CategoryId, { path: string; viewBox: string }> = {
  food: {
    // Bowl with steam
    path: 'M3 9h18v1c0 3.87-3.13 7-7 7h-4c-3.87 0-7-3.13-7-7V9zm2-3h14v1H5V6zm3-3h8v1H8V3z',
    viewBox: '0 0 24 24',
  },
  health: {
    // Medical cross
    path: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z',
    viewBox: '0 0 24 24',
  },
  education: {
    // Open book
    path: 'M12 4L2 7v11l10-3 10 3V7L12 4zm0 2.5l6 1.8v6.4l-6-1.8-6 1.8V8.3l6-1.8z',
    viewBox: '0 0 24 24',
  },
  shelter: {
    // House
    path: 'M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 3.5L18 12v7h-2v-6H8v6H6v-7l6-5.5z',
    viewBox: '0 0 24 24',
  },
  clothing: {
    // T-shirt
    path: 'M16 3h-2l-2 3-2-3H8L4 7l3 2v11h10V9l3-2-4-4zm-4 4.5L14 5h.5l2 2-1.5 1V17H9V8L7.5 7l2-2H10l2 2.5z',
    viewBox: '0 0 24 24',
  },
};

type CategoryId = typeof CATEGORIES[number]['id'];

// Sample need descriptions for tooltips
const NEED_DESCRIPTIONS: Record<CategoryId, string[]> = {
  food: ['Rice packets needed', 'Mid-day meals', 'Emergency ration kits'],
  health: ['Medical camp', 'First-aid supplies', 'Vaccination drive'],
  education: ['School supplies', 'Books donation', 'Tuition support'],
  shelter: ['Temporary housing', 'Building repair', 'Bedding supplies'],
  clothing: ['Winter clothes', 'School uniforms', 'Blanket distribution'],
};

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
    const angle = (Math.PI / 180) * (60 * i);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

function getHexCenter(col: number, row: number, r: number, offsetX: number, offsetY: number) {
  const x = offsetX + col * r * 1.5;
  const y = offsetY + row * r * Math.sqrt(3) + (col % 2 === 1 ? (r * Math.sqrt(3)) / 2 : 0);
  return { x, y };
}

// Hex data type
interface HexData {
  id: string;
  col: number;
  row: number;
  category: typeof CATEGORIES[number];
  phase: number;
  cx: number;
  cy: number;
  need: string;
  urgency: 'low' | 'medium' | 'high';
  ngoName: string;
}

// Simulated NGO names
const NGO_NAMES = [
  'Akshaya Patra', 'Goonj', 'CRY India', 'Pratham', 'Smile Foundation',
  'HelpAge India', 'Teach For India', 'Robin Hood Army', 'Feeding India',
  'Habitat India', 'SEWA', 'Nanhi Kali', 'Magic Bus', 'iVolunteer',
];

// ─────────────────────────────────────────────────────────────
// INTERACTIVE HEX DEMO — Comprehensive Hero Visual
// ─────────────────────────────────────────────────────────────

function InteractiveHexDemo() {
  const COLS = 5;
  const ROWS = 4;
  const HEX_RADIUS = 22;
  const OFFSET_X = HEX_RADIUS + 12;
  const OFFSET_Y = (HEX_RADIUS * Math.sqrt(3)) / 2 + 12;

  // Refs for tooltip positioning
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate hexagons with rich metadata
  const [hexagons] = useState<HexData[]>(() => {
    const hexes: HexData[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const { x: cx, y: cy } = getHexCenter(col, row, HEX_RADIUS, OFFSET_X, OFFSET_Y);
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        const needs = NEED_DESCRIPTIONS[category.id];
        hexes.push({
          id: `${col}-${row}`,
          col,
          row,
          category,
          phase: Math.random() * Math.PI * 2,
          cx,
          cy,
          need: needs[Math.floor(Math.random() * needs.length)],
          urgency: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
          ngoName: NGO_NAMES[Math.floor(Math.random() * NGO_NAMES.length)],
        });
      }
    }
    return hexes;
  });

  // State management
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<CategoryId | 'all'>('all');
  const [stats, setStats] = useState({ resolved: 0, pending: 20, volunteers: 47 });
  const [connectionLine, setConnectionLine] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);

  // Volunteer positions with trails
  const [volunteers, setVolunteers] = useState<Array<{ x: number; y: number; targetHexId: string | null }>>(() => [
    { x: hexagons[0].cx, y: hexagons[0].cy, targetHexId: null },
    { x: hexagons[hexagons.length - 1].cx, y: hexagons[hexagons.length - 1].cy, targetHexId: null },
    { x: hexagons[Math.floor(hexagons.length / 2)].cx, y: hexagons[Math.floor(hexagons.length / 2)].cy, targetHexId: null },
  ]);

  // Auto resolution animation with matching state
  useEffect(() => {
    const interval = setInterval(() => {
      const unresolved = hexagons.filter((h) => !resolvedIds.has(h.id));
      if (unresolved.length === 0) {
        // Reset after all resolved
        setResolvedIds(new Set());
        setStats({ resolved: 0, pending: 20, volunteers: 47 });
        return;
      }

      // Pick a random unresolved hex
      const toMatch = unresolved[Math.floor(Math.random() * unresolved.length)];

      // Pick a volunteer to dispatch
      const volunteerIdx = Math.floor(Math.random() * volunteers.length);
      const volunteer = volunteers[volunteerIdx];

      // Show connection line
      setConnectionLine({
        from: { x: volunteer.x, y: volunteer.y },
        to: { x: toMatch.cx, y: toMatch.cy },
      });

      // Start matching animation
      setMatchingId(toMatch.id);

      // Move volunteer toward the hex
      setVolunteers((prev) =>
        prev.map((v, i) =>
          i === volunteerIdx ? { ...v, x: toMatch.cx, y: toMatch.cy, targetHexId: toMatch.id } : v
        )
      );

      // After delay, resolve
      setTimeout(() => {
        setMatchingId(null);
        setConnectionLine(null);
        setResolvedIds((prev) => new Set([...prev, toMatch.id]));
        setStats((prev) => ({
          ...prev,
          resolved: prev.resolved + 1,
          pending: Math.max(0, prev.pending - 1),
        }));
      }, 1800);
    }, 3500);

    return () => clearInterval(interval);
  }, [hexagons, resolvedIds, volunteers]);

  // Simulated volunteer movement when not dispatched
  useEffect(() => {
    const interval = setInterval(() => {
      setVolunteers((prev) =>
        prev.map((v) => {
          if (v.targetHexId) return v; // Don't interrupt dispatch
          const target = hexagons[Math.floor(Math.random() * hexagons.length)];
          return { ...v, x: target.cx, y: target.cy };
        })
      );
    }, 4000);
    return () => clearInterval(interval);
  }, [hexagons]);

  // Increment volunteers periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({ ...prev, volunteers: prev.volunteers + Math.floor(Math.random() * 3) }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Manual hex click to resolve
  const handleHexClick = useCallback((hex: HexData) => {
    if (resolvedIds.has(hex.id) || matchingId) return;

    setMatchingId(hex.id);
    setTimeout(() => {
      setMatchingId(null);
      setResolvedIds((prev) => new Set([...prev, hex.id]));
      setStats((prev) => ({
        ...prev,
        resolved: prev.resolved + 1,
        pending: Math.max(0, prev.pending - 1),
      }));
    }, 800);
  }, [resolvedIds, matchingId]);

  // Calculate viewBox dimensions with proper padding
  const svgWidth = COLS * HEX_RADIUS * 1.5 + HEX_RADIUS + 24;
  const svgHeight = ROWS * HEX_RADIUS * Math.sqrt(3) + (HEX_RADIUS * Math.sqrt(3)) / 2 + 24;

  // Hovered hex data for tooltip
  const hoveredHex = hoveredId ? hexagons.find((h) => h.id === hoveredId) : null;

  return (
    <div className={styles.demoContainer} ref={containerRef}>
      {/* Live Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{stats.resolved}</span>
          <span className={styles.statLabel}>Resolved</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{stats.pending}</span>
          <span className={styles.statLabel}>Pending</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{stats.volunteers}</span>
          <span className={styles.statLabel}>Active</span>
        </div>
        <motion.div
          className={styles.liveIndicator}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className={styles.liveDot} />
          LIVE
        </motion.div>
      </div>

      {/* Main Hex Grid */}
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className={styles.interactiveHexGrid}
        aria-label="Interactive resource allocation visualization"
        role="img"
      >
        {/* Connection line for volunteer dispatch */}
        <AnimatePresence>
          {connectionLine && (
            <motion.line
              x1={connectionLine.from.x}
              y1={connectionLine.from.y}
              x2={connectionLine.to.x}
              y2={connectionLine.to.y}
              stroke="rgba(245,237,224,0.6)"
              strokeWidth={2}
              strokeDasharray="4 4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
          )}
        </AnimatePresence>

        {/* Hexagons */}
        {hexagons.map((hex) => {
          const isResolved = resolvedIds.has(hex.id);
          const isMatching = matchingId === hex.id;
          const isHovered = hoveredId === hex.id;
          const isFiltered = activeFilter !== 'all' && hex.category.id !== activeFilter;
          const color = isResolved ? '#3DB88A' : hex.category.color;

          // Urgency ring
          const urgencyColors = { low: 'transparent', medium: '#D4922A', high: '#E85A4F' };

          return (
            <g
              key={hex.id}
              style={{ cursor: isResolved ? 'default' : 'pointer' }}
              onClick={() => handleHexClick(hex)}
              onMouseEnter={() => setHoveredId(hex.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Urgency ring (outer glow) */}
              {!isResolved && hex.urgency !== 'low' && (
                <motion.polygon
                  points={hexPoints(hex.cx, hex.cy, HEX_RADIUS)}
                  fill="none"
                  stroke={urgencyColors[hex.urgency]}
                  strokeWidth={2}
                  strokeOpacity={0.6}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.08, 1], strokeOpacity: [0.6, 0.3, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ transformOrigin: `${hex.cx}px ${hex.cy}px` }}
                />
              )}

              {/* Main hexagon */}
              <motion.polygon
                points={hexPoints(hex.cx, hex.cy, HEX_RADIUS * 0.88)}
                fill={color}
                fillOpacity={isFiltered ? 0.15 : isHovered ? 0.9 : 0.65}
                stroke={color}
                strokeWidth={isHovered ? 2 : 1}
                strokeOpacity={isFiltered ? 0.3 : 0.9}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{
                  scale: isMatching ? [1, 1.15, 1] : isHovered ? 1.05 : 1,
                  opacity: 1,
                  fillOpacity: isFiltered ? 0.15 : isResolved ? 0.85 : isHovered ? 0.9 : 0.65,
                }}
                transition={isMatching ? { duration: 0.6, times: [0, 0.5, 1] } : springSnappy}
                style={{ transformOrigin: `${hex.cx}px ${hex.cy}px` }}
              />

              {/* Matching pulse ring */}
              {isMatching && (
                <motion.polygon
                  points={hexPoints(hex.cx, hex.cy, HEX_RADIUS * 1.2)}
                  fill="none"
                  stroke="#3DB88A"
                  strokeWidth={3}
                  initial={{ scale: 0.8, opacity: 1 }}
                  animate={{ scale: 1.4, opacity: 0 }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  style={{ transformOrigin: `${hex.cx}px ${hex.cy}px` }}
                />
              )}

              {/* Category icon (SVG) */}
              {!isResolved && !isFiltered && (
                <g
                  transform={`translate(${hex.cx - 5}, ${hex.cy - 5})`}
                  style={{ pointerEvents: 'none' }}
                >
                  <svg width="10" height="10" viewBox={CATEGORY_ICONS[hex.category.id].viewBox}>
                    <path
                      d={CATEGORY_ICONS[hex.category.id].path}
                      fill="rgba(255,255,255,0.9)"
                    />
                  </svg>
                </g>
              )}

              {/* Resolved checkmark */}
              {isResolved && (
                <motion.path
                  d={`M${hex.cx - 6},${hex.cy} L${hex.cx - 2},${hex.cy + 5} L${hex.cx + 7},${hex.cy - 5}`}
                  fill="none"
                  stroke="white"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              )}
            </g>
          );
        })}

        {/* Volunteer dots */}
        {volunteers.map((vol, i) => (
          <motion.g key={i}>
            {/* Trail/glow */}
            <motion.circle
              r={8}
              fill="rgba(245,237,224,0.2)"
              initial={false}
              animate={{ cx: vol.x, cy: vol.y }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
            {/* Main dot */}
            <motion.circle
              r={4}
              fill="rgba(245,237,224,0.95)"
              stroke="rgba(44,24,16,0.3)"
              strokeWidth={1}
              initial={false}
              animate={{ cx: vol.x, cy: vol.y }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
          </motion.g>
        ))}
      </svg>

      {/* Category Legend / Filters */}
      <div className={styles.categoryLegend}>
        <button
          type="button"
          className={`${styles.legendItem} ${activeFilter === 'all' ? styles.legendActive : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`${styles.legendItem} ${activeFilter === cat.id ? styles.legendActive : ''}`}
            onClick={() => setActiveFilter(cat.id)}
          >
            <span className={styles.legendDot} style={{ background: cat.color }} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredHex && !resolvedIds.has(hoveredHex.id) && (
          <motion.div
            className={styles.hexTooltip}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <div className={styles.tooltipHeader}>
              <svg 
                className={styles.tooltipIcon} 
                width="14" 
                height="14" 
                viewBox={CATEGORY_ICONS[hoveredHex.category.id].viewBox}
              >
                <path
                  d={CATEGORY_ICONS[hoveredHex.category.id].path}
                  fill={hoveredHex.category.color}
                />
              </svg>
              <span className={styles.tooltipCategory} style={{ color: hoveredHex.category.color }}>
                {hoveredHex.category.label}
              </span>
              {hoveredHex.urgency === 'high' && <span className={styles.tooltipUrgent}>Urgent</span>}
            </div>
            <p className={styles.tooltipNeed}>{hoveredHex.need}</p>
            <p className={styles.tooltipNgo}>
              <span className={styles.tooltipNgoLabel}>Matched:</span> {hoveredHex.ngoName}
            </p>
            <p className={styles.tooltipHint}>Click to resolve</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
              <InteractiveHexDemo />
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
