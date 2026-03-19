import { useRef, useState, useEffect } from 'react';
import { motion, useInView, useMotionValue, animate } from 'motion/react';
import { NoiseTexture } from '../shared';
import { WaitlistModal } from '../shared';
import styles from './FinalCTA.module.css';

// Motion config from foundation
const springWarm = {
  type: 'spring' as const,
  stiffness: 220,
  damping: 16
};

// Animation variants
const headlineContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 }
  }
};

const lineVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: springWarm }
};

const fadeRise = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
};

// Floating particle component
interface ParticleProps {
  x: number;
  size: number;
  opacity: number;
  speed: number;
  isDark: boolean;
}

function FloatingParticle({ x, size, opacity, speed, isDark }: ParticleProps) {
  const yMotion = useMotionValue(100);

  useEffect(() => {
    const controls = animate(yMotion, -10, {
      duration: speed,
      ease: 'linear',
      repeat: Infinity,
      repeatType: 'loop'
    });

    return () => controls.stop();
  }, [yMotion, speed]);

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: `${x}%`,
        y: yMotion,
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: isDark ? '#1C0E06' : '#F5EDE0',
        opacity,
        pointerEvents: 'none'
      }}
    />
  );
}

export function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  // Generate particles on mount
  const [particles] = useState(() => {
    const particleCount = window.innerWidth <= 768 ? 5 : 10;
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 4 + Math.random() * 4, // 4-8px
      opacity: 0.06 + Math.random() * 0.06, // 0.06-0.12
      speed: 40 + Math.random() * 40, // 40-80s
      isDark: Math.random() > 0.4 // 60% dark, 40% light
    }));
  });

  const scrollToSection = (id: string) => {
    const element = document.querySelector(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <section
        ref={sectionRef}
        id="final-cta"
        className={styles.finalCta}
        aria-labelledby="final-cta-heading"
      >
        <NoiseTexture opacity={0.05} />

        {/* Devanagari texture */}
        <div
          aria-hidden="true"
          className={styles.devanagariTexture}
        >
          सेवासेतु
        </div>

        {/* Floating particles */}
        {particles.map((particle) => (
          <FloatingParticle key={particle.id} {...particle} />
        ))}

        {/* Main content */}
        <div className={styles.content}>
          {/* Three-line headline with stagger */}
          <motion.div
            variants={headlineContainerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className={styles.headlineContainer}
          >
            <motion.span
              variants={lineVariants}
              className={styles.headlineLine1}
            >
              India's communities
            </motion.span>
            <motion.span
              variants={lineVariants}
              className={styles.headlineLine2}
            >
              can't wait.
            </motion.span>
            <motion.span
              variants={lineVariants}
              className={styles.headlineLine3}
            >
              Neither should you.
            </motion.span>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={fadeRise}
            transition={{ ...springWarm, delay: 0.45 }}
            className={styles.subheadline}
          >
            SevaSetu is live for early NGO partners. Be among the first 500 organizations.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={fadeRise}
            transition={{ ...springWarm, delay: 0.55 }}
            className={styles.ctaButtons}
          >
            <motion.button
              className="btn btn-inverse"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsWaitlistOpen(true)}
              aria-label="Register your NGO for early access to SevaSetu"
            >
              Register Your NGO
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                style={{ marginLeft: '8px' }}
              >
                <path
                  d="M4,8 L12,8 M9,5 L12,8 L9,11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.button>

            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => scrollToSection('#three-pillars')}
              aria-label="Explore the SevaSetu platform — scroll to how it works"
              className={styles.ghostButton}
            >
              Explore the Platform
            </motion.button>
          </motion.div>

          {/* Micro note */}
          <motion.p
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={fadeRise}
            transition={{ ...springWarm, delay: 0.65 }}
            className={styles.microNote}
          >
            Free forever for NGOs and volunteers.
          </motion.p>
        </div>
      </section>

      <WaitlistModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
      />
    </>
  );
}
