import { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import styles from './ThreePillars.module.css';

// ─────────────────────────────────────────────────────────────
// CHIP DATA
// ─────────────────────────────────────────────────────────────

const subsections = [
  {
    id: 1,
    devanagari: '०१',
    eyebrow: 'SEVA INTAKE ENGINE',
    headline: '20 seconds. Any language. Any phone.',
    body: 'Voice, photo, WhatsApp, or web — all unified into one Gemini AI pipeline. Zero typing required. The field worker speaks; the platform understands.',
    chips: [
      { label: '8 Languages', icon: 'mic8' },
      { label: 'Vision AI', icon: 'eye' },
      { label: 'WhatsApp Native', icon: 'whatsapp' },
      { label: 'Offline-First', icon: 'offline' },
      { label: 'Gemini Live API', icon: 'gemini' },
    ],
  },
  {
    id: 2,
    devanagari: '०२',
    eyebrow: 'COMMUNITY PULSE MAP',
    headline: 'Every need. Every zone. Real-time.',
    body: 'A live AI-aggregated geospatial layer built from bottom-up field reports, weather signals, satellite data, and historical patterns. Updated every 47 seconds.',
    chips: [
      { label: '1km Sq Hexagonal Zones', icon: 'hex' },
      { label: '14-Day Surge Forecast', icon: 'forecast' },
      { label: 'IMD Weather Integration', icon: 'weather' },
      { label: '8 Toggleable Layers', icon: 'layers' },
      { label: 'Privacy-First', icon: 'privacy' },
    ],
  },
  {
    id: 3,
    devanagari: '०३',
    eyebrow: 'SEVA AGENT',
    headline: 'The right volunteer. In minutes, not days.',
    body: 'Autonomous AI dispatch engine. Computes compatibility across proximity, skills, reliability, and equity. Every AI decision logged in plain language — override it with one tap, and it learns.',
    chips: [
      { label: 'Gemini 2.5 Pro', icon: 'gemini' },
      { label: 'Auto-Cascade Matching', icon: 'cascade' },
      { label: 'Equity Weights', icon: 'equity' },
      { label: 'Coordinator Override', icon: 'override' },
      { label: 'Agent2Agent Protocol', icon: 'a2a' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// CHIP ICONS (14×14px, stroke-based)
// ─────────────────────────────────────────────────────────────

const chipIcons: Record<string, JSX.Element> = {
  mic8: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="1" width="4" height="7" rx="2" />
      <path d="M3 6v1a4 4 0 0 0 8 0V6" />
      <line x1="7" y1="11" x2="7" y2="13" />
      <text x="11" y="4" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">8</text>
    </svg>
  ),
  eye: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
      <circle cx="7" cy="7" r="2" />
    </svg>
  ),
  whatsapp: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12l1-3a5 5 0 1 1 2 2l-3 1z" />
      <path d="M5.5 7l1 1 2-2" />
    </svg>
  ),
  offline: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9a4.5 4.5 0 0 1 8 0" />
      <path d="M5 11a2.5 2.5 0 0 1 4 0" />
      <circle cx="7" cy="12" r="0.5" fill="currentColor" />
      <line x1="2" y1="2" x2="12" y2="12" />
    </svg>
  ),
  gemini: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1l1.5 3 1.5-2" />
      <path d="M7 1l-1.5 3-1.5-2" />
      <path d="M7 6l2 4 2-2" />
      <path d="M7 6l-2 4-2-2" />
    </svg>
  ),
  hex: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1l5 3v6l-5 3-5-3V4l5-3z" />
    </svg>
  ),
  forecast: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,10 4,6 7,8 10,3 13,5" />
      <polyline points="10,3 13,3 13,5" />
    </svg>
  ),
  weather: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="5" r="2.5" />
      <path d="M7 8a3 3 0 1 1 0 4H3a2 2 0 1 1 0-4h4z" />
    </svg>
  ),
  layers: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 2l5 2.5-5 2.5-5-2.5L7 2z" />
      <path d="M2 7l5 2.5L12 7" />
      <path d="M2 10l5 2.5 5-2.5" />
    </svg>
  ),
  privacy: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1l5 2v4c0 3-2.5 5-5 6-2.5-1-5-3-5-6V3l5-2z" />
      <path d="M5 7l1.5 1.5L9 6" />
    </svg>
  ),
  cascade: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="2" r="1.5" />
      <circle cx="3" cy="7" r="1.5" />
      <circle cx="11" cy="7" r="1.5" />
      <circle cx="3" cy="12" r="1.5" />
      <circle cx="11" cy="12" r="1.5" />
      <path d="M7 3.5v1L3 5.5M7 3.5v1l4 1" />
      <path d="M3 8.5v2M11 8.5v2" />
    </svg>
  ),
  equity: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="1" x2="7" y2="13" />
      <path d="M3 4l4-2 4 2" />
      <circle cx="3" cy="7" r="2" />
      <circle cx="11" cy="7" r="2" />
    </svg>
  ),
  override: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="5" />
      <path d="M7 4v3l2 1" />
      <path d="M11 2l1 1" />
    </svg>
  ),
  a2a: (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="3" cy="7" r="2" />
      <circle cx="11" cy="7" r="2" />
      <path d="M5 7h4" />
      <path d="M7 5l2 2-2 2" />
    </svg>
  ),
};

