import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';
import styles from './PulseMapSection.module.css';

// ─────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────

interface HexCell {
  id: string;
  col: number;
  row: number;
  category: 'emergency' | 'food' | 'health' | 'water' | 'education' | 'shelter' | null;
  urgency: number;
  reportCount: number;
  status: 'active' | 'in-progress' | 'resolved' | 'empty';
  pulsePhase: number;
  placeName: string;
  cx: number;
  cy: number;
}

interface LayerState {
  activeNeeds: boolean;
  inProgress: boolean;
  resolved: boolean;
  volunteers: boolean;
  ngoCoverage: boolean;
  surgeForecasted: boolean;
  weatherRisk: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  emergency: '#C0392B',
  food: '#E67E22',
  health: '#27AE60',
  water: '#2980B9',
  education: '#8E44AD',
  shelter: '#D4622A',
};

const PLACE_NAMES = [
  'Dharavi Block 7', 'Govandi East', 'Kurla Station Road',
  'Bhiwandi Sector 3', 'Thane West', 'Malad Malvani',
  'Navi Mumbai Sector 12', 'Kalyan East', 'Ulhasnagar Ward 5',
  'Vikhroli Compound', 'Chembur Colony', 'Mankhurd Village',
  'Deonar Ward', 'Trombay East', 'Shivajinagar Pune',
  'Yerawada Block', 'Kothrud Sector 4', 'Hadapsar Ward 2',
];

const LAYERS = [
  { id: 'activeNeeds', label: 'Active Needs', icon: 'diamond', color: '#C0392B' },
  { id: 'inProgress', label: 'In Progress', icon: 'circle', color: '#D4921A' },
  { id: 'resolved', label: 'Resolved', icon: 'circle', color: '#2D9D78' },
  { id: 'volunteers', label: 'Volunteers', icon: 'person', color: '#F5EDE0' },
  { id: 'ngoCoverage', label: 'NGO Coverage', icon: 'ring', color: '#2980B9' },
  { id: 'surgeForecasted', label: 'Surge Forecast', icon: 'diamond', color: 'var(--accent)' },
  { id: 'weatherRisk', label: 'Weather Risk', icon: 'cloud', color: 'var(--text-muted)' },
] as const;

const ZOOM_LEVELS = ['India', 'State', 'District', 'Block'] as const;

// ─────────────────────────────────────────────────────────────
// HEX GEOMETRY (FLAT-TOP)
// ─────────────────────────────────────────────────────────────

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

function getHexCenter(col: number, row: number, r: number, offsetX: number, offsetY: number) {
  const x = offsetX + col * r * 1.5;
  const y = offsetY + row * r * Math.sqrt(3) + (col % 2 === 1 ? r * Math.sqrt(3) / 2 : 0);
  return { x, y };
}

// ─────────────────────────────────────────────────────────────
// LAYER CHIP ICONS
// ─────────────────────────────────────────────────────────────

