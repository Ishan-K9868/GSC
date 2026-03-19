import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { WaitlistModal } from '../shared';
import styles from './CSRPortal.module.css';

// Motion config from foundation
const springWarm = { type: 'spring', stiffness: 220, damping: 16 } as const;

interface Feature {
  icon: string;
  title: string;
  sub: string;
}

const features: Feature[] = [
  {
    icon: 'employees',
    title: 'Bulk employee onboarding',
    sub: 'Upload your roster — volunteer profiles created automatically.'
  },
  {
    icon: 'brsr',
    title: 'Automated BRSR Section C',
    sub: 'No manual data entry. Ever.'
  },
  {
    icon: 'gri',
    title: 'GRI 413 data auto-populated',
    sub: 'Investor-ready SDG impact quantification with methodology notes.'
  },
  {
    icon: 'audit',
    title: 'Cryptographically signed audit trail',
    sub: 'Every volunteer hour verified and tamper-proof.'
  },
  {
    icon: 'leaderboard',
    title: 'Live employee leaderboard',
    sub: 'Real-time volunteering hours by division, updated continuously.'
  },
  {
    icon: 'certificate',
    title: 'Individual impact certificates',
    sub: "Named PDFs auto-generated for every employee\u2019s volunteer record."
  }
];

interface SdgSegment {
  sdg: number;
  color: string;
  portion: number;
  label: string;
  focus: string;
}

const sdgSegments: SdgSegment[] = [
  { sdg: 1, color: '#E5243B', portion: 0.18, label: 'No Poverty', focus: 'Emergency cash + food drives' },
  { sdg: 3, color: '#4C9F38', portion: 0.22, label: 'Good Health', focus: 'Medical camp deployment' },
  { sdg: 4, color: '#C5192D', portion: 0.15, label: 'Quality Education', focus: 'After-school volunteer network' },
  { sdg: 6, color: '#26BDE2', portion: 0.15, label: 'Clean Water', focus: 'Water relief coordination' },
  { sdg: 11, color: '#FD9D24', portion: 0.18, label: 'Sustainable Cities', focus: 'Urban resilience squads' },
  { sdg: 17, color: '#19486A', portion: 0.12, label: 'Partnerships', focus: 'Cross-NGO joint missions' }
];

const employees = [
  { initial: 'A', name: 'Arjun M.', hours: 48, maxHours: 60, unit: 'Field Ops', impact: '14 family kits dispatched' },
  { initial: 'P', name: 'Priya K.', hours: 42, maxHours: 60, unit: 'Medical', impact: '11 clinics coordinated' },
  { initial: 'R', name: 'Rohan S.', hours: 38, maxHours: 60, unit: 'Education', impact: '9 learning circles launched' },
  { initial: 'M', name: 'Meera J.', hours: 35, maxHours: 60, unit: 'Water', impact: '7 tanker routes verified' },
  { initial: 'V', name: 'Vikram T.', hours: 28, maxHours: 60, unit: 'Logistics', impact: '5 rapid response trips' }
];

