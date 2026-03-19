import { useRef, useState, useEffect } from 'react';
import { useInView } from 'motion/react';

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  duration?: number;
  locale?: 'en-IN' | 'en-US';
}

function AnimatedCounter({
  target,
  suffix = '',
  duration = 2000,
  locale = 'en-IN',
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-15%' });
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Cubic ease-out: 1 - Math.pow(1 - progress, 3)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(easedProgress * target);

      setCurrentValue(value);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isInView, target, duration]);

  const formattedValue = currentValue.toLocaleString(locale);

  return (
    <span
      ref={ref}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {formattedValue}{suffix}
    </span>
  );
}

export default AnimatedCounter;
