import { useCallback, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import styles from './Footer.module.css';

// Motion config from foundation
const easeStately = {
  duration: 0.7,
  ease: [0.16, 1, 0.3, 1] as const
};

const fadeRise = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.1 });
  const [isBrandHovered, setIsBrandHovered] = useState(false);
  const [spotlight, setSpotlight] = useState({ x: 120, y: 72 });

  const handleBrandMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSpotlight({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  }, []);

  const productLinks = [
    { label: 'Intake Engine', href: '#intake-demo' },
    { label: 'Community Pulse Map', href: '#pulse-map' },
    { label: 'SEVA Agent', href: '#matching-engine' },
    { label: 'Crisis Mode', href: '#crisis-mode' },
    { label: 'CSR Portal', href: '#csr-portal' }
  ];

  const platformLinks = [
    { label: 'How It Works', href: '#three-pillars' },
    { label: 'Tech Stack', href: '#tech' },
    { label: 'Impact Targets', href: '#impact' },
    { label: 'Personas', href: '#personas' },
    { label: 'Open Source', href: 'https://github.com/sevasetu', external: true }
  ];

  const companyLinks = [
    { label: 'About the Team', href: '#about' },
    { label: 'Google Solution Challenge', href: 'https://developers.google.com/community/gdsc-solution-challenge', external: true },
    { label: 'Contact Us', href: 'mailto:hello@sevasetu.app' },
    { label: 'Press Kit', href: '#press' },
    { label: 'Privacy Policy', href: '#privacy' }
  ];

  return (
    <footer ref={footerRef} id="footer" role="contentinfo" className={styles.footer}>
      {/* Ambient Devanagari texture */}
      <div aria-hidden="true" className={styles.devanagariTexture}>
        सेवासेतु
      </div>

      {/* Main grid */}
      <motion.div
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={fadeRise}
        transition={easeStately}
        className={styles.footerGrid}
      >
        {/* Brand column */}
        <div
          className={styles.brandColumn}
          onMouseEnter={() => setIsBrandHovered(true)}
          onMouseLeave={() => setIsBrandHovered(false)}
          onMouseMove={handleBrandMouseMove}
        >
          <motion.div
            aria-hidden="true"
            className={styles.spotlightLayer}
            style={{
              background: `radial-gradient(ellipse 200px 120px at ${spotlight.x}px ${spotlight.y}px, rgba(212,98,42,0.06), transparent)`
            }}
            initial={false}
            animate={{ opacity: isBrandHovered ? 1 : 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />

          <div className={styles.brandContent}>
            <a
              href="#hero"
              aria-label="SevaSetu — return to top"
              className={styles.logoLink}
            >
              <svg
                viewBox="0 0 28 20"
                width="32"
                height="23"
                fill="none"
                stroke="#F5EDE0"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2,18 C2,10 10,4 14,4 C18,4 26,10 26,18" />
                <line x1="6" y1="12" x2="6" y2="18" />
                <line x1="22" y1="12" x2="22" y2="18" />
                <line x1="2" y1="18" x2="26" y2="18" />
              </svg>

              <div>
                <span className={styles.logoText}>SevaSetu</span>
                <span className={styles.logoDevanagari}>सेवासेतु</span>
              </div>
            </a>

            <p className={styles.tagline}>
              Connecting India\u2019s 3.3 million NGOs to communities in need. AI-powered. Free forever for NGOs.
            </p>

            <div className={styles.socialLinks}>
              <a
                href="https://github.com/sevasetu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow SevaSetu on GitHub"
                className={styles.socialButton}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <circle cx="10" cy="9" r="7" />
                  <circle cx="6.5" cy="3" r="1.5" />
                  <circle cx="13.5" cy="3" r="1.5" />
                  <circle cx="7.5" cy="8" r="1.2" fill="#1C0E06" />
                  <circle cx="12.5" cy="8" r="1.2" fill="#1C0E06" />
                  <path d="M6,15 C6,15 6,13 7,12" stroke="#1C0E06" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  <path d="M14,15 C14,15 14,13 13,12" stroke="#1C0E06" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
                <span className={styles.srOnly}>(opens in new tab)</span>
              </a>

              <a
                href="https://twitter.com/sevasetu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow SevaSetu on Twitter / X"
                className={styles.socialButton}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M3,3 L17,17" />
                  <path d="M17,3 L3,17" />
                </svg>
                <span className={styles.srOnly}>(opens in new tab)</span>
              </a>

              <a
                href="https://linkedin.com/company/sevasetu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow SevaSetu on LinkedIn"
                className={styles.socialButton}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="16" height="16" rx="3" />
                  <circle cx="5.5" cy="6" r="1" fill="currentColor" stroke="none" />
                  <line x1="5.5" y1="8.5" x2="5.5" y2="14" />
                  <line x1="9" y1="8.5" x2="9" y2="14" />
                  <path d="M9,10 Q9,8 11,8 Q13,8 13,10 L13,14" fill="none" />
                </svg>
                <span className={styles.srOnly}>(opens in new tab)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Product column */}
        <nav aria-label="Product links" className={styles.linkColumn}>
          <h4 className={styles.columnHeading}>Product</h4>
          <ul className={styles.linkList}>
            {productLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={styles.footerLink} aria-label={link.label}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Platform column */}
        <nav aria-label="Platform links" className={styles.linkColumn}>
          <h4 className={styles.columnHeading}>Platform</h4>
          <ul className={styles.linkList}>
            {platformLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={styles.footerLink}
                  aria-label={link.external ? `${link.label} (opens in new tab)` : link.label}
                  {...(link.external && {
                    target: '_blank',
                    rel: 'noopener noreferrer'
                  })}
                >
                  {link.label}
                  {link.external && <span className={styles.srOnly}>(opens in new tab)</span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Company column */}
        <nav aria-label="Company links" className={styles.linkColumn}>
          <h4 className={styles.columnHeading}>Company</h4>
          <ul className={styles.linkList}>
            {companyLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={styles.footerLink}
                  aria-label={link.external ? `${link.label} (opens in new tab)` : link.label}
                  {...(link.external && {
                    target: '_blank',
                    rel: 'noopener noreferrer'
                  })}
                >
                  {link.label}
                  {link.external && <span className={styles.srOnly}>(opens in new tab)</span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </motion.div>

      {/* Hairline divider */}
      <div className={styles.divider} />

      {/* Bottom bar */}
      <motion.div
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={fadeRise}
        transition={{ ...easeStately, delay: 0.15 }}
        className={styles.bottomBar}
      >
        <p className={styles.copyright}>
          © 2026 SevaSetu. All rights reserved.
        </p>

        <p className={styles.madeWith}>
          Made with care for India\u2019s social sector.
        </p>

        <div className={styles.googleBadge} aria-label="Powered by Google Cloud">
          <svg
            className={styles.badgeIcon}
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 2.5a7.5 7.5 0 1 0 5.8 12.2"
              stroke="rgba(245,237,224,0.6)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M13.3 10h-3.4"
              stroke="rgba(245,237,224,0.6)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M6.6 13.8h7.1a2.2 2.2 0 0 0 0-4.4 3.3 3.3 0 0 0-6.1-1.4A2.9 2.9 0 0 0 6.6 13.8Z"
              stroke="rgba(245,237,224,0.5)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={styles.badgeLabel}>Powered by</span>
          <span className={styles.badgeBrand}>Google Cloud</span>
        </div>
      </motion.div>
    </footer>
  );
}
