import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import { WaitlistModal } from '../shared';
import { marketingNavItems } from '../../config/appNavigation';
import styles from './Navbar.module.css';

// Motion configs from foundation
const springSnap = { type: 'spring', stiffness: 400, damping: 30 } as const;
const springWarm = { type: 'spring', stiffness: 220, damping: 16 } as const;

function Navbar() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Scroll detection
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Mobile menu focus trap and escape key
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        hamburgerRef.current?.focus();
        return;
      }

      if (e.key === 'Tab' && mobileMenuRef.current) {
        const focusableElements = mobileMenuRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus first element
    const timer = setTimeout(() => {
      const firstFocusable = mobileMenuRef.current?.querySelector<HTMLElement>(
        'button, [href], input'
      );
      firstFocusable?.focus();
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <>
      <motion.nav
        className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={springSnap}
      >
        {/* Logo Lockup */}
        <Link
          to="/"
          className={styles.logoLockup}
          aria-label="SevaSetu - Go to home"
        >
          <svg
            viewBox="0 0 28 20"
            width="28"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={styles.logoMark}
          >
            <path d="M2,18 C2,10 10,4 14,4 C18,4 26,10 26,18" />
            <line x1="6" y1="12" x2="6" y2="18" />
            <line x1="22" y1="12" x2="22" y2="18" />
            <line x1="2" y1="18" x2="26" y2="18" />
          </svg>
          <div className={styles.logoText}>
            <span className={styles.brandName}>SevaSetu</span>
            <span className={styles.brandSubtitle}>सेवासेतु</span>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <div className={styles.navLinks}>
          {marketingNavItems.map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              className={`${styles.navLink} ${location.pathname === path ? styles.active : ''}`}
              aria-label={`Go to ${label}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right Action Group */}
        <div className={styles.actionGroup}>
          {/* Theme Toggle */}
          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggle}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'light' ? (
                <motion.svg
                  key="sun"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <circle cx="10" cy="10" r="4" />
                  {/* 8 rays */}
                  <line x1="10" y1="1" x2="10" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="10" y1="17" x2="10" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="1" y1="10" x2="3" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="17" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="3.5" y1="3.5" x2="5" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="15" y1="15" x2="16.5" y2="16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="3.5" y1="16.5" x2="5" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="15" y1="5" x2="16.5" y2="3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </motion.svg>
              ) : (
                <motion.svg
                  key="moon"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>

          {/* Desktop Buttons */}
          <button
            type="button"
            className={`btn btn-ghost ${styles.desktopOnly}`}
            onClick={() => setWaitlistOpen(true)}
            aria-label="Join the SevaSetu waitlist"
          >
            Join Waitlist
          </button>
          <Link
            to="/role-access"
            className={`${styles.loginPreviewLink} ${styles.desktopOnly}`}
            aria-label="Open role login"
          >
            <span>Login</span>
          </Link>
          <Link
            to="/for-ngos"
            className={`btn btn-primary ${styles.desktopOnly} ${styles.ctaLink}`}
            aria-label="Open the NGO onboarding workspace"
          >
            For NGOs
          </Link>

          {/* Mobile Hamburger */}
          <button
            ref={hamburgerRef}
            type="button"
            className={styles.hamburger}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <motion.span
              className={styles.hamburgerLine}
              animate={{
                rotate: mobileMenuOpen ? 45 : 0,
                y: mobileMenuOpen ? 8 : 0,
              }}
              transition={springSnap}
            />
            <motion.span
              className={styles.hamburgerLine}
              animate={{
                opacity: mobileMenuOpen ? 0 : 1,
                scaleX: mobileMenuOpen ? 0 : 1,
              }}
              transition={springSnap}
            />
            <motion.span
              className={styles.hamburgerLine}
              animate={{
                rotate: mobileMenuOpen ? -45 : 0,
                y: mobileMenuOpen ? -8 : 0,
              }}
              transition={springSnap}
            />
          </button>
        </div>
      </motion.nav>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            className={styles.mobileOverlay}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 40px) 40px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)' }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className={styles.mobileOverlayContent}>
              {[...marketingNavItems, { label: 'For NGOs', path: '/for-ngos' }].map(({ label, path }) => (
                <motion.div key={path}>
                  <Link
                    to={path}
                    className={styles.mobileLink}
                    aria-label={`Go to ${label}`}
                    onClick={closeMenu}
                  >
                    {label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                className={styles.mobileActions}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  ...springWarm,
                  delay: 0.2 + marketingNavItems.length * 0.1,
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setWaitlistOpen(true);
                  }}
                  aria-label="Join the SevaSetu waitlist"
                >
                  Join Waitlist
                </button>
                <Link
                  to="/for-ngos"
                  className={`btn btn-primary ${styles.ctaLink}`}
                  onClick={closeMenu}
                  aria-label="Open the NGO onboarding workspace"
                >
                  For NGOs
                </Link>
                <Link
                  to="/role-access"
                  className={styles.mobileLoginLink}
                  onClick={closeMenu}
                  aria-label="Open role login"
                >
                  Login
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waitlist Modal */}
      <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
    </>
  );
}

export default Navbar;
