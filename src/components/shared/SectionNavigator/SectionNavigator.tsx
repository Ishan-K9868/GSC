import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import styles from './SectionNavigator.module.css';

// Motion config from foundation
const springSnap = { type: 'spring', stiffness: 400, damping: 30 } as const;

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

// Custom SVG icons for each section
const sections: Section[] = [
  {
    id: 'hero',
    label: 'Hero',
    color: 'var(--accent)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 1L1 6v7h4V9h4v4h4V6L7 1z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'trust-strip',
    label: 'Trust',
    color: 'var(--jade)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 1L2 3v4c0 3.5 2.1 5.7 5 6.5 2.9-.8 5-3 5-6.5V3L7 1zm-1 8L4 7l1-1 1 1 3-3 1 1-4 4z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'problem',
    label: 'The Problem',
    color: '#D4921A',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'three-pillars',
    label: 'Three Pillars',
    color: 'var(--accent)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <rect x="1" y="5" width="3" height="8" rx="0.5" fill="currentColor" />
        <rect x="5.5" y="2" width="3" height="11" rx="0.5" fill="currentColor" />
        <rect x="10" y="4" width="3" height="9" rx="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'intake-demo',
    label: 'Intake Engine',
    color: 'var(--jade)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <rect x="2" y="1" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M4 4h6M4 7h4M4 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'pulse-map',
    label: 'Pulse Map',
    color: '#E85A4F',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M7 1C4.2 1 2 3.5 2 6c0 3.5 5 7 5 7s5-3.5 5-7c0-2.5-2.2-5-5-5z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    id: 'matching-engine',
    label: 'Matching Engine',
    color: 'var(--jade)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="4" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M6 6l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'impact',
    label: 'Impact',
    color: 'var(--accent)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M1 12h2V6H1v6zM5 12h2V4H5v8zM9 12h2V2H9v10zM13 12V8h-2v4h2z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'personas',
    label: 'Who It Serves',
    color: '#8B5CF6',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="5" cy="4" r="2" fill="currentColor" />
        <circle cx="10" cy="4" r="1.5" fill="currentColor" opacity="0.6" />
        <path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 10c0-1.3.9-2.5 2-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'crisis',
    label: 'Crisis Mode',
    color: '#EF4444',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 1L1 13h12L7 1z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
        <path d="M7 5v3M7 10v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'csr',
    label: 'CSR Portal',
    color: '#0EA5E9',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M2 6h10M5 3V1M9 3V1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'tech',
    label: 'Technology',
    color: '#6366F1',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M5 2L2 7l3 5M9 2l3 5-3 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'testimonials',
    label: 'Testimonials',
    color: 'var(--jade)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M2 3c0-.6.4-1 1-1h8c.6 0 1 .4 1 1v6c0 .6-.4 1-1 1H6l-3 2v-2H3c-.6 0-1-.4-1-1V3z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M4 5h6M4 7h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'final-cta',
    label: 'Get Started',
    color: 'var(--accent)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 12V2M7 2l-4 4M7 2l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'footer',
    label: 'Footer',
    color: 'var(--text-muted)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <rect x="1" y="2" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M1 8h12" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 10h2M8 10h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

function SectionNavigator() {
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  // IntersectionObserver to detect active section
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        {
          rootMargin: '-40% 0px -40% 0px',
          threshold: 0,
        }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  const handleClick = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick(id);
      }
    },
    [handleClick]
  );

  return (
    <nav className={styles.navigator} aria-label="Page sections">
      <ul className={styles.list}>
        {sections.map(({ id, label, icon, color }) => {
          const isActive = activeSection === id;
          const isHovered = hoveredSection === id;

          return (
            <li key={id} className={styles.item}>
              <div className={styles.dotWrapper}>
                {/* Hover label */}
                <motion.span
                  className={styles.label}
                  initial={false}
                  animate={{
                    opacity: isHovered ? 1 : 0,
                    x: isHovered ? 0 : -4,
                  }}
                  transition={{ duration: 0.2 }}
                  aria-hidden="true"
                >
                  {label}
                </motion.span>

                {/* Dot button */}
                <motion.button
                  type="button"
                  className={styles.dot}
                  onClick={() => handleClick(id)}
                  onKeyDown={(e) => handleKeyDown(e, id)}
                  onMouseEnter={() => setHoveredSection(id)}
                  onMouseLeave={() => setHoveredSection(null)}
                  onFocus={() => setHoveredSection(id)}
                  onBlur={() => setHoveredSection(null)}
                  aria-label={`Navigate to ${label}`}
                  aria-current={isActive ? 'true' : undefined}
                  initial={false}
                  animate={{
                    scale: isActive ? 1 : 0.6,
                    opacity: isActive ? 1 : 0.4,
                  }}
                  whileHover={{ scale: isActive ? 1.1 : 0.8, opacity: 1 }}
                  transition={springSnap}
                  style={{
                    color: isActive ? color : 'rgba(128,128,128,0.3)',
                    backgroundColor: isActive ? color : 'rgba(128,128,128,0.3)',
                  }}
                >
                  <span
                    className={styles.iconWrapper}
                    style={{ color: isActive ? 'var(--bg)' : 'transparent' }}
                  >
                    {icon}
                  </span>
                </motion.button>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default SectionNavigator;