function FeatureIcon({ type }: { type: string }) {
  const iconStyle = {
    width: '18px',
    height: '18px',
    stroke: 'currentColor',
    fill: 'none',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };

  switch (type) {
    case 'employees':
      // 3 overlapping circles (heads)
      return (
        <svg viewBox="0 0 18 18" style={iconStyle} aria-hidden="true">
          <circle cx="5" cy="6" r="2.5" />
          <circle cx="9" cy="5" r="2.5" />
          <circle cx="13" cy="6" r="2.5" />
          <path d="M1 15 Q5 11 9 15" />
          <path d="M5 14 Q9 10 13 14" />
          <path d="M9 13 Q13 9 17 13" />
        </svg>
      );
    case 'brsr':
      // Document with bar chart
      return (
        <svg viewBox="0 0 18 18" style={iconStyle} aria-hidden="true">
          <rect x="3" y="2" width="12" height="14" rx="1" />
          <path d="M6 6 L6 10 M9 7 L9 10 M12 5 L12 10" />
        </svg>
      );
    case 'gri':
      // Globe with growth chart
      return (
        <svg viewBox="0 0 18 18" style={iconStyle} aria-hidden="true">
          <circle cx="9" cy="9" r="6" />
          <path d="M9 3 Q11 9 9 15" />
          <path d="M9 3 Q7 9 9 15" />
          <path d="M4 9 L14 9" />
          <path d="M13 6 L15 4 L15 6" />
        </svg>
      );
    case 'audit':
      // Shield with checkmark
      return (
        <svg viewBox="0 0 18 18" style={iconStyle} aria-hidden="true">
          <path d="M9 2 L15 4 L15 9 Q15 14 9 16 Q3 14 3 9 L3 4 L9 2 Z" />
          <path d="M6 9 L8 11 L12 7" />
        </svg>
      );
    case 'leaderboard':
      // Trophy/cup
      return (
        <svg viewBox="0 0 18 18" style={iconStyle} aria-hidden="true">
          <path d="M6 4 L6 8 Q6 11 9 11 Q12 11 12 8 L12 4" />
          <rect x="6" y="3" width="6" height="2" />
          <path d="M4 4 L4 6 Q4 7 5 7" />
          <path d="M14 4 L14 6 Q14 7 13 7" />
          <path d="M9 11 L9 14 M7 14 L11 14" />
          <rect x="6" y="14" width="6" height="1.5" rx="0.5" />
        </svg>
      );
    case 'certificate':
      // Certificate/scroll with ribbon
      return (
        <svg viewBox="0 0 18 18" style={iconStyle} aria-hidden="true">
          <rect x="3" y="3" width="12" height="10" rx="1" />
          <path d="M6 6 L12 6 M6 8 L12 8 M6 10 L10 10" />
          <path d="M11 13 L11 16 L12.5 15 L14 16 L14 13" />
        </svg>
      );
    default:
      return null;
  }
}

