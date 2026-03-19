import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { NoiseTexture } from '../shared';
import styles from './Testimonials.module.css';

// Motion config from foundation
const springWarm = { type: 'spring', stiffness: 220, damping: 16 } as const;
const easeStately = { duration: 0.7, ease: [0.16, 1, 0.3, 1] } as const;

const cardsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: springWarm }
};

interface TestimonialCardData {
  quote: string;
  quoteHindi?: string;
  quoteEnglish?: string;
  attribution: string;
  sdgs: string[];
  avatar: 'health' | 'coordinator' | 'corporate';
}

const testimonials: TestimonialCardData[] = [
  {
    quoteHindi: 'पहले form भरने में बहुत time लगता था। अब एक बार बोलती हूँ, काम हो जाता है।',
    quoteEnglish: "Filling out the forms used to take so long. Now I speak once, and it\u2019s done.",
    quote: '', // Will use Hindi/English instead
    attribution: 'REKHA DEVI · Field Health Worker · Muzaffarpur, Bihar',
    sdgs: ['SDG 3', 'SDG 6'],
    avatar: 'health'
  },
  {
    quote:
      'The SEVA Agent assigned a volunteer before I even opened my laptop. The plain-language justification it gave was better than what I would have written myself.',
    attribution: 'SURESH MENON · Volunteer Coordinator · Bengaluru',
    sdgs: ['SDG 4', 'SDG 17'],
    avatar: 'coordinator'
  },
  {
    quote:
      'The BRSR export took 4 seconds. I had 3 weeks blocked in Q4 for this. I genuinely do not know what to do with that time now.',
    attribution: 'NAMRATA SHAH · Head of CSR · FMCG Sector, Mumbai',
    sdgs: ['SDG 8', 'SDG 11'],
    avatar: 'corporate'
  }
];