const layerIcons: Record<string, (color: string) => JSX.Element> = {
  diamond: (color) => (
    <svg width="8" height="8" viewBox="0 0 8 8">
      <rect x="1.17" y="1.17" width="4" height="4" transform="rotate(45 4 4)" fill={color} />
    </svg>
  ),
  circle: (color) => (
    <svg width="8" height="8" viewBox="0 0 8 8">
      <circle cx="4" cy="4" r="3" fill={color} />
    </svg>
  ),
  person: (color) => (
    <svg width="8" height="8" viewBox="0 0 8 8" fill={color}>
      <circle cx="4" cy="2" r="1.5" />
      <path d="M2 8v-2a2 2 0 0 1 4 0v2" />
    </svg>
  ),
  ring: (color) => (
    <svg width="8" height="8" viewBox="0 0 8 8">
      <circle cx="4" cy="4" r="2.5" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  ),
  cloud: (color) => (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke={color} strokeWidth="1">
      <path d="M2 6h4a2 2 0 0 0 0-4 2 2 0 0 0-3.5 1A1.5 1.5 0 0 0 2 6z" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
// VOLUNTEER DOT COMPONENT (uses useMotionValue)
// ─────────────────────────────────────────────────────────────

function VolunteerDot({ 
  initialX, 
  initialY, 
  hexCenters 
}: { 
  initialX: number; 
  initialY: number; 
  hexCenters: { x: number; y: number }[];
}) {
  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);
  const [willChange, setWillChange] = useState(true);

  useEffect(() => {
    let mounted = true;

    const moveToNewTarget = async () => {
      if (!mounted || hexCenters.length === 0) return;

      const target = hexCenters[Math.floor(Math.random() * hexCenters.length)];
      const duration = 20 + Math.random() * 8; // 20-28s

      setWillChange(true);

      await Promise.all([
        animate(x, target.x, { duration, ease: 'linear' }),
        animate(y, target.y, { duration, ease: 'linear' }),
      ]);

      setWillChange(false);

      // Pause then move again
      await new Promise(resolve => setTimeout(resolve, 800));
      if (mounted) moveToNewTarget();
    };

    moveToNewTarget();

    return () => { mounted = false; };
  }, [hexCenters, x, y]);

  return (
    <motion.circle
      cx={0}
      cy={0}
      r={3}
      fill="rgba(245,237,224,0.85)"
      style={{ 
        x, 
        y,
        willChange: willChange ? 'transform' : 'auto',
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function PulseMapSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
  const [hoveredCell, setHoveredCell] = useState<HexCell | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState<typeof ZOOM_LEVELS[number]>('India');
  const [layersVisible, setLayersVisible] = useState<LayerState>({
    activeNeeds: true,
    inProgress: false,
    resolved: false,
    volunteers: true,
    ngoCoverage: false,
    surgeForecasted: false,
    weatherRisk: false,
  });
  const [fallingDot, setFallingDot] = useState<{ x: number; y: number; active: boolean } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Grid dimensions based on mobile
  const COLS = isMobile ? 8 : 14;
  const ROWS = isMobile ? 6 : 9;

  // Calculate hex radius from container width
  const hexRadius = useMemo(() => {
    return dimensions.width / (COLS * 1.5 + 0.5);
  }, [dimensions.width, COLS]);

  const offsetX = hexRadius;
  const offsetY = hexRadius * Math.sqrt(3) / 2;

  // Generate cells with clustered distribution
  const cells = useMemo<HexCell[]>(() => {
    const categories: HexCell['category'][] = ['emergency', 'food', 'health', 'water', 'education', 'shelter'];
    const grid: HexCell[] = [];
    const activeSet = new Set<string>();

    // Generate seed positions
    const seedCount = isMobile ? 5 : 8;
    const seeds: { col: number; row: number }[] = [];
    for (let i = 0; i < seedCount; i++) {
      seeds.push({
        col: Math.floor(Math.random() * COLS),
        row: Math.floor(Math.random() * ROWS),
      });
    }

    // Mark seeds and neighbors as active
    seeds.forEach(seed => {
      activeSet.add(`${seed.col}-${seed.row}`);
      
      // Ring 1 neighbors (60% chance)
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (dc === 0 && dr === 0) continue;
          const nc = seed.col + dc;
          const nr = seed.row + dr;
          if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && Math.random() < 0.6) {
            activeSet.add(`${nc}-${nr}`);
          }
        }
      }
      
      // Ring 2 neighbors (40% chance)
      for (let dc = -2; dc <= 2; dc++) {
        for (let dr = -2; dr <= 2; dr++) {
          if (Math.abs(dc) <= 1 && Math.abs(dr) <= 1) continue;
          const nc = seed.col + dc;
          const nr = seed.row + dr;
          if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && Math.random() < 0.4) {
            activeSet.add(`${nc}-${nr}`);
          }
        }
      }
    });

    // Create all cells
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const id = `${col}-${row}`;
        const isActive = activeSet.has(id);
        const { x: cx, y: cy } = getHexCenter(col, row, hexRadius, offsetX, offsetY);

        grid.push({
          id,
          col,
          row,
          category: isActive ? categories[Math.floor(Math.random() * categories.length)] : null,
          urgency: isActive ? 0.4 + Math.random() * 0.6 : 0,
          reportCount: isActive ? Math.floor(Math.random() * 12) + 1 : 0,
          status: isActive ? (Math.random() < 0.7 ? 'active' : Math.random() < 0.5 ? 'in-progress' : 'resolved') : 'empty',
          pulsePhase: Math.random() * Math.PI * 2,
          placeName: PLACE_NAMES[Math.floor(Math.random() * PLACE_NAMES.length)],
          cx,
          cy,
        });
      }
    }

    return grid;
  }, [COLS, ROWS, hexRadius, offsetX, offsetY, isMobile]);

  // Get hex centers for volunteer dots
  const hexCenters = useMemo(() => {
    return cells.filter(c => c.category).map(c => ({ x: c.cx, y: c.cy }));
  }, [cells]);

  // ResizeObserver for container
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', checkMobile);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Breathing animation via requestAnimationFrame (direct DOM manipulation)
  useEffect(() => {
    const breathe = (time: number) => {
      cells.forEach(cell => {
        if (!cell.category) return;
        
        const isHovered = hoveredCell?.id === cell.id;
        const baseScale = isHovered ? 1.08 : 0.92 + 0.08 * Math.sin(
          time * 0.001 * (2 * Math.PI / 2.5) + cell.pulsePhase
        );

        const el = document.getElementById(`hex-${cell.id}`);
        if (el) {
          el.setAttribute(
            'transform',
            `translate(${cell.cx},${cell.cy}) scale(${baseScale}) translate(${-cell.cx},${-cell.cy})`
          );
        }
      });

      rafRef.current = requestAnimationFrame(breathe);
    };

    rafRef.current = requestAnimationFrame(breathe);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [cells, hoveredCell]);

  // New report animation (every 5s)
  useEffect(() => {
    const interval = setInterval(() => {
      const emptyCells = cells.filter(c => !c.category);
      if (emptyCells.length === 0) return;

      const target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      setFallingDot({ x: target.cx, y: 0, active: true });

      setTimeout(() => {
        setFallingDot(null);
      }, 1200);
    }, 5000);

    return () => clearInterval(interval);
  }, [cells]);

  // Handle hover
  const handleHexHover = useCallback((cell: HexCell, _event: React.MouseEvent) => {
    if (!cell.category) return;
    setHoveredCell(cell);
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setHoverPos({
        x: cell.cx,
        y: cell.cy - hexRadius - 10,
      });
    }
  }, [hexRadius]);

  const handleHexLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  // Toggle layer visibility
  const toggleLayer = (layerId: keyof LayerState) => {
    setLayersVisible(prev => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  // Get viewBox based on zoom level
  const getViewBox = () => {
    const baseWidth = dimensions.width;
    const baseHeight = dimensions.height;
    
    switch (zoomLevel) {
      case 'State':
        return `${baseWidth * 0.25} ${baseHeight * 0.25} ${baseWidth * 0.5} ${baseHeight * 0.5}`;
      case 'District':
        return `${baseWidth * 0.33} ${baseHeight * 0.33} ${baseWidth * 0.33} ${baseHeight * 0.33}`;
      case 'Block':
        return `${baseWidth * 0.37} ${baseHeight * 0.37} ${baseWidth * 0.25} ${baseHeight * 0.25}`;
      default:
        return `0 0 ${baseWidth} ${baseHeight}`;
    }
  };

  // Volunteer dot count
  const volunteerCount = isMobile ? 3 : 6;

  return (
    <section id="pulse-map" className={styles.pulseMapSection}>
      {/* Section Header */}
      <div className={styles.header}>
        <p className={styles.eyebrow}>COMMUNITY PULSE MAP</p>
        <h2 className={styles.headline}>A living map of India's needs.</h2>
        <p className={styles.subtext}>
          Built from field reports, weather signals, and historical patterns. Updated every 47 seconds.
        </p>
      </div>

      {/* Layer Chips */}
      <div className={styles.layerChips}>
        {LAYERS.map((layer) => {
          const isActive = layersVisible[layer.id as keyof LayerState];
          return (
            <motion.button
              key={layer.id}
              className={`${styles.layerChip} ${isActive ? styles.layerChipActive : styles.layerChipInactive}`}
              onClick={() => toggleLayer(layer.id as keyof LayerState)}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              aria-label={`Toggle ${layer.label} layer`}
            >
              {layerIcons[layer.icon](layer.color)}
              <span>{layer.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Visualization Container */}
      <div 
        ref={containerRef} 
        className={styles.vizContainer}
        role="img"
        aria-label="Community Pulse Map showing real-time need distribution across Indian regions"
      >
        {/* Status Bar */}
        <div className={styles.statusBar}>
          <motion.div
            className={styles.liveDot}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, ease: 'easeInOut', repeat: Infinity }}
          />
          <span className={styles.liveText}>LIVE</span>
        </div>

        {/* SVG Visualization */}
        <motion.svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={getViewBox()}
          preserveAspectRatio="xMidYMid slice"
          animate={{ viewBox: getViewBox() }}
          transition={{ duration: 1.2, ease: [0.25, 0, 0, 1] }}
        >
          {/* Active Needs Layer */}
          <g style={{ 
            opacity: layersVisible.activeNeeds ? 1 : 0, 
            transition: 'opacity 0.3s ease' 
          }}>
            {cells.filter(c => c.status === 'active').map((cell) => (
              <polygon
                key={cell.id}
                id={`hex-${cell.id}`}
                points={hexPoints(cell.cx, cell.cy, hexRadius * 0.92)}
                fill={cell.category ? CATEGORY_COLORS[cell.category] : 'transparent'}
                fillOpacity={cell.urgency > 0 ? 0.3 + cell.urgency * 0.7 : 0}
                stroke="rgba(245,237,224,0.15)"
                strokeWidth="1"
                style={{
                  cursor: cell.category ? 'pointer' : 'default',
                  filter: hoveredCell?.id === cell.id ? `drop-shadow(0 0 14px ${CATEGORY_COLORS[cell.category!]})` : 'none',
                }}
                onMouseEnter={(e) => handleHexHover(cell, e)}
                onMouseLeave={handleHexLeave}
                role={cell.category ? 'button' : undefined}
                tabIndex={cell.category ? 0 : undefined}
                aria-label={cell.category ? `${cell.placeName}, ${cell.reportCount} active reports, ${cell.category} category` : undefined}
              />
            ))}
          </g>

          {/* In Progress Layer */}
          <g style={{ 
            opacity: layersVisible.inProgress ? 1 : 0, 
            transition: 'opacity 0.3s ease' 
          }}>
            {cells.filter(c => c.status === 'in-progress').map((cell) => (
              <polygon
                key={`inprog-${cell.id}`}
                id={`hex-${cell.id}`}
                points={hexPoints(cell.cx, cell.cy, hexRadius * 0.92)}
                fill="#D4921A"
                fillOpacity={0.5}
                stroke="rgba(245,237,224,0.15)"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* Resolved Layer */}
          <g style={{ 
            opacity: layersVisible.resolved ? 1 : 0, 
            transition: 'opacity 0.3s ease' 
          }}>
            {cells.filter(c => c.status === 'resolved').map((cell) => (
              <polygon
                key={`resolved-${cell.id}`}
                points={hexPoints(cell.cx, cell.cy, hexRadius * 0.92)}
                fill="#2D9D78"
                fillOpacity={0.4}
                stroke="rgba(245,237,224,0.15)"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* Empty hexes (always visible, very subtle) */}
          {cells.filter(c => c.status === 'empty').map((cell) => (
            <polygon
              key={`empty-${cell.id}`}
              points={hexPoints(cell.cx, cell.cy, hexRadius * 0.92)}
              fill="transparent"
              stroke="rgba(245,237,224,0.08)"
              strokeWidth="1"
            />
          ))}

          {/* Volunteer Dots */}
          {layersVisible.volunteers && hexCenters.length > 0 && (
            <g>
              {Array.from({ length: volunteerCount }, (_, i) => {
                const startCenter = hexCenters[Math.floor(Math.random() * hexCenters.length)] || { x: dimensions.width / 2, y: dimensions.height / 2 };
                return (
                  <VolunteerDot
                    key={`volunteer-${i}`}
                    initialX={startCenter.x}
                    initialY={startCenter.y}
                    hexCenters={hexCenters}
                  />
                );
              })}
            </g>
          )}

          {/* Falling Dot Animation */}
          {fallingDot && (
            <circle
              cx={fallingDot.x}
              cy={0}
              r={4}
              fill="var(--accent)"
              className={styles.fallingDot}
            />
          )}
        </motion.svg>

        {/* Hover Info Card */}
        <AnimatePresence>
          {hoveredCell && (
            <motion.div
              className={styles.hoverCard}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                left: hoverPos.x,
                top: hoverPos.y,
                transform: 'translateX(-50%)',
              }}
            >
              <p className={styles.hoverPlaceName}>{hoveredCell.placeName}</p>
              <div className={styles.hoverCategory}>
                <span 
                  className={styles.hoverDot} 
                  style={{ background: CATEGORY_COLORS[hoveredCell.category!] }} 
                />
                <span>{hoveredCell.category}</span>
              </div>
              <p className={styles.hoverMeta}>Last updated 2 min ago</p>
              <p className={styles.hoverReports}>{hoveredCell.reportCount} active reports</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zoom Selector */}
        <div className={styles.zoomSelector}>
          {(isMobile ? ['India', 'District'] as const : ZOOM_LEVELS).map((level) => (
            <button
              key={level}
              className={`${styles.zoomButton} ${zoomLevel === level ? styles.zoomButtonActive : ''}`}
              onClick={() => setZoomLevel(level)}
              aria-label={`Set map zoom to ${level}`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Bottom Overlay */}
        <div className={styles.bottomOverlay}>
          <span className={styles.statsText}>
            10M+ community members · 15 states · Updated every 47 seconds
          </span>
          <span className={styles.privacyText}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="6" width="8" height="6" rx="1" />
              <path d="M5 6V4a2 2 0 0 1 4 0v2" />
            </svg>
            Location precision fuzzed to 500m for privacy
          </span>
        </div>
      </div>
    </section>
  );
}