function DonutChart({
  isInView,
  activeSdg,
  onActivate
}: {
  isInView: boolean;
  activeSdg: number;
  onActivate: (sdg: number) => void;
}) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;
  const activeSegment = sdgSegments.find((segment) => segment.sdg === activeSdg) ?? sdgSegments[0];

  return (
    <svg width="170" height="170" viewBox="0 0 170 170" className={styles.donutChart}>
      <circle cx="85" cy="85" r={radius} fill="none" stroke="rgba(245,237,224,0.12)" strokeWidth="10" />
      {sdgSegments.map((segment, i) => {
        const segmentLength = circumference * segment.portion;
        const gap = 4;
        const dashArray = `${segmentLength - gap} ${circumference - segmentLength + gap}`;
        const dashOffset = -cumulativeOffset;
        const isActive = activeSdg === segment.sdg;

        cumulativeOffset += segmentLength;

        return (
          <motion.circle
            key={segment.sdg}
            cx="85"
            cy="85"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={isActive ? 15 : 11}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            initial={{ strokeDashoffset: dashOffset + circumference }}
            animate={
              isInView
                ? { strokeDashoffset: dashOffset }
                : { strokeDashoffset: dashOffset + circumference }
            }
            transition={{ ...springWarm, delay: i * 0.15 }}
            transform="rotate(-90 85 85)"
            opacity={isActive ? 1 : 0.78}
            onMouseEnter={() => onActivate(segment.sdg)}
            onFocus={() => onActivate(segment.sdg)}
            onClick={() => onActivate(segment.sdg)}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            aria-label={`Highlight SDG ${segment.sdg}: ${segment.label}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onActivate(segment.sdg);
              }
            }}
          />
        );
      })}

      <text
        x="85"
        y="76"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: 'General Sans, sans-serif',
          fontWeight: 600,
          fontSize: '0.62rem',
          fill: 'var(--text-muted)'
        }}
      >
        SDG {activeSegment.sdg}
      </text>
      <text
        x="85"
        y="92"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: 'General Sans, sans-serif',
          fontWeight: 700,
          fontSize: '0.95rem',
          fill: '#F5EDE0'
        }}
      >
        {Math.round(activeSegment.portion * 100)}%
      </text>
      <text
        x="85"
        y="107"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: 'General Sans, sans-serif',
          fontWeight: 500,
          fontSize: '0.58rem',
          fill: 'var(--text-subtle)'
        }}
      >
        contribution
      </text>
    </svg>
  );
}

export default function CSRPortal() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSdg, setActiveSdg] = useState(3);
  const [activeEmployee, setActiveEmployee] = useState(0);
  const [dashboardMode, setDashboardMode] = useState<'sdg' | 'team' | 'compliance'>('sdg');

  const selectedSdg = sdgSegments.find((segment) => segment.sdg === activeSdg) ?? sdgSegments[0];
  const selectedEmployee = employees[activeEmployee];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSdg((prev) => {
        const currentIndex = sdgSegments.findIndex((segment) => segment.sdg === prev);
        const nextIndex = (currentIndex + 1) % sdgSegments.length;
        return sdgSegments[nextIndex].sdg;
      });
      setActiveEmployee((prev) => (prev + 1) % employees.length);
    }, 2800);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <>
      <section id="csr-portal" className={styles.csrPortal} ref={ref}>
        {/* Section header */}
        <p className="eyebrow-jade" style={{ marginBottom: '16px' }}>
          FOR CORPORATE INDIA
        </p>

        <h2
          style={{
            fontFamily: "'Bricolage Grotesque', Georgia, serif",
            fontWeight: 800,
            fontSize: 'clamp(2.5rem, 5.5vw, 5rem)',
            lineHeight: 0.92,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            maxWidth: '14ch',
            marginBottom: '64px'
          }}
        >
          <span style={{ display: 'block' }}>India's BRSR report</span>
          <span style={{ display: 'block' }}>used to take months.</span>
          <span style={{ display: 'block', color: 'var(--accent)' }}>Now it's one click.</span>
        </h2>

        {/* Main grid */}
        <div className={styles.csrGrid}>
          {/* Left column - Feature list */}
          <motion.div
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0 }
                }}
                transition={springWarm}
                className={styles.featureRow}
              >
                <div className={styles.iconBox}>
                  <FeatureIcon type={feature.icon} />
                </div>
                <div>
                  <span className={styles.featureTitle}>{feature.title}</span>
                  <span className={styles.featureSub}>{feature.sub}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Right column - CSR Portal Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ ...springWarm, delay: 0.2 }}
            className={styles.mockupWrapper}
          >
            <div className={styles.browserFrame}>
              {/* Chrome bar */}
              <div className={styles.chromeBar}>
                <div
                  style={{
                    display: 'flex',
                    gap: '5px',
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  <div
                    style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#E05353' }}
                    aria-hidden="true"
                  />
                  <div
                    style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#D4921A' }}
                    aria-hidden="true"
                  />
                  <div
                    style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#50C078' }}
                    aria-hidden="true"
                  />
                </div>
                <span className={styles.urlLabel}>csr.sevasetu.app</span>
              </div>

              {/* Screen area */}
              <div className={styles.screenArea}>
                {/* Header bar */}
                <div className={styles.screenHeader}>
                  <span
                    style={{
                      fontFamily: 'General Sans, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      color: 'rgba(245, 237, 224, 0.9)'
                    }}
                  >
                    CSR Impact Dashboard — Q4 2026
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.65rem',
                      color: 'var(--jade)'
                    }}
                  >
                    <div
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--jade)'
                      }}
                      aria-hidden="true"
                    />
                    Live
                  </span>
                </div>

                <div className={styles.modeBar}>
                  {[
                    { id: 'sdg', label: 'SDG Lens' },
                    { id: 'team', label: 'Team Lens' },
                    { id: 'compliance', label: 'Audit Lens' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={`${styles.modeButton} ${dashboardMode === mode.id ? styles.modeButtonActive : ''}`}
                      onClick={() => setDashboardMode(mode.id as 'sdg' | 'team' | 'compliance')}
                      aria-label={`Switch dashboard to ${mode.label}`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                <p className={styles.interactionGuide}>Hover SDG arcs and employee rows to inspect live impact.</p>

                {/* Content grid - donut + leaderboard */}
                <div className={styles.dashboardContent}>
                  {/* Donut chart */}
                  <div className={styles.donutContainer}>
                    <DonutChart
                      isInView={isInView}
                      activeSdg={activeSdg}
                      onActivate={(sdg) => setActiveSdg(sdg)}
                    />

                    <motion.div
                      key={selectedSdg.sdg}
                      className={styles.sdgDetailCard}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...springWarm, delay: 0.05 }}
                    >
                      <span className={styles.sdgDetailEyebrow}>SDG {selectedSdg.sdg} FOCUS</span>
                      <span className={styles.sdgDetailTitle}>{selectedSdg.label}</span>
                      <span className={styles.sdgDetailSub}>{selectedSdg.focus}</span>
                      <span className={styles.sdgDetailMetric}>
                        {dashboardMode === 'sdg' && '1,248 verified service-hours in this stream'}
                        {dashboardMode === 'team' && '4 NGO partners currently mapped to this stream'}
                        {dashboardMode === 'compliance' && 'BRSR + GRI fields auto-linked for this stream'}
                      </span>
                    </motion.div>
                  </div>

                  {/* Employee leaderboard */}
                  <div className={styles.leaderboard}>
                    {employees.map((employee, i) => (
                      <div
                        key={i}
                        className={styles.employeeRow}
                        style={{
                          background: i === activeEmployee
                            ? 'rgba(212, 98, 42, 0.15)'
                            : i % 2 === 0
                              ? 'var(--bg-dark)'
                              : 'var(--bg-dark-2)'
                        }}
                        onMouseEnter={() => setActiveEmployee(i)}
                        onFocus={() => setActiveEmployee(i)}
                        onClick={() => setActiveEmployee(i)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Inspect ${employee.name} impact details`}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setActiveEmployee(i);
                          }
                        }}
                      >
                        <div className={styles.employeeInitial}>{employee.initial}</div>
                        <span className={styles.employeeName}>{employee.name}</span>
                        <div className={styles.hoursBarContainer}>
                          <div
                            className={styles.hoursBar}
                            style={{ width: `${(employee.hours / employee.maxHours) * 100}%` }}
                          />
                        </div>
                        <span className={styles.hoursValue}>{employee.hours}h</span>
                      </div>
                    ))}

                    <motion.div
                      key={selectedEmployee.name}
                      className={styles.employeeDetailCard}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={springWarm}
                    >
                      <span className={styles.employeeDetailName}>{selectedEmployee.name} · {selectedEmployee.unit}</span>
                      <span className={styles.employeeDetailImpact}>{selectedEmployee.impact}</span>
                      <div className={styles.employeeSparkTrack}>
                        <motion.div
                          className={styles.employeeSparkFill}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round((selectedEmployee.hours / selectedEmployee.maxHours) * 100)}%` }}
                          transition={springWarm}
                        />
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Export button (decorative) */}
                <div className={styles.exportButton}>Export BRSR Report</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Trust bar */}
        <div style={{ marginTop: '80px' }}>
          <div className="divider" style={{ marginBottom: '40px' }} />
          <p
            style={{
              fontFamily: 'General Sans, sans-serif',
              fontSize: '0.95rem',
              color: 'var(--text-muted)',
              maxWidth: '60ch',
              margin: '0 auto',
              textAlign: 'center',
              lineHeight: 1.6
            }}
          >
            18,000+ companies are required to file BRSR. SevaSetu makes compliance a byproduct of doing good.
          </p>

          {/* CTA button */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
              aria-label="Book a CSR demo with SevaSetu"
            >
              Book a CSR Demo
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ marginLeft: '8px' }}
              >
                <path d="M6 3 L11 8 L6 13" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <WaitlistModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