const categoryColors = ['#C0392B', '#E67E22', '#27AE60', '#2980B9', '#8E44AD', '#D4622A'];

// Category configuration with SVG icon paths
const PILLAR_CATEGORIES = [
  { id: 'emergency', label: 'Emergency', color: '#C0392B' },
  { id: 'food', label: 'Food', color: '#E67E22' },
  { id: 'health', label: 'Health', color: '#27AE60' },
  { id: 'water', label: 'Water', color: '#2980B9' },
  { id: 'education', label: 'Education', color: '#8E44AD' },
  { id: 'shelter', label: 'Shelter', color: '#D4622A' },
] as const;

// SVG icon paths for categories (inline in hex)
const PILLAR_CATEGORY_ICONS: Record<string, string> = {
  emergency: 'M6 2L8 6H4L6 2ZM6 8V10M6 11V11.5', // Warning triangle
  food: 'M3 6h6v1c0 2-1.5 3.5-3 3.5S3 9 3 7V6zm1-2h4v1H4V4z', // Bowl
  health: 'M5 3h2v2h2v2H7v2H5V7H3V5h2V3z', // Cross
  water: 'M6 2C6 2 2 6 2 8a4 4 0 0 0 8 0c0-2-4-6-4-6z', // Droplet
  education: 'M6 2L1 4.5l5 2.5 5-2.5L6 2zm0 4v4', // Book/graduation
  shelter: 'M6 2L1 6h2v4h6V6h2L6 2z', // House
};

