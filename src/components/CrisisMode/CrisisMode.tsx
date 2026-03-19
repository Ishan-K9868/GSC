import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import styles from './CrisisMode.module.css';

// CRITICAL: All entrance animations use easeCrisis (hard cuts, no springs)
const easeCrisis = { duration: 0.1, ease: 'linear' as const };

interface TerminalLineData {
  timestamp: string;
  text: string;
  highlight: 'amber' | null;
  bold?: boolean;
  accentNumbers?: string[];
  accentWords?: Array<{ word: string; color: string }>;
}

const terminalLines: TerminalLineData[] = [
  {
    timestamp: '[T+0:00]',
    text: '5 emergency reports cluster in Sector 12, Pune',
    highlight: null
  },
  {
    timestamp: '[T+0:03]',
    text: 'THRESHOLD TRIGGERED — Crisis Mode activated',
    highlight: 'amber',
    bold: true
  },
  {
    timestamp: '[T+0:05]',
    text: 'ALL {847} volunteers within 25km radius notified',
    highlight: null,
    accentNumbers: ['847']
  },
  {
    timestamp: '[T+0:08]',
    text: '{3} nearest NGOs: resource sharing request sent',
    highlight: null,
    accentNumbers: ['3']
  },
  {
    timestamp: '[T+0:12]',
    text: 'District Collector alert — auto-drafted by Gemini',
    highlight: null
  },
  {
    timestamp: '[T+0:14]',
    text: 'Crisis Dashboard: {ACTIVE}',
    highlight: null,
    accentWords: [{ word: 'ACTIVE', color: 'var(--jade)' }]
  }
];

const crisisChips = [
  {
    title: 'Volunteer surge queue',
    sub: 'Real-time ETAs and skill breakdowns for every responder',
    icon: 'volunteers'
  },
  {
    title: 'Live resource inventory',
    sub: 'Kits deployed, remaining supply, replenishment ETA',
    icon: 'resources'
  },
  {
    title: 'Auto-generated media bulletin',
    sub: 'Gemini-drafted social bulletin ready for coordinator review',
    icon: 'media'
  },
  {
    title: '48-hour after-action report',
    sub: 'Auto-generated for donors immediately post-crisis',
    icon: 'report'
  }
];

function TerminalLine({ line }: { line: TerminalLineData }) {
  // Parse text for accent numbers and words
  let content = line.text;

  // Handle amber highlight (entire line)
  if (line.highlight === 'amber') {
    return (
      <div className={styles.terminalLine}>
        <span className={styles.timestamp}>{line.timestamp}</span>
        <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{content}</span>
      </div>
    );
  }

  // Handle accent numbers (e.g., 847, 3)
  if (line.accentNumbers && line.accentNumbers.length > 0) {
    const parts: JSX.Element[] = [];
    let remaining = content;
    let key = 0;

    line.accentNumbers.forEach((num) => {
      const pattern = `{${num}}`;
      const index = remaining.indexOf(pattern);
      if (index !== -1) {
        // Add text before number
        if (index > 0) {
          parts.push(
            <span key={key++} style={{ color: 'var(--text-muted)' }}>
              {remaining.slice(0, index)}
            </span>
          );
        }
        // Add highlighted number
        parts.push(
          <span key={key++} style={{ color: 'var(--accent)', fontWeight: 700 }}>
            {num}
          </span>
        );
        remaining = remaining.slice(index + pattern.length);
      }
    });

    // Add remaining text
    if (remaining) {
      parts.push(
        <span key={key++} style={{ color: 'var(--text-muted)' }}>
          {remaining}
        </span>
      );
    }

    return (
      <div className={styles.terminalLine}>
        <span className={styles.timestamp}>{line.timestamp}</span>
        {parts}
      </div>
    );
  }

  // Handle accent words (e.g., ACTIVE with jade color + blinking dot)
  if (line.accentWords && line.accentWords.length > 0) {
    const parts: JSX.Element[] = [];
    let remaining = content;
    let key = 0;

    line.accentWords.forEach((accent) => {
      const pattern = `{${accent.word}}`;
      const index = remaining.indexOf(pattern);
      if (index !== -1) {
        // Add text before word
        if (index > 0) {
          parts.push(
            <span key={key++} style={{ color: 'var(--text-muted)' }}>
              {remaining.slice(0, index)}
            </span>
          );
        }
        // Add blinking jade dot
        parts.push(
          <motion.span
            key={key++}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, ease: 'easeInOut', repeat: Infinity }}
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--jade)',
              marginRight: '6px',
              marginLeft: '4px',
              verticalAlign: 'middle'
            }}
            aria-hidden="true"
          />
        );
        // Add highlighted word
        parts.push(
          <span key={key++} style={{ color: accent.color, fontWeight: 600 }}>
            {accent.word}
          </span>
        );
        remaining = remaining.slice(index + pattern.length);
      }
    });

    // Add remaining text
    if (remaining) {
      parts.push(
        <span key={key++} style={{ color: 'var(--text-muted)' }}>
          {remaining}
        </span>
      );
    }

    return (
      <div className={styles.terminalLine}>
        <span className={styles.timestamp}>{line.timestamp}</span>
        {parts}
      </div>
    );
  }

  // Default: plain text
  return (
    <div className={styles.terminalLine}>
      <span className={styles.timestamp}>{line.timestamp}</span>
      <span style={{ color: 'var(--text-muted)' }}>{content}</span>
    </div>
  );
}

