import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useSpring, useMotionValue, AnimatePresence } from 'motion/react';
import styles from './CustomCursor.module.css';

interface RippleEffect {
  id: number;
  x: number;
  y: number;
}

function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isPointer, setIsPointer] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<RippleEffect[]>([]);
  const [hoverText, setHoverText] = useState<string | null>(null);
  const rippleId = useRef(0);

  // Mouse position with spring physics for smooth trailing
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  // Main cursor - snappy response
  const springConfig = { damping: 35, stiffness: 400, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  // Trail cursor - slower, more fluid
  const trailConfig = { damping: 20, stiffness: 150, mass: 0.8 };
  const trailXSpring = useSpring(cursorX, trailConfig);
  const trailYSpring = useSpring(cursorY, trailConfig);

  // Outer glow - even slower for ethereal effect
  const glowConfig = { damping: 15, stiffness: 80, mass: 1.2 };
  const glowXSpring = useSpring(cursorX, glowConfig);
  const glowYSpring = useSpring(cursorY, glowConfig);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    cursorX.set(e.clientX);
    cursorY.set(e.clientY);
    setIsVisible(true);
  }, [cursorX, cursorY]);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsVisible(true);
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    setIsPressed(true);
    
    // Create ripple effect on click
    const newRipple: RippleEffect = {
      id: rippleId.current++,
      x: e.clientX,
      y: e.clientY,
    };
    setRipples(prev => [...prev, newRipple]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 800);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  // Track hoverable elements
  useEffect(() => {
    const handleElementHover = (e: Event) => {
      const target = e.target as HTMLElement;
      const interactive = target.closest('a, button, [role="button"], input, textarea, select, [data-cursor="pointer"]');
      const cursorText = target.closest('[data-cursor-text]');
      
      if (interactive) {
        setIsPointer(true);
        setIsHovering(true);
        if (cursorText) {
          setHoverText(cursorText.getAttribute('data-cursor-text'));
        }
      }
    };

    const handleElementLeave = () => {
      setIsPointer(false);
      setIsHovering(false);
      setHoverText(null);
    };

    // Use event delegation for better performance
    document.addEventListener('mouseover', handleElementHover);
    document.addEventListener('mouseout', handleElementLeave);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseover', handleElementHover);
      document.removeEventListener('mouseout', handleElementLeave);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseLeave, handleMouseEnter, handleMouseDown, handleMouseUp]);

  // Hide on touch devices and add cursor class to html
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(isTouch);
    
    // Add class to html for global cursor hiding
    if (!isTouch) {
      document.documentElement.classList.add('has-custom-cursor');
    }
    
    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, []);

  if (isTouchDevice) return null;

  return (
    <div className={styles.cursorContainer} aria-hidden="true">
      {/* Outer ethereal glow - slowest, creates depth */}
      <motion.div
        className={styles.cursorGlow}
        style={{
          x: glowXSpring,
          y: glowYSpring,
        }}
        animate={{
          opacity: isVisible ? (isHovering ? 0.6 : 0.3) : 0,
          scale: isHovering ? 2.5 : isPressed ? 1.8 : 1,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Trail element - medium speed, connection feeling */}
      <motion.div
        className={styles.cursorTrail}
        style={{
          x: trailXSpring,
          y: trailYSpring,
        }}
        animate={{
          opacity: isVisible ? (isHovering ? 0.8 : 0.5) : 0,
          scale: isHovering ? 1.8 : isPressed ? 0.8 : 1,
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Main cursor dot */}
      <motion.div
        className={styles.cursorMain}
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
        }}
        animate={{
          opacity: isVisible ? 1 : 0,
          scale: isPressed ? 0.7 : isPointer ? 1.5 : 1,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      >
        {/* Inner core with gradient */}
        <motion.div 
          className={styles.cursorCore}
          animate={{
            scale: isHovering ? 0.6 : 1,
          }}
        />
        
        {/* Rotating ring for hover state */}
        <AnimatePresence>
          {isHovering && (
            <motion.div
              className={styles.cursorRing}
              initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
              transition={{ duration: 0.25 }}
            >
              {/* Orbit dots */}
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className={styles.orbitDot}
                  style={{
                    rotate: i * 120,
                  }}
                  animate={{
                    rotate: [i * 120, i * 120 + 360],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Hover text label */}
      <AnimatePresence>
        {hoverText && (
          <motion.div
            className={styles.cursorLabel}
            style={{
              x: cursorXSpring,
              y: cursorYSpring,
            }}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 30 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {hoverText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click ripple effects - symbolizing impact spreading outward */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            className={styles.ripple}
            style={{
              left: ripple.x,
              top: ripple.y,
            }}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Multiple ripple rings for richer effect */}
            <span className={styles.rippleRing} style={{ animationDelay: '0ms' }} />
            <span className={styles.rippleRing} style={{ animationDelay: '100ms' }} />
            <span className={styles.rippleRing} style={{ animationDelay: '200ms' }} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Magnetic particles that appear on hover */}
      <AnimatePresence>
        {isHovering && isVisible && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className={styles.particle}
                style={{
                  x: cursorXSpring,
                  y: cursorYSpring,
                }}
                initial={{ 
                  opacity: 0, 
                  scale: 0,
                }}
                animate={{ 
                  opacity: [0, 0.8, 0],
                  scale: [0, 1, 0.5],
                  x: cursorXSpring.get() + Math.cos(i * 60 * Math.PI / 180) * 40,
                  y: cursorYSpring.get() + Math.sin(i * 60 * Math.PI / 180) * 40,
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CustomCursor;