function seedFromIndex(index: number): number {
  const x = Math.sin((index + 1) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function getInteractiveHexData(rows: number, cols: number) {
  return Array.from({ length: rows * cols }, (_, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const key = `${col}-${row}`;
    const roll = seedFromIndex(index);
    const colorRoll = seedFromIndex(index + 101);
    return {
      key,
      row,
      col,
      isFilled: roll > 0.56,
      color: categoryColors[Math.floor(colorRoll * categoryColors.length)]
    };
  });
}

// ─────────────────────────────────────────────────────────────
// ILLUSTRATION COMPONENTS
// ─────────────────────────────────────────────────────────────

function IllustrationIntake({ activeChip }: { activeChip: string | null }) {
  const [isListening, setIsListening] = useState(true);
  const [micActive, setMicActive] = useState(false);

  const toggleListening = () => {
    setMicActive(true);
    setIsListening((prev) => !prev);
    window.setTimeout(() => setMicActive(false), 180);
  };
  const languageMode = activeChip === 'mic8';
  const visionMode = activeChip === 'eye';
  const whatsappMode = activeChip === 'whatsapp';
  const offlineMode = activeChip === 'offline';
  const geminiMode = activeChip === 'gemini';

  return (
    <motion.div
      className={styles.illustrationWrapper}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5 }}
    >
      <svg width="360" height="360" viewBox="0 0 360 360" className={styles.illustrationSvg}>
        <defs>
          <pattern id="intakeDots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="1.2" fill="rgba(66,47,29,0.22)" />
          </pattern>
        </defs>

        <rect x="10" y="10" width="340" height="340" rx="28" fill="var(--bg-2)" stroke="var(--border)" />
        <rect x="26" y="26" width="308" height="308" rx="22" fill="url(#intakeDots)" />

        <text
          x="36"
          y="70"
          fontFamily="'Noto Sans Devanagari', sans-serif"
          fontWeight="900"
          fontSize="58"
          fill="var(--accent)"
        >
          ०१
        </text>

        <rect x="168" y="58" width="156" height="46" rx="13" fill="rgba(212,98,42,0.12)" stroke="rgba(212,98,42,0.35)" />
        <text x="182" y="79" fill="var(--text)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '11px', letterSpacing: '0.08em', fontWeight: 700 }}>
          LIVE INTAKE
        </text>
        <text x="182" y="94" fill="var(--text-muted)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '11px' }}>
          Tap mic to simulate capture
        </text>

        {offlineMode && (
          <motion.g initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <rect x="254" y="112" width="70" height="24" rx="10" fill="rgba(212,98,42,0.14)" stroke="rgba(212,98,42,0.4)" />
            <text x="289" y="128" textAnchor="middle" fill="var(--accent)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '10px', fontWeight: 700 }}>
              OFFLINE
            </text>
          </motion.g>
        )}

        <g transform="translate(128, 114)">
          <g
            role="button"
            tabIndex={0}
            aria-label="Toggle voice intake simulation"
            onClick={toggleListening}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleListening();
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <motion.circle
              cx="52"
              cy="68"
              r="50"
              fill="rgba(212,98,42,0.08)"
              stroke="rgba(212,98,42,0.28)"
              animate={micActive ? { scale: [1, 0.94, 1] } : { scale: 1 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ transformOrigin: '52px 68px' }}
            />
            <circle cx="52" cy="68" r="38" fill="rgba(212,98,42,0.14)" />

          <rect
            x="37"
            y="24"
            width="30"
            height="58"
            rx="15"
            fill="none"
            stroke="var(--text)"
            strokeWidth="3"
          />
          <line x1="52" y1="82" x2="52" y2="103" stroke="var(--text)" strokeWidth="3" />
          <path d="M34 103 Q52 116 70 103" fill="none" stroke="var(--text)" strokeWidth="3" />

          {[0, 1, 2].map((i) => (
            <motion.path
              key={i}
              d={`M77 ${38 + i * 10} Q${102 + i * 12} 52 77 ${66 + i * 10}`}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={3 - i * 0.6}
              opacity={1 - i * 0.3}
              initial={{ scaleX: 0.65 }}
              animate={isListening ? { scaleX: [0.65, 1.06, 0.65] } : { scaleX: 0.65 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.3,
              }}
              style={{ transformOrigin: '77px 52px' }}
            />
          ))}

            <title>Toggle listening animation</title>
          </g>
        </g>

        <rect x="46" y="250" width="268" height="58" rx="12" fill="rgba(245,237,224,0.06)" stroke="rgba(66,47,29,0.2)" />
        <text x="62" y="275" fill="var(--text)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '12px', fontWeight: 600 }}>
          {isListening ? 'Recognized: "Pani chahiye in Ward 6"' : 'Microphone paused'}
        </text>

        {Array.from({ length: 10 }, (_, i) => (
          <motion.rect
            key={i}
            x={64 + i * 23}
            y={286}
            width="9"
            height="10"
            rx="4"
            fill="var(--accent)"
            animate={
              isListening
                ? { height: [10, 24 + ((i + 1) % 4) * 5, 12], y: [286, 266 - ((i + 1) % 3) * 4, 284], opacity: [0.5, 0.95, 0.55] }
                : { height: 10, y: 286, opacity: 0.35 }
            }
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
          />
        ))}

        {visionMode && (
          <>
            <rect x="122" y="108" width="116" height="116" rx="16" fill="none" stroke="rgba(212,98,42,0.58)" strokeWidth="2" strokeDasharray="8 6" />
            <motion.line
              x1="122"
              x2="238"
              y1="126"
              y2="126"
              stroke="rgba(212,98,42,0.8)"
              strokeWidth="2"
              animate={{ y1: [126, 214, 126], y2: [126, 214, 126], opacity: [0, 1, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </>
        )}

        {whatsappMode && (
          <motion.g initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
            <rect x="234" y="170" width="92" height="30" rx="12" fill="rgba(61,184,138,0.16)" stroke="rgba(61,184,138,0.45)" />
            <text x="246" y="189" fill="var(--jade)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '11px', fontWeight: 600 }}>
              WhatsApp ✓✓
            </text>
          </motion.g>
        )}

        {geminiMode && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {[{ x: 98, y: 138 }, { x: 258, y: 142 }, { x: 244, y: 238 }].map((p, idx) => (
              <motion.path
                key={idx}
                d={`M${p.x} ${p.y - 8} L${p.x + 7} ${p.y} L${p.x} ${p.y + 8} L${p.x - 7} ${p.y} Z`}
                fill="rgba(212,98,42,0.3)"
                stroke="rgba(212,98,42,0.7)"
                strokeWidth="1"
                animate={{ scale: [1, 1.2, 1], opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: idx * 0.25, ease: 'easeInOut' }}
                style={{ transformOrigin: `${p.x}px ${p.y}px` }}
              />
            ))}
          </motion.g>
        )}

        {languageMode && (
          <motion.g initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
            <rect x="32" y="154" width="112" height="96" rx="12" fill="rgba(245,237,224,0.1)" stroke="rgba(66,47,29,0.28)" />
            <text x="46" y="174" fill="var(--text-muted)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '10px', letterSpacing: '0.08em', fontWeight: 700 }}>
              LANG PACK
            </text>
            {['HI', 'EN', 'MR', 'BN', 'TA'].map((lang, idx) => (
              <rect key={lang} x={44 + (idx % 2) * 44} y={182 + Math.floor(idx / 2) * 20} width="34" height="14" rx="7" fill="rgba(212,98,42,0.16)" />
            ))}
            {['HI', 'EN', 'MR', 'BN', 'TA'].map((lang, idx) => (
              <text
                key={`${lang}-t`}
                x={61 + (idx % 2) * 44}
                y={192 + Math.floor(idx / 2) * 20}
                textAnchor="middle"
                fill="var(--accent)"
                style={{ fontFamily: "'General Sans', sans-serif", fontSize: '9px', fontWeight: 700 }}
              >
                {lang}
              </text>
            ))}
            <path d="M144 194 C154 190 164 186 174 184" fill="none" stroke="rgba(212,98,42,0.55)" strokeWidth="1.4" strokeDasharray="5 4" />
          </motion.g>
        )}
      </svg>
    </motion.div>
  );
}

function IllustrationPulseMap({ activeChip }: { activeChip: string | null }) {
  const cols = 8;
  const rows = 5;
  const hexSize = 24;
  const hexHeight = hexSize * Math.sqrt(3);
  const hexCells = useMemo(() => getInteractiveHexData(rows, cols), [rows, cols]);
  const filledCells = useMemo(() => hexCells.filter((cell) => cell.isFilled), [hexCells]);

  const [activeHex, setActiveHex] = useState(filledCells[0]?.key ?? hexCells[0].key);
  const [pinPos, setPinPos] = useState({ x: 180, y: 180 });
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ resolved: 0, pending: filledCells.length, active: 24 });

  // Map color to category for richer display
  const categoryByColor: Record<string, typeof PILLAR_CATEGORIES[number]> = {
    '#C0392B': PILLAR_CATEGORIES[0],
    '#E67E22': PILLAR_CATEGORIES[1],
    '#27AE60': PILLAR_CATEGORIES[2],
    '#2980B9': PILLAR_CATEGORIES[3],
    '#8E44AD': PILLAR_CATEGORIES[4],
    '#D4622A': PILLAR_CATEGORIES[5],
  };

  const getHexCenter = (col: number, row: number) => {
    // Larger hexes to fill the container
    const startX = 58;
    const startY = 102;
    const spacingX = hexSize * 1.55;
    const spacingY = hexHeight * 0.9;
    const x = startX + col * spacingX;
    const y = startY + row * spacingY + (col % 2 === 1 ? spacingY * 0.5 : 0);
    return { x, y };
  };

  const hexPoints = (cx: number, cy: number, size: number) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
    }
    return points.join(' ');
  };

  // Auto-resolve animation
  useEffect(() => {
    const interval = setInterval(() => {
      const unresolvedFilled = filledCells.filter((c) => !resolvedIds.has(c.key));
      if (unresolvedFilled.length === 0) {
        // Reset
        setResolvedIds(new Set());
        setStats({ resolved: 0, pending: filledCells.length, active: 24 });
        return;
      }
      
      const toResolve = unresolvedFilled[Math.floor(Math.random() * unresolvedFilled.length)];
      const targetCenter = getHexCenter(toResolve.col, toResolve.row);
      setPinPos(targetCenter);
      setActiveHex(toResolve.key);
      
      setTimeout(() => {
        setResolvedIds((prev) => new Set([...prev, toResolve.key]));
        setStats((prev) => ({
          ...prev,
          resolved: prev.resolved + 1,
          pending: Math.max(0, prev.pending - 1),
        }));
      }, 1200);
    }, 3000);

    return () => clearInterval(interval);
  }, [filledCells, resolvedIds]);

  // Click to resolve
  const handleHexClick = (cell: typeof hexCells[0]) => {
    if (!cell.isFilled || resolvedIds.has(cell.key)) return;
    
    const targetCenter = getHexCenter(cell.col, cell.row);
    setPinPos(targetCenter);
    setActiveHex(cell.key);
    
    setTimeout(() => {
      setResolvedIds((prev) => new Set([...prev, cell.key]));
      setStats((prev) => ({
        ...prev,
        resolved: prev.resolved + 1,
        pending: Math.max(0, prev.pending - 1),
      }));
    }, 600);
  };

  const activeCell = hexCells.find((cell) => cell.key === activeHex) ?? hexCells[0];
  const activeCategory = categoryByColor[activeCell.color] ?? PILLAR_CATEGORIES[3];
  const activeZone = `Zone ${activeCell.row + 1}-${activeCell.col + 1}`;
  const privacyMode = activeChip === 'privacy';
  const forecastMode = activeChip === 'forecast';
  const weatherMode = activeChip === 'weather';
  const hexMode = activeChip === 'hex';
  const layersMode = activeChip === 'layers';

  return (
    <motion.div
      className={styles.illustrationWrapper}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5 }}
    >
      <svg width="360" height="360" viewBox="0 0 360 360" className={styles.illustrationSvg}>
        <rect x="10" y="10" width="340" height="340" rx="28" fill="var(--bg-2)" stroke="var(--border)" />

        <text
          x="36"
          y="70"
          fontFamily="'Noto Sans Devanagari', sans-serif"
          fontWeight="900"
          fontSize="58"
          fill="var(--accent)"
        >
          02
        </text>

        {/* Stats Bar */}
        <rect x="150" y="32" width="180" height="32" rx="8" fill="rgba(44,24,16,0.5)" />
        <text x="166" y="46" fill="#F5EDE0" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '11px', fontWeight: 600 }}>
          {stats.resolved}
        </text>
        <text x="166" y="57" fill="rgba(245,237,224,0.5)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '7px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Resolved
        </text>
        <line x1="206" y1="40" x2="206" y2="56" stroke="rgba(245,237,224,0.15)" />
        <text x="222" y="46" fill="#F5EDE0" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '11px', fontWeight: 600 }}>
          {stats.pending}
        </text>
        <text x="222" y="57" fill="rgba(245,237,224,0.5)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '7px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Pending
        </text>
        <line x1="262" y1="40" x2="262" y2="56" stroke="rgba(245,237,224,0.15)" />
        <circle cx="282" cy="48" r="3" fill="#3DB88A">
          <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <text x="290" y="52" fill="#3DB88A" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em' }}>
          LIVE
        </text>

        {/* Hex grid container - expanded to fill the card */}
        <rect x="28" y="72" width="304" height="230" rx="16" fill="rgba(245,237,224,0.03)" stroke="rgba(66,47,29,0.2)" />

        {hexCells.map((cell) => {
          const { x, y } = getHexCenter(cell.col, cell.row);
          const isActive = activeHex === cell.key;
          const isResolved = resolvedIds.has(cell.key);
          const category = categoryByColor[cell.color];

          return (
            <g key={cell.key}>
              <motion.polygon
                role="button"
                tabIndex={0}
                aria-label={cell.isFilled ? `Inspect ${category?.label} in Zone ${cell.row + 1}-${cell.col + 1}` : undefined}
                points={hexPoints(x, y, hexSize * 0.78)}
                fill={
                  isResolved
                    ? '#3DB88A'
                    : privacyMode && cell.isFilled && !isActive
                      ? 'rgba(92,74,57,0.4)'
                      : cell.isFilled
                        ? cell.color
                        : 'rgba(245,237,224,0.04)'
                }
                stroke={
                  isActive
                    ? 'rgba(245,237,224,0.85)'
                    : hexMode
                      ? 'rgba(212,98,42,0.5)'
                      : 'rgba(99,71,44,0.35)'
                }
                strokeWidth={isActive ? '1.8' : '1'}
                fillOpacity={cell.isFilled ? (isResolved ? 0.85 : isActive ? 1 : 0.7) : hexMode ? 0.85 : 0.6}
                onMouseEnter={() => cell.isFilled && !isResolved && setActiveHex(cell.key)}
                onFocus={() => cell.isFilled && !isResolved && setActiveHex(cell.key)}
                onClick={() => handleHexClick(cell)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleHexClick(cell);
                  }
                }}
                animate={cell.isFilled && !isResolved ? { scale: isActive ? [1, 1.08, 1] : [1, 1.03, 1] } : { scale: 1 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: (cell.row * cols + cell.col) * 0.03 }}
                style={{ transformOrigin: `${x}px ${y}px`, cursor: cell.isFilled && !isResolved ? 'pointer' : 'default' }}
              />
              
              {/* Category icon inside hex */}
              {cell.isFilled && !isResolved && category && (
                <g transform={`translate(${x - 7}, ${y - 7})`} style={{ pointerEvents: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 12 12">
                    <path d={PILLAR_CATEGORY_ICONS[category.id]} fill="rgba(255,255,255,0.9)" />
                  </svg>
                </g>
              )}
              
              {/* Resolved checkmark */}
              {isResolved && (
                <motion.path
                  d={`M${x - 6},${y} L${x - 2},${y + 5} L${x + 7},${y - 6}`}
                  fill="none"
                  stroke="white"
                  strokeWidth={2.5}
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

        {privacyMode && (
          <>
            <rect x="246" y="84" width="64" height="22" rx="9" fill="rgba(33,24,16,0.6)" stroke="rgba(245,237,224,0.2)" />
            <text x="278" y="99" textAnchor="middle" fill="rgba(245,237,224,0.75)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '10px', fontWeight: 700 }}>
              ANONYMIZED
            </text>
          </>
        )}

        {forecastMode && (
          <motion.path
            d="M74 264 C118 236 152 260 188 228 C220 202 258 214 294 188"
            fill="none"
            stroke="rgba(212,98,42,0.7)"
            strokeWidth="2"
            strokeDasharray="7 7"
            animate={{ pathLength: [0.2, 1, 0.2], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {weatherMode && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <path d="M248 110a18 18 0 0 0-34 8h-10a10 10 0 0 0 0 20h44a12 12 0 0 0 0-24z" fill="rgba(66,130,180,0.2)" stroke="rgba(66,130,180,0.55)" />
            {[0, 1, 2].map((i) => (
              <motion.line
                key={i}
                x1={218 + i * 14}
                y1="142"
                x2={214 + i * 14}
                y2="152"
                stroke="rgba(66,130,180,0.7)"
                strokeWidth="1.5"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </motion.g>
        )}

        {layersMode && (
          <motion.g initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
            <rect x="272" y="180" width="44" height="12" rx="5" fill="rgba(245,237,224,0.13)" />
            <rect x="268" y="194" width="48" height="12" rx="5" fill="rgba(212,98,42,0.2)" />
            <rect x="264" y="208" width="52" height="12" rx="5" fill="rgba(245,237,224,0.09)" />
          </motion.g>
        )}

        {/* Location pin */}
        <motion.g
          animate={{ x: pinPos.x - 160, y: pinPos.y - 150 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        >
          <g transform="translate(155, 140)">
            <path
              d="M5 0C2.24 0 0 2.24 0 5c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z"
              fill="var(--accent)"
            />
            <circle cx="5" cy="5" r="2" fill="var(--bg)" />
          </g>
        </motion.g>

        {/* Bottom info bar */}
        <rect x="34" y="306" width="292" height="36" rx="12" fill="rgba(212,98,42,0.1)" stroke="rgba(212,98,42,0.22)" />
        <circle cx="50" cy="324" r="5" fill={activeCategory.color} />
        <text x="62" y="329" fill="var(--text)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '12px', fontWeight: 600 }}>
          {activeCategory.label}
        </text>
        <text x="318" y="329" textAnchor="end" fill="var(--text-muted)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '11px' }}>
          {activeZone} · tap hexes
        </text>
      </svg>
    </motion.div>
  );
}

function IllustrationAgent({ activeChip }: { activeChip: string | null }) {
  const [activeNode, setActiveNode] = useState<'N' | 'A' | 'V' | 'V2'>('A');
  const cascadeMode = activeChip === 'cascade';
  const equityMode = activeChip === 'equity';
  const overrideMode = activeChip === 'override';
  const a2aMode = activeChip === 'a2a';
  const geminiMode = activeChip === 'gemini';

  const nodeCopy: Record<'N' | 'A' | 'V' | 'V2', { label: string; detail: string; fill: string; text: string }> = {
    N: {
      label: 'Need Intake',
      detail: 'Urgency and context parsed in about 20s.',
      fill: 'var(--accent)',
      text: 'var(--bg)'
    },
    A: {
      label: 'SEVA Agent',
      detail: 'Calculates fit across distance, skill, and reliability.',
      fill: 'var(--bg-dark)',
      text: 'var(--text-inverse)'
    },
    V: {
      label: 'Volunteer Match',
      detail: 'Top-ranked volunteer receives the assignment first.',
      fill: 'var(--jade)',
      text: 'var(--bg)'
    },
    V2: {
      label: 'Backup Match',
      detail: 'Fallback candidate activates if primary declines.',
      fill: 'rgba(61,184,138,0.7)',
      text: 'var(--bg)'
    }
  };

  const linkColor = (from: 'N' | 'A' | 'V' | 'V2', to: 'N' | 'A' | 'V' | 'V2') =>
    activeNode === from || activeNode === to || activeNode === 'A'
      ? 'rgba(212,98,42,0.7)'
      : 'rgba(92,64,38,0.38)';

  const renderNode = (
    node: 'N' | 'A' | 'V' | 'V2',
    cx: number,
    cy: number,
    radius: number,
    label: string,
    labelSize: number,
    stroke: string
  ) => {
    const isActive = node === activeNode;
    const copy = nodeCopy[node];

    return (
      <motion.g
        role="button"
        tabIndex={0}
        aria-label={`Inspect ${copy.label}`}
        onClick={() => setActiveNode(node)}
        onFocus={() => setActiveNode(node)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setActiveNode(node);
          }
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        style={{ cursor: 'pointer', transformOrigin: `${cx}px ${cy}px` }}
      >
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius + (isActive ? 7 : 0)}
          fill="rgba(212,98,42,0.12)"
          animate={{ opacity: isActive ? [0.2, 0.45, 0.2] : 0.12 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <circle cx={cx} cy={cy} r={radius} fill={copy.fill} stroke={stroke} strokeWidth={isActive ? 2.4 : 1.5} />
        <text
          x={cx}
          y={cy + labelSize / 2.8}
          textAnchor="middle"
          fontFamily="'General Sans', sans-serif"
          fontWeight="700"
          fontSize={labelSize}
          fill={copy.text}
        >
          {label}
        </text>
      </motion.g>
    );
  };

  return (
    <motion.div
      className={styles.illustrationWrapper}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5 }}
    >
      <svg width="360" height="360" viewBox="0 0 360 360" className={styles.illustrationSvg}>
        <rect x="10" y="10" width="340" height="340" rx="28" fill="var(--bg-2)" stroke="var(--border)" />

        <text
          x="36"
          y="70"
          fontFamily="'Noto Sans Devanagari', sans-serif"
          fontWeight="900"
          fontSize="58"
          fill="var(--accent)"
        >
          ०३
        </text>

        <rect x="34" y="84" width="292" height="212" rx="16" fill="rgba(245,237,224,0.03)" stroke="rgba(66,47,29,0.2)" />

        <motion.line
          x1="180" y1="146" x2="180" y2="194"
          stroke={linkColor('N', 'A')}
          strokeWidth="2.4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0 }}
        />
        <motion.line
          x1="180" y1="194" x2="128" y2="258"
          stroke={linkColor('A', 'V')}
          strokeWidth="2.4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
        <motion.line
          x1="180" y1="194" x2="232" y2="258"
          stroke={linkColor('A', 'V2')}
          strokeWidth="2.4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        />

        {renderNode('N', 180, 122, 24, 'N', 16, 'rgba(212,98,42,0.55)')}

        <motion.circle
          cx="180"
          cy="194"
          r="34"
          fill="rgba(212,98,42,0.1)"
          stroke="rgba(212,98,42,0.26)"
          strokeWidth="2"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '180px 194px' }}
        />

        {renderNode('A', 180, 194, 30, 'A', 20, 'rgba(245,237,224,0.45)')}
        {renderNode('V', 128, 258, 23, 'V', 16, 'rgba(61,184,138,0.5)')}
        {renderNode('V2', 232, 258, 23, 'V2', 13, 'rgba(61,184,138,0.45)')}

        {cascadeMode && (
          <>
            <motion.path
              d="M180 194 C162 214 148 232 128 258"
              fill="none"
              stroke="rgba(212,98,42,0.85)"
              strokeWidth="2.2"
              strokeDasharray="6 5"
              animate={{ pathLength: [0.15, 1, 0.15] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.path
              d="M180 194 C202 214 218 236 232 258"
              fill="none"
              stroke="rgba(212,98,42,0.55)"
              strokeWidth="1.8"
              strokeDasharray="6 5"
              animate={{ pathLength: [0.15, 1, 0.15] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
            />
            <circle cx="150" cy="226" r="10" fill="rgba(212,98,42,0.22)" />
            <text x="150" y="230" textAnchor="middle" fill="var(--accent)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '10px', fontWeight: 700 }}>1</text>
            <circle cx="210" cy="230" r="10" fill="rgba(212,98,42,0.14)" />
            <text x="210" y="234" textAnchor="middle" fill="rgba(212,98,42,0.8)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '10px', fontWeight: 700 }}>2</text>
          </>
        )}

        {equityMode && (
          <>
            <rect x="88" y="268" width="66" height="18" rx="9" fill="rgba(61,184,138,0.16)" />
            <text x="121" y="276" textAnchor="middle" fill="var(--jade)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '9px', fontWeight: 700 }}>WEIGHT 0.84</text>
            <rect x="206" y="268" width="66" height="18" rx="9" fill="rgba(61,184,138,0.1)" />
            <text x="239" y="276" textAnchor="middle" fill="var(--jade)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '9px', fontWeight: 700 }}>WEIGHT 0.62</text>
          </>
        )}

        {overrideMode && (
          <>
            <rect x="242" y="124" width="78" height="40" rx="11" fill="rgba(245,237,224,0.08)" stroke="rgba(66,47,29,0.28)" />
            <text x="251" y="140" fill="var(--text-muted)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '8px', letterSpacing: '0.08em', fontWeight: 700 }}>COORDINATOR</text>
            <text x="251" y="153" fill="var(--text)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '10px', fontWeight: 600 }}>OVERRIDE</text>
          </>
        )}

        {a2aMode && (
          <>
            <circle cx="294" cy="194" r="18" fill="rgba(33,24,16,0.8)" stroke="rgba(245,237,224,0.42)" />
            <text x="294" y="199" textAnchor="middle" fill="var(--text-inverse)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '12px', fontWeight: 700 }}>A2</text>
            <motion.line
              x1="210"
              y1="194"
              x2="276"
              y2="194"
              stroke="rgba(212,98,42,0.75)"
              strokeWidth="2"
              strokeDasharray="6 5"
              animate={{ strokeDashoffset: [12, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          </>
        )}

        {geminiMode && (
          <>
            {[
              { x: 132, y: 148, text: 'distance' },
              { x: 214, y: 140, text: 'skill' },
              { x: 214, y: 204, text: 'reliability' }
            ].map((token, idx) => (
              <motion.g key={token.text} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.12 }}>
                <rect x={token.x - 26} y={token.y - 10} width="52" height="20" rx="10" fill="rgba(212,98,42,0.14)" />
                <text x={token.x} y={token.y + 3} textAnchor="middle" fill="var(--accent)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '9px', fontWeight: 700 }}>
                  {token.text}
                </text>
              </motion.g>
            ))}
          </>
        )}

        <rect x="34" y="306" width="292" height="36" rx="12" fill="rgba(212,98,42,0.1)" stroke="rgba(212,98,42,0.22)" />
        <text x="50" y="323" fill="var(--text)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '12px', fontWeight: 700 }}>
          {nodeCopy[activeNode].label}
        </text>
        <text x="50" y="336" fill="var(--text-muted)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '11px' }}>
          {nodeCopy[activeNode].detail}
        </text>
      </svg>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function ThreePillars() {
  const [activeIllustration, setActiveIllustration] = useState(1);
  const [activeChipBySection, setActiveChipBySection] = useState<Record<number, string | null>>({
    1: null,
    2: null,
    3: null,
  });
  const [isMobile, setIsMobile] = useState(false);
  
  const subsection1Ref = useRef<HTMLDivElement>(null);
  const subsection2Ref = useRef<HTMLDivElement>(null);
  const subsection3Ref = useRef<HTMLDivElement>(null);
  
  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Intersection observers for scroll sync
  useEffect(() => {
    if (isMobile) return;
    
    const refs = [subsection1Ref, subsection2Ref, subsection3Ref];
    const observers: IntersectionObserver[] = [];
    
    refs.forEach((ref, i) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIllustration(i + 1);
          }
        },
        { rootMargin: '-30% 0px -30% 0px' }
      );
      
      if (ref.current) {
        observer.observe(ref.current);
      }
      observers.push(observer);
    });
    
    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [isMobile]);

  const illustrations: Record<number, JSX.Element> = {
    1: <IllustrationIntake activeChip={activeChipBySection[1]} />,
    2: <IllustrationPulseMap activeChip={activeChipBySection[2]} />,
    3: <IllustrationAgent activeChip={activeChipBySection[3]} />,
  };

  const introContent = (
    <div className={styles.sectionIntro}>
      <p className={styles.eyebrow}>HOW SEVASETU WORKS</p>
      <h2 className={styles.headline}>Three capabilities. One platform.</h2>
      <p className={styles.subtext}>
        From the moment a need is reported to the moment help arrives — SevaSetu handles every step.
      </p>
    </div>
  );

  // Mobile layout
  if (isMobile) {
    return (
      <section id="three-pillars" className={styles.threePillars}>
        <div className={styles.mobileContainer}>
          {introContent}
          {subsections.map((sub) => (
            <div key={sub.id} className={styles.mobileSubsection}>
              <motion.div
                className={styles.mobileIllustration}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-20%' }}
                transition={{ duration: 0.5 }}
              >
                {illustrations[sub.id]}
              </motion.div>
              
              <p className={styles.subsectionEyebrow}>
                <span className={styles.devanagari}>{sub.devanagari}</span>
                {sub.eyebrow}
              </p>
              <h3 className={styles.subsectionHeadline}>{sub.headline}</h3>
              <p className={styles.subsectionBody}>{sub.body}</p>
              
              <div className={styles.chips}>
                {sub.chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className={`${styles.chip} ${activeChipBySection[sub.id] === chip.icon ? styles.chipActive : ''}`}
                    aria-label={`Inspect ${chip.label}`}
                    onMouseEnter={() => setActiveIllustration(sub.id)}
                    onFocus={() => {
                      setActiveIllustration(sub.id);
                      setActiveChipBySection((prev) => ({ ...prev, [sub.id]: chip.icon }));
                    }}
                    onPointerEnter={() => setActiveChipBySection((prev) => ({ ...prev, [sub.id]: chip.icon }))}
                    onPointerLeave={() => setActiveChipBySection((prev) => ({ ...prev, [sub.id]: null }))}
                    onClick={() => setActiveChipBySection((prev) => ({ ...prev, [sub.id]: chip.icon }))}
                  >
                    {chipIcons[chip.icon]}
                    {chip.label}
                  </button>
                ))}
              </div>
              <p className={styles.interactionHint}>Capability chips steer the live preview.</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Desktop layout with sticky scroll
  return (
    <section id="three-pillars" className={styles.threePillars}>
      {introContent}
      <div className={styles.pillarsGrid}>
        {/* Left sticky panel */}
        <div className={styles.stickyPanel}>
          <div className={styles.illustrationArea}>
            <AnimatePresence mode="wait">
              {illustrations[activeIllustration]}
            </AnimatePresence>
          </div>

          <div className={styles.railNav} aria-label="Capability preview selector">
            {subsections.map((sub) => (
              <button
                key={`rail-${sub.id}`}
                type="button"
                className={`${styles.railButton} ${activeIllustration === sub.id ? styles.railButtonActive : ''}`}
                onClick={() => setActiveIllustration(sub.id)}
                aria-label={`Preview ${sub.eyebrow}`}
              >
                <span className={styles.railNumber}>{sub.devanagari}</span>
                <span className={styles.railLabel}>{sub.eyebrow}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Right scrolling panel */}
        <div className={styles.scrollPanel}>
          {subsections.map((sub, idx) => (
            <div
              key={sub.id}
              ref={idx === 0 ? subsection1Ref : idx === 1 ? subsection2Ref : subsection3Ref}
              className={styles.subsection}
            >
              <p className={styles.subsectionEyebrow}>
                <span className={styles.devanagari}>{sub.devanagari}</span>
                {sub.eyebrow}
              </p>
              <h3 className={styles.subsectionHeadline}>{sub.headline}</h3>
              <p className={styles.subsectionBody}>{sub.body}</p>
              
              <div className={styles.chips}>
                {sub.chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className={`${styles.chip} ${activeChipBySection[sub.id] === chip.icon ? styles.chipActive : ''}`}
                    aria-label={`Inspect ${chip.label}`}
                    onMouseEnter={() => setActiveIllustration(sub.id)}
                    onFocus={() => {
                      setActiveIllustration(sub.id);
                      setActiveChipBySection((prev) => ({ ...prev, [sub.id]: chip.icon }));
                    }}
                    onPointerEnter={() => setActiveChipBySection((prev) => ({ ...prev, [sub.id]: chip.icon }))}
                    onPointerLeave={() => setActiveChipBySection((prev) => ({ ...prev, [sub.id]: null }))}
                    onClick={() => setActiveChipBySection((prev) => ({ ...prev, [sub.id]: chip.icon }))}
                  >
                    {chipIcons[chip.icon]}
                    {chip.label}
                  </button>
                ))}
              </div>
              <p className={styles.interactionHint}>Capability chips steer the live preview.</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