function CrisisIcon({ type }: { type: string }) {
  const iconStyle = {
    width: '20px',
    height: '20px',
    stroke: 'currentColor',
    fill: 'none',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };

  switch (type) {
    case 'volunteers':
      // 3 person silhouettes with arrow
      return (
        <svg viewBox="0 0 20 20" style={iconStyle} aria-hidden="true">
          {/* Person 1 */}
          <circle cx="3" cy="4" r="1.5" />
          <rect x="1.5" y="6" width="3" height="5" rx="0.5" />
          {/* Person 2 */}
          <circle cx="8" cy="5" r="1.5" />
          <rect x="6.5" y="7" width="3" height="4" rx="0.5" />
          {/* Person 3 */}
          <circle cx="13" cy="6" r="1.5" />
          <rect x="11.5" y="8" width="3" height="3" rx="0.5" />
          {/* Arrow */}
          <path d="M15 10 L18 10 M16 8 L18 10 L16 12" />
        </svg>
      );
    case 'resources':
      // 3 stacked boxes
      return (
        <svg viewBox="0 0 20 20" style={iconStyle} aria-hidden="true">
          <rect x="4" y="3" width="12" height="4" rx="1" />
          <rect x="5" y="8" width="10" height="4" rx="1" />
          <rect x="6" y="13" width="8" height="4" rx="1" />
        </svg>
      );
    case 'media':
      // Megaphone with sound waves
      return (
        <svg viewBox="0 0 20 20" style={iconStyle} aria-hidden="true">
          {/* Megaphone cone */}
          <path d="M2 8 L2 12 L8 14 L8 6 L2 8 Z" />
          <path d="M8 6 L12 4 L12 16 L8 14" />
          {/* Sound waves */}
          <path d="M14 7 Q15 10 14 13" />
          <path d="M16 5 Q18 10 16 15" />
        </svg>
      );
    case 'report':
      // Document with clock overlay
      return (
        <svg viewBox="0 0 20 20" style={iconStyle} aria-hidden="true">
          {/* Document */}
          <path d="M4 2 L12 2 L16 6 L16 18 L4 18 Z" />
          <path d="M12 2 L12 6 L16 6" />
          {/* Clock */}
          <circle cx="13" cy="14" r="3" fill="var(--bg-dark)" />
          <path d="M13 12 L13 14 L14.5 14" />
        </svg>
      );
    default:
      return null;
  }
}

export default function CrisisMode() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section id="crisis-mode" className={styles.crisisMode} ref={ref}>
      {/* Radial glow overlay */}
      <div className={styles.radialGlow} aria-hidden="true" />

      {/* Content */}
      <div className={styles.content}>
        {/* Eyebrow with pulsing diamond */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 10 10" width="10" height="10" fill="var(--amber)">
              <path d="M5,0 L10,5 L5,10 L0,5 Z" />
            </svg>
          </motion.div>

          <span
            style={{
              fontFamily: 'General Sans, sans-serif',
              fontWeight: 700,
              fontSize: '0.7rem',
              color: 'var(--amber)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase'
            }}
          >
            CRISIS MODE
          </span>
        </div>

        {/* Headline */}
        <motion.h2
          initial={{ x: -20, opacity: 0 }}
          animate={isInView ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
          transition={easeCrisis}
          style={{
            fontFamily: "'Bricolage Grotesque', Georgia, serif",
            fontWeight: 800,
            fontSize: 'clamp(2.5rem, 5.5vw, 5rem)',
            lineHeight: 0.92,
            letterSpacing: '-0.03em',
            color: '#F5EDE0',
            maxWidth: '18ch'
          }}
        >
          When 5 reports in 5km hit in 2 hours — everything changes.
        </motion.h2>

        {/* Body text */}
        <motion.p
          initial={{ x: -20, opacity: 0 }}
          animate={isInView ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
          transition={{ ...easeCrisis, delay: 0.2 }}
          style={{
            fontFamily: 'General Sans, sans-serif',
            fontSize: '1rem',
            color: 'var(--text-muted)',
            maxWidth: '52ch',
            marginTop: '24px',
            lineHeight: 1.75
          }}
        >
          SevaSetu automatically escalates to Crisis Mode. Matching parameters shift. Every available
          volunteer within 25km is notified. The District Collector receives an auto-drafted alert.
        </motion.p>

        {/* Terminal */}
        <div className={styles.terminal}>
          {/* Terminal header dots */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#E05353'
              }}
              aria-hidden="true"
            />
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#D4921A'
              }}
              aria-hidden="true"
            />
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#50C078'
              }}
              aria-hidden="true"
            />
          </div>

          {/* Terminal lines */}
          {terminalLines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
              transition={{ duration: 0.08, ease: 'linear', delay: i * 0.8 }}
            >
              <TerminalLine line={line} />
            </motion.div>
          ))}

          {/* Blinking cursor */}
          {isInView && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 6 * 0.8 + 0.1 }}
              style={{ display: 'inline-block' }}
            >
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ color: 'var(--jade)' }}
              >
                _
              </motion.span>
            </motion.span>
          )}
        </div>

        {/* Crisis chips */}
        <div className={styles.crisisChips}>
          {crisisChips.map((chip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.1, ease: 'linear', delay: 0.4 + i * 0.2 }}
              className={styles.crisisChip}
            >
              <div className={styles.iconContainer}>
                <CrisisIcon type={chip.icon} />
              </div>
              <div>
                <div className={styles.chipTitle}>{chip.title}</div>
                <div className={styles.chipSub}>{chip.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom statement */}
        <motion.p
          initial={{ x: -20, opacity: 0 }}
          animate={isInView ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
          transition={{ ...easeCrisis, delay: 1.2 }}
          style={{
            fontFamily: "'Bricolage Grotesque', Georgia, serif",
            fontWeight: 700,
            fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
            color: '#F5EDE0',
            marginTop: '48px'
          }}
        >
          From coordination platform to command center — in under 15 seconds.
        </motion.p>
      </div>
    </section>
  );
}