// Custom SVG quotation mark (two bars with curved tails)
function QuoteMark({ size = 'large' }: { size?: 'large' | 'small' }) {
  const dimensions = size === 'large' ? { width: 40, height: 60 } : { width: 40, height: 30 };
  const scale = size === 'large' ? 1 : 0.5;

  return (
    <svg
      viewBox="0 0 40 60"
      width={dimensions.width}
      height={dimensions.height}
      fill="var(--accent)"
      style={{ opacity: 0.45, display: 'block', marginBottom: size === 'large' ? '-8px' : '0' }}
      aria-hidden="true"
    >
      <g transform={`scale(${scale})`}>
        {/* Left bar */}
        <rect x="2" y="0" width="14" height="24" rx="7" />
        {/* Right bar */}
        <rect x="24" y="0" width="14" height="24" rx="7" />
        {/* Downward tails curving outward */}
        <path
          d="M2,20 Q2,40 16,52"
          stroke="var(--accent)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M24,20 Q24,40 38,52"
          stroke="var(--accent)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

// Abstract avatar SVGs
function Avatar({ type }: { type: 'health' | 'coordinator' | 'corporate' }) {
  const svgStyle = {
    width: '40px',
    height: '40px',
    fill: 'var(--text-muted)',
    opacity: 0.6
  };

  switch (type) {
    case 'health':
      // Overlapping circles + health cross shape (health outreach worker)
      return (
        <svg viewBox="0 0 40 40" style={svgStyle} aria-hidden="true">
          <circle cx="15" cy="15" r="8" />
          <circle cx="25" cy="15" r="8" />
          <rect x="18" y="22" width="4" height="12" rx="2" />
          <rect x="13" y="27" width="14" height="4" rx="2" />
        </svg>
      );
    case 'coordinator':
      // Rectangle desk shape + small circle above (workstation person)
      return (
        <svg viewBox="0 0 40 40" style={svgStyle} aria-hidden="true">
          <circle cx="20" cy="10" r="6" />
          <rect x="8" y="20" width="24" height="16" rx="2" />
          <rect x="15" y="28" width="10" height="2" rx="1" />
        </svg>
      );
    case 'corporate':
      // Diamond/badge shape (professional identity)
      return (
        <svg viewBox="0 0 40 40" style={svgStyle} aria-hidden="true">
          <path d="M20 4 L32 12 L32 28 L20 36 L8 28 L8 12 Z" />
          <circle cx="20" cy="20" r="6" />
        </svg>
      );
    default:
      return null;
  }
}

function TestimonialCard({ testimonial }: { testimonial: TestimonialCardData }) {
  return (
    <motion.div className={styles.testimonialCard} variants={cardVariants}>
      {/* Opening quote mark */}
      <QuoteMark size="small" />

      {/* Quote text */}
      <div className={styles.cardQuote}>
        {testimonial.quoteHindi ? (
          <>
            {/* Primary Devanagari quote */}
            <p
              style={{
                fontFamily: "'Noto Sans Devanagari', sans-serif",
                fontSize: '0.9375rem',
                lineHeight: 1.7,
                marginBottom: '8px'
              }}
            >
              {testimonial.quoteHindi}
            </p>
            {/* English translation */}
            <span
              style={{
                fontStyle: 'italic',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                display: 'block',
                marginTop: '8px'
              }}
            >
              {testimonial.quoteEnglish}
            </span>
          </>
        ) : (
          <p>{testimonial.quote}</p>
        )}
      </div>

      {/* Attribution */}
      <p className={styles.cardAttribution}>{testimonial.attribution}</p>

      {/* Abstract avatar */}
      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
        <Avatar type={testimonial.avatar} />
      </div>

      {/* SDG chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {testimonial.sdgs.map((sdg) => (
          <span key={sdg} className={styles.sdgChip}>
            {sdg}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export default function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section id="testimonials" className={styles.testimonials} ref={ref}>
      <NoiseTexture opacity={0.03} />

      {/* Devanagari texture */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-3%',
          top: '10%',
          fontSize: 'clamp(10rem, 25vw, 20rem)',
          fontFamily: "'Noto Sans Devanagari', sans-serif",
          fontWeight: 900,
          opacity: 0.055,
          color: 'var(--text)',
          userSelect: 'none',
          pointerEvents: 'none',
          lineHeight: 0.85,
          zIndex: 0
        }}
      >
        सेवा
      </div>

      {/* Content container */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Eyebrow */}
        <p className="eyebrow" style={{ marginBottom: '32px' }}>
          IN THEIR OWN WORDS
        </p>

        <div className={styles.pullQuoteTopRow}>
          {/* Pull quote */}
          <div className={styles.pullQuoteBlock}>
            <QuoteMark size="large" />

            <motion.blockquote
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={easeStately}
              style={{
                margin: 0,
                fontFamily: "'Bricolage Grotesque', Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(1.5rem, 3.5vw, 2.75rem)',
                color: 'var(--text)',
                lineHeight: 1.3,
                letterSpacing: '-0.01em'
              }}
            >
              I used to spend Tuesday afternoons copying data from WhatsApp to Excel. Now the system
              does it while I'm still in the field.
            </motion.blockquote>

            <motion.p
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ ...easeStately, delay: 0.2 }}
              style={{
                fontFamily: 'General Sans, sans-serif',
                fontWeight: 600,
                fontSize: '0.6875rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginTop: '24px'
              }}
            >
              PROGRAM COORDINATOR · MUMBAI-BASED NGO · HEALTH SECTOR
            </motion.p>
          </div>

          <motion.div
            className={styles.pullQuoteVisual}
            initial={{ opacity: 0, x: 24 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
            transition={{ ...easeStately, delay: 0.12 }}
            aria-hidden="true"
          >
            <div className={styles.visualHeader}>Live Tuesday Snapshot</div>

            <svg viewBox="0 0 560 300" className={styles.visualCanvas}>
            <defs>
              <linearGradient id="tuesday-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--snapshot-shell-bg)" />
              <stop offset="100%" stopColor="var(--snapshot-shell-bg-2)" />
            </linearGradient>
          </defs>

            <rect x="10" y="12" width="540" height="276" rx="22" fill="url(#tuesday-bg)" stroke="var(--snapshot-shell-stroke)" />

            <rect x="44" y="58" width="150" height="190" rx="14" fill="var(--snapshot-phone-bg)" stroke="var(--snapshot-phone-stroke)" />
            <text x="64" y="82" fill="var(--snapshot-phone-label)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '11px', letterSpacing: '0.07em' }}>
              WhatsApp Intake
            </text>
            <rect x="62" y="96" width="110" height="24" rx="10" fill="var(--snapshot-phone-bubble)" />
            <rect x="62" y="126" width="88" height="22" rx="10" fill="var(--snapshot-phone-bubble)" />
            <rect x="62" y="154" width="116" height="22" rx="10" fill="var(--snapshot-phone-bubble)" />
            <rect x="88" y="182" width="90" height="26" rx="12" fill="var(--snapshot-tag-bg)" stroke="var(--snapshot-tag-stroke)" />
            <text x="133" y="199" textAnchor="middle" fill="var(--snapshot-tag-text)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '11px', fontWeight: 600 }}>
              Auto-Tagged
            </text>

            <path d="M212 152 C248 152 260 112 302 112" fill="none" stroke="var(--snapshot-arrow)" strokeWidth="2.2" strokeDasharray="8 8" />
            <path d="M302 112 L294 106 M302 112 L294 118" fill="none" stroke="var(--snapshot-arrow)" strokeWidth="2.2" strokeLinecap="round" />

            <rect x="310" y="70" width="208" height="56" rx="12" fill="var(--snapshot-prev-bg)" stroke="var(--snapshot-prev-stroke)" />
            <text x="326" y="92" fill="var(--snapshot-prev-kicker)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '10px', letterSpacing: '0.08em', fontWeight: 700 }}>
              PREVIOUS TUESDAY
            </text>
            <text x="326" y="112" fill="var(--snapshot-prev-text)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '12px', fontWeight: 700 }}>
              3h 42m manual transfer
            </text>

            <rect x="310" y="142" width="208" height="56" rx="12" fill="var(--snapshot-this-bg)" stroke="var(--snapshot-this-stroke)" />
            <text x="326" y="164" fill="var(--snapshot-this-kicker)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '10px', letterSpacing: '0.08em', fontWeight: 700 }}>
              THIS TUESDAY
            </text>
            <text x="326" y="184" fill="var(--snapshot-this-text)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '12px', fontWeight: 700 }}>
              9m review, zero transfer
            </text>

            <rect x="310" y="214" width="208" height="38" rx="10" fill="var(--snapshot-foot-bg)" />
            <text x="326" y="232" fill="var(--snapshot-foot-text)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '10px', fontWeight: 700 }}>
              96% time reclaimed
            </text>
            <text x="326" y="246" fill="var(--snapshot-foot-text)" style={{ fontFamily: "'General Sans', sans-serif", fontSize: '10px', fontWeight: 600 }}>
              every Tuesday
            </text>
            </svg>
          </motion.div>
        </div>

        {/* Hairline divider */}
        <div className="divider" style={{ margin: '64px 0' }} />

        {/* Three testimonial cards */}
        <motion.div
          className={styles.cardsGrid}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={cardsContainerVariants}
        >
          {testimonials.map((testimonial, i) => (
            <TestimonialCard key={i} testimonial={testimonial} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
