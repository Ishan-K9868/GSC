import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import styles from './IntakeEngineDemo.module.css';

// ─────────────────────────────────────────────────────────────
// TYPES & DATA
// ─────────────────────────────────────────────────────────────

type TabId = 'voice' | 'photo' | 'whatsapp' | 'webform';

const tabs: { id: TabId; label: string }[] = [
  { id: 'voice', label: 'VOICE' },
  { id: 'photo', label: 'PHOTO' },
  { id: 'whatsapp', label: 'WHATSAPP' },
  { id: 'webform', label: 'WEB FORM' },
];

const features = [
  {
    icon: 'check-circle',
    text: 'Gemini Live API processes audio natively — no intermediate speech-to-text. Tone and emotional urgency are preserved.',
  },
  {
    icon: 'globe-speech',
    text: '8 languages supported: Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Odia.',
  },
  {
    icon: 'timer',
    text: '20-second end-to-end flow. Zero typing required for field workers.',
  },
  {
    icon: 'wifi-off',
    text: 'Fully offline — reports queue locally, sync automatically when connectivity returns.',
  },
  {
    icon: 'message',
    text: 'WhatsApp intake requires no app installation. Works on any phone in India.',
  },
];

// ─────────────────────────────────────────────────────────────
// FEATURE ICONS (18×18px, stroke-based)
// ─────────────────────────────────────────────────────────────

const featureIcons: Record<string, JSX.Element> = {
  'check-circle': (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="7" />
      <path d="M6 9l2 2 4-4" />
    </svg>
  ),
  'globe-speech': (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12" />
      <path d="M8 2c-1.5 1.5-2 4-2 6s.5 4.5 2 6" />
      <path d="M8 2c1.5 1.5 2 4 2 6s-.5 4.5-2 6" />
      <path d="M13 13l2 2-2 2" />
    </svg>
  ),
  timer: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="10" r="6" />
      <path d="M9 6v4l2 2" />
      <path d="M7 2h4" />
      <path d="M9 2v2" />
    </svg>
  ),
  'wifi-off': (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8a9 9 0 0 1 12 0" />
      <path d="M5.5 11a5.5 5.5 0 0 1 7 0" />
      <circle cx="9" cy="14" r="1" fill="currentColor" />
      <line x1="2" y1="2" x2="16" y2="16" />
    </svg>
  ),
  message: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5l-4 2v-12a2 2 0 0 1 2-2z" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
// VOICE SCREEN (Ghost Animation)
// ─────────────────────────────────────────────────────────────

