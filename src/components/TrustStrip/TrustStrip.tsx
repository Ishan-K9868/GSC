import styles from './TrustStrip.module.css';

// Tech item data
interface TechItemData {
  name: string;
  icon: React.ReactNode;
}

const techItems: TechItemData[] = [
  {
    name: 'Gemini',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
        <path
          d="M11 2L13 8L11 14L9 8L11 2Z"
          fillOpacity="0.5"
        />
        <path
          d="M11 14L16.2 17L11 11L5.8 17L11 14Z"
          fillOpacity="0.5"
          transform="rotate(0 11 11)"
        />
        <path
          d="M5.8 5L11 11L5.8 17"
          fillOpacity="0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M16.2 5L11 11L16.2 17"
          fillOpacity="0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    name: 'Firebase',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
        <path d="M8 18C3 12 1 8 4 4C6 6 8 10 8 10C8 10 10 6 12 4C15 8 13 12 8 18Z" />
      </svg>
    ),
  },
  {
    name: 'Google Maps Platform',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21C12 21 5 13 5 8A7 7 0 0 1 19 8C19 13 12 21 12 21Z" />
        <circle cx="12" cy="8" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: 'Vertex AI',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="4" r="3.5" fill="currentColor" />
        <circle cx="5" cy="16" r="3" />
        <circle cx="19" cy="16" r="3" />
        <line x1="12" y1="7.5" x2="5" y2="13" />
        <line x1="12" y1="7.5" x2="19" y2="13" />
        <line x1="5" y1="16" x2="19" y2="16" />
      </svg>
    ),
  },
  {
    name: 'Gemini Live API',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
        <path d="M11 1L12.5 5L11 9L9.5 5L11 1Z" fillOpacity="0.7" />
        <path d="M2 13Q6 10 11 13Q15 16 19 13" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="1" />
        <path d="M3 16Q7 13 11 16Q15 19 18 16" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
        <path d="M4 19Q8 16 11 19Q14 22 17 19" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      </svg>
    ),
  },
  {
    name: 'Cloud Run',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 13C3 13 2 11.5 2 10C2 8 3.5 7 5.5 7C6 5 7.5 4 9.5 4C11.5 4 13 5.2 13.5 7C15.5 7 17 8.5 17 10.5C17 12.5 15.5 14 13.5 14L5 14Z" />
        <path d="M8 9.5L12 12L8 14.5Z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'BigQuery',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="9" />
        <rect x="6" y="10" width="2" height="5" fill="currentColor" stroke="none" />
        <rect x="10" y="7" width="2" height="8" fill="currentColor" stroke="none" />
        <rect x="14" y="9" width="2" height="6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

// SDG item data
interface SDGItemData {
  name: string;
  number: number;
  color: string;
  icon: React.ReactNode;
}

const sdgItems: SDGItemData[] = [
  {
    name: 'No Poverty',
    number: 1,
    color: '#E5243B',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="9" stroke="#E5243B" strokeWidth="1.5" />
        <circle cx="11" cy="7" r="2.5" fill="#E5243B" />
        <path d="M7 17C7 14 9 12 11 12C13 12 15 14 15 17" stroke="#E5243B" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Zero Hunger',
    number: 2,
    color: '#DDA63A',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="#DDA63A" aria-hidden="true">
        <line x1="11" y1="2" x2="11" y2="20" stroke="#DDA63A" strokeWidth="2" />
        <ellipse cx="8" cy="5" rx="2" ry="1.2" />
        <ellipse cx="14" cy="7" rx="2" ry="1.2" />
        <ellipse cx="8" cy="9" rx="2" ry="1.2" />
        <ellipse cx="14" cy="11" rx="2" ry="1.2" />
        <ellipse cx="8" cy="13" rx="2" ry="1.2" />
      </svg>
    ),
  },
  {
    name: 'Good Health',
    number: 3,
    color: '#4C9F38',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="9" stroke="#4C9F38" strokeWidth="1.5" />
        <path d="M11 6V16M6 11H16" stroke="#4C9F38" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Clean Water',
    number: 6,
    color: '#26BDE2',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="#26BDE2" aria-hidden="true">
        <path d="M11 2C11 2 5 10 5 14C5 17.3 7.7 20 11 20C14.3 20 17 17.3 17 14C17 10 11 2 11 2Z" />
      </svg>
    ),
  },
  {
    name: 'Sustainable Cities',
    number: 11,
    color: '#FD9D24',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="#FD9D24" aria-hidden="true">
        <rect x="3" y="10" width="4" height="10" />
        <rect x="9" y="4" width="4" height="16" />
        <rect x="15" y="7" width="4" height="13" />
      </svg>
    ),
  },
  {
    name: 'Partnerships',
    number: 17,
    color: '#19486A',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path
          d="M4 11C4 11 6 9 8 9C10 9 10 11 11 11C12 11 12 9 14 9C16 9 18 11 18 11"
          stroke="#19486A"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M4 11L7 14L11 11L15 14L18 11"
          stroke="#19486A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

// Tech Item Component
function TechItem({ name, icon }: TechItemData) {
  return (
    <div className={styles.techItem}>
      {icon}
      <span className={styles.techLabel}>{name}</span>
    </div>
  );
}

// SDG Item Component
function SDGItem({ name, number, color, icon }: SDGItemData) {
  return (
    <div className={styles.sdgItem}>
      {icon}
      <span className={styles.sdgLabel} style={{ color }}>
        SDG {number} — {name}
      </span>
    </div>
  );
}

function TrustStrip() {
  return (
    <section
      id="trust-strip"
      className={styles.trustStrip}
      aria-label="Technology partners and SDG alignment"
    >
      {/* Left label */}
      <div className={styles.leftLabel} aria-hidden="true">
        BUILT NATIVELY ON
      </div>

      {/* Gradient mask */}
      <div className={styles.gradientMask} aria-hidden="true" />

      {/* Row 1: Google tech - scrolls left */}
      <div className={styles.marqueeContainer} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          {[...techItems, ...techItems].map((item, i) => (
            <TechItem key={i} {...item} />
          ))}
        </div>
      </div>

      {/* Row 2: SDG items - scrolls right */}
      <div className={styles.marqueeContainer} aria-hidden="true">
        <div className={styles.marqueeTrackReverse}>
          {[...sdgItems, ...sdgItems].map((item, i) => (
            <SDGItem key={i} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustStrip;