function VoiceScreen() {
  const [step, setStep] = useState(1);
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(20).fill(30));
  const waveIntervalRef = useRef<number | null>(null);
  const mainIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Main animation loop - 6.5s cycle
    const runAnimation = () => {
      // Step 1: Idle (0 - 0.5s)
      setStep(1);
      
      setTimeout(() => {
        // Step 2: Recording (0.5s - 2.5s)
        setStep(2);
      }, 500);

      setTimeout(() => {
        // Step 3: Processing (2.5s - 3.5s)
        setStep(3);
      }, 2500);

      setTimeout(() => {
        // Step 4: Confirmation (3.5s - 5.5s)
        setStep(4);
      }, 3500);

      setTimeout(() => {
        // Step 5: Submission (5.5s - 6s)
        setStep(5);
      }, 5500);
    };

    runAnimation();
    mainIntervalRef.current = window.setInterval(runAnimation, 6500);

    return () => {
      if (mainIntervalRef.current) clearInterval(mainIntervalRef.current);
    };
  }, []);

  // Waveform animation for step 2
  useEffect(() => {
    if (step === 2) {
      waveIntervalRef.current = window.setInterval(() => {
        setWaveHeights(Array(20).fill(0).map(() => Math.random() * 60 + 20));
      }, 100);
    } else {
      if (waveIntervalRef.current) {
        clearInterval(waveIntervalRef.current);
        waveIntervalRef.current = null;
      }
    }

    return () => {
      if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
    };
  }, [step]);

  return (
    <div className={styles.voiceScreen}>
      {/* Status bar for recording */}
      {step === 2 && (
        <div className={styles.statusBar}>
          <motion.div
            className={styles.recordingDot}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className={styles.recordingText}>Recording...</span>
        </div>
      )}

      {step === 2 && (
        <motion.div
          className={styles.liveTranscript}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          Listening in Hindi... "Medical help needed for 15 people"
        </motion.div>
      )}

      {/* Center area */}
      <div className={styles.voiceCenter}>
        {/* Steps 1-3: Mic button and rings */}
        {(step === 1 || step === 2 || step === 3) && (
          <>
            {/* Concentric rings for step 2 */}
            {step === 2 && (
              <div className={styles.ringsContainer}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className={styles.ring}
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Mic button */}
            <motion.button
              type="button"
              className={styles.micButton}
              animate={step === 2 ? { scale: [1.05, 1.08, 1.05] } : {}}
              transition={step === 2 ? { duration: 0.6, repeat: Infinity } : {}}
              aria-label="Hold to record a voice report"
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="10" height="16" rx="5" />
                <path d="M5 12v2a9 9 0 0 0 18 0v-2" />
                <line x1="14" y1="24" x2="14" y2="28" />
                <line x1="9" y1="28" x2="19" y2="28" />
              </svg>
            </motion.button>

            {step === 1 && (
              <p className={styles.micLabel}>Hold to Report</p>
            )}

            {/* Spinner for step 3 */}
            {step === 3 && (
              <div className={styles.processingArea}>
                <motion.svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  className={styles.spinner}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                >
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    fill="none"
                    stroke="var(--jade)"
                    strokeWidth="2.5"
                    strokeDasharray="60 20"
                    strokeLinecap="round"
                  />
                </motion.svg>
                <p className={styles.processingLabel}>Gemini processing…</p>
              </div>
            )}
          </>
        )}

        {/* Step 4: Confirmation Card */}
        {step === 4 && (
          <motion.div
            className={styles.confirmationCard}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          >
            <motion.svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className={styles.checkCircle}
            >
              <motion.circle
                cx="12"
                cy="12"
                r="10"
                stroke="var(--jade)"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3 }}
              />
              <motion.path
                d="M8 12l3 3 5-5"
                stroke="var(--jade)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              />
            </motion.svg>
            <p className={styles.confirmationText}>
              क्या आपने 15 लोगों के लिए medical help की ज़रूरत report की?
            </p>
            <div className={styles.confirmButtons}>
              <button type="button" className={styles.yesButton} aria-label="Confirm the reported need as yes">हाँ</button>
              <button type="button" className={styles.noButton} aria-label="Reject the reported need as no">नहीं</button>
            </div>
          </motion.div>
        )}

        {/* Step 5: Toast */}
        {step === 5 && (
          <motion.div
            className={styles.toast}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            Submitted — Report #4721
          </motion.div>
        )}
      </div>

      {/* Waveform for step 2 */}
      {step === 2 && (
        <div className={styles.waveform}>
          {waveHeights.map((height, i) => (
            <div
              key={i}
              className={styles.waveBar}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      )}

      <div className={styles.voiceTimeline} aria-hidden="true">
        {['Hold', 'Record', 'Process', 'Confirm', 'Send'].map((label, idx) => (
          <div
            key={label}
            className={`${styles.timelineDot} ${step === idx + 1 ? styles.timelineDotActive : ''}`}
            title={label}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PHOTO SCREEN
// ─────────────────────────────────────────────────────────────

function PhotoScreen() {
  const [phase, setPhase] = useState<'viewfinder' | 'flash' | 'captured' | 'scanning' | 'result'>('viewfinder');
  const [scanY, setScanY] = useState(0);
  const scanRafRef = useRef<number | null>(null);

  useEffect(() => {
    // Phase 1: Viewfinder (1.2s)
    const flashTimer = setTimeout(() => setPhase('flash'), 1200);
    
    // Phase 2: Flash (0.25s)
    const capturedTimer = setTimeout(() => setPhase('captured'), 1450);
    
    // Phase 3: Start scanning
    const scanTimer = setTimeout(() => setPhase('scanning'), 1600);
    
    // Phase 4: Result
    const resultTimer = setTimeout(() => setPhase('result'), 3100);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(capturedTimer);
      clearTimeout(scanTimer);
      clearTimeout(resultTimer);
    };
  }, []);

  // Scan line animation
  useEffect(() => {
    if (phase === 'scanning') {
      const startTime = Date.now();
      const duration = 1500;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setScanY(progress * 100);
        
        if (progress < 1) {
          scanRafRef.current = requestAnimationFrame(animate);
        }
      };
      
      scanRafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (scanRafRef.current) {
        cancelAnimationFrame(scanRafRef.current);
        scanRafRef.current = null;
      }
    };
  }, [phase]);

  return (
    <div className={styles.photoScreen}>
      {/* Viewfinder brackets */}
      {(phase === 'viewfinder' || phase === 'flash') && (
        <>
          <div className={`${styles.bracket} ${styles.bracketTL}`} />
          <div className={`${styles.bracket} ${styles.bracketTR}`} />
          <div className={`${styles.bracket} ${styles.bracketBL}`} />
          <div className={`${styles.bracket} ${styles.bracketBR}`} />
        </>
      )}

      {/* Flash overlay */}
      {phase === 'flash' && (
        <motion.div
          className={styles.flashOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.25 }}
        />
      )}

      {/* Captured photo background */}
      {(phase === 'captured' || phase === 'scanning' || phase === 'result') && (
        <div className={styles.capturedBg}>
          {/* Silhouettes */}
          <svg width="120" height="80" viewBox="0 0 120 80" className={styles.silhouettes}>
            <ellipse cx="40" cy="70" rx="25" ry="8" fill="rgba(0,0,0,0.3)" />
            <ellipse cx="60" cy="70" rx="25" ry="8" fill="rgba(0,0,0,0.3)" />
            <ellipse cx="80" cy="70" rx="25" ry="8" fill="rgba(0,0,0,0.3)" />
            <circle cx="40" cy="25" r="12" fill="rgba(245,237,224,0.4)" />
            <rect x="28" y="37" width="24" height="33" rx="4" fill="rgba(245,237,224,0.4)" />
            <circle cx="60" cy="20" r="12" fill="rgba(245,237,224,0.5)" />
            <rect x="48" y="32" width="24" height="38" rx="4" fill="rgba(245,237,224,0.5)" />
            <circle cx="80" cy="25" r="12" fill="rgba(245,237,224,0.4)" />
            <rect x="68" y="37" width="24" height="33" rx="4" fill="rgba(245,237,224,0.4)" />
          </svg>
        </div>
      )}

      {/* Scanning line */}
      {phase === 'scanning' && (
        <div
          className={styles.scanLine}
          style={{ top: `${scanY}%` }}
        />
      )}

      {/* Result card */}
      {phase === 'result' && (
        <motion.div
          className={styles.photoResultCard}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        >
          <p className={styles.photoResultText}>
            Food shortage · 40 people approx. · high urgency · Sector 7 Dharavi
          </p>
          <span className={styles.urgencyChip}>HIGH URGENCY</span>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WHATSAPP SCREEN
// ─────────────────────────────────────────────────────────────

const whatsappMessages = [
  { type: 'outgoing', text: 'Flood damage in Thane sector 3' },
  { type: 'incoming', text: 'समझ गया। कितने लोग affected हैं?' },
  { type: 'outgoing', text: '50 लोग' },
  { type: 'incoming', text: 'आपकी report register कर ली गई है। Need ID: #4721', hasCheck: true },
];

function WhatsAppScreen() {
  return (
    <div className={styles.whatsappScreen}>
      {/* Header */}
      <div className={styles.waHeader}>
        <div className={styles.waOnlineDot} />
        <span>SEVA Agent</span>
      </div>

      {/* Messages */}
      <div className={styles.waMessages}>
        {whatsappMessages.map((msg, i) => (
          <motion.div
            key={i}
            className={`${styles.waBubble} ${msg.type === 'outgoing' ? styles.waOutgoing : styles.waIncoming}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.8, duration: 0.3 }}
          >
            {msg.text}
            {msg.hasCheck && (
              <svg width="12" height="12" viewBox="0 0 12 12" className={styles.waCheck}>
                <path d="M1 6l2 2 3-3" stroke="var(--jade)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M4 6l2 2 3-3" stroke="var(--jade)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WEB FORM SCREEN
// ─────────────────────────────────────────────────────────────

function WebFormScreen() {
  return (
    <div className={styles.webformScreen}>
      {/* Field 1: Need Category */}
      <div className={styles.formField}>
        <label className={styles.formLabel}>NEED CATEGORY</label>
        <div className={styles.selectField}>
          <span>Medical Emergency</span>
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 1l5 5 5-5" />
          </svg>
        </div>
      </div>

      {/* Field 2: Location map */}
      <div className={styles.formField}>
        <label className={styles.formLabel}>LOCATION</label>
        <div className={styles.mapField}>
          <div className={styles.mapGrid}>
            {Array.from({ length: 16 }, (_, i) => (
              <div
                key={i}
                className={styles.mapSquare}
                style={{ opacity: i % 2 === 0 ? 0.05 : 0.12 }}
              />
            ))}
          </div>
          <svg width="10" height="14" viewBox="0 0 10 14" className={styles.mapPin}>
            <path
              d="M5 0C2.24 0 0 2.24 0 5c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z"
              fill="var(--accent)"
            />
            <circle cx="5" cy="5" r="2" fill="var(--bg-dark)" />
          </svg>
        </div>
      </div>

      {/* Field 3: Affected Count */}
      <div className={styles.formField}>
        <label className={styles.formLabel}>AFFECTED COUNT</label>
        <div className={styles.selectField} style={{ width: '120px' }}>
          <span>25</span>
        </div>
      </div>

      {/* Submit button */}
      <button type="button" className={styles.submitButton} aria-label="Submit the web form report">Submit Report</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function IntakeEngineDemo() {
  const [activeTab, setActiveTab] = useState<TabId>('voice');
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Intersection observer for feature list stagger
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const screenComponents: Record<TabId, JSX.Element> = {
    voice: <VoiceScreen key="voice" />,
    photo: <PhotoScreen key="photo" />,
    whatsapp: <WhatsAppScreen key="whatsapp" />,
    webform: <WebFormScreen key="webform" />,
  };

  return (
    <section id="intake-demo" className={styles.intakeDemo} ref={sectionRef}>
      <div className={styles.demoGrid}>
        {/* Left: Phone Mockup */}
        <div className={styles.leftColumn}>
          {/* Phone Frame */}
          <div className={styles.phoneFrame}>
            {/* Notch */}
            <div className={styles.notch} />
            
            {/* Screen */}
            <div className={styles.phoneScreen}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className={styles.screenContent}
                >
                  {screenComponents[activeTab]}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Home indicator */}
            <div className={styles.homeIndicator} />
          </div>

          {/* Tab Switcher */}
          <div className={styles.tabSwitcher} role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-label={`Switch to ${tab.label} intake method`}
                aria-selected={activeTab === tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {activeTab === tab.id && (
                  <motion.div
                    className={styles.tabPill}
                    layoutId="intake-tab-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={styles.tabLabel}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Feature Callouts */}
        <div className={styles.rightColumn}>
          <p className={styles.eyebrow}>SEVA INTAKE ENGINE</p>
          <h2 className={styles.headline}>The intake channel that never misses.</h2>
          <p className={styles.subtext}>
            Four ways in. One unified pipeline. Every report classified, located, and queued in under 20 seconds.
          </p>

          <div className={styles.featureList}>
            {features.map((feature, i) => (
              <motion.div
                key={i}
                className={styles.featureItem}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <div className={styles.featureIcon}>
                  {featureIcons[feature.icon]}
                </div>
                <p className={styles.featureText}>{feature.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
