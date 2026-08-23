import React, { useEffect, useRef } from 'react';
import { useMotionValue, useTransform, animate, useReducedMotion } from 'motion/react';

/**
 * CountUp — animates a number from its previous value to `value`.
 * Uses Motion's useMotionValue so it NEVER re-renders React on each frame.
 *
 * @param {number}  value    - Target number
 * @param {number}  duration - Animation duration in ms (default 900)
 * @param {number}  decimals - Fixed decimal places (default 0)
 * @param {string}  prefix   - Prepended string e.g. "$"
 * @param {string}  suffix   - Appended string e.g. "%"
 */
const CountUp = ({ value, duration = 900, decimals = 0, prefix = '', suffix = '' }) => {
  const reduced = useReducedMotion();
  const motionVal = useMotionValue(0);
  const spanRef = useRef(null);

  // Format number with thousands separators and fixed decimals
  const format = (n) => {
    const fixed = n.toFixed(decimals);
    const [int, dec] = fixed.split('.');
    const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return dec !== undefined ? `${formatted}.${dec}` : formatted;
  };

  // Subscribe to motion value — write directly to DOM, zero React re-renders
  useEffect(() => {
    const unsub = motionVal.on('change', (v) => {
      if (spanRef.current) {
        spanRef.current.textContent = `${prefix}${format(v)}${suffix}`;
      }
    });
    return unsub;
  }, [prefix, suffix, decimals]);

  useEffect(() => {
    if (reduced) {
      // Skip animation — immediately snap to value
      motionVal.set(value);
      if (spanRef.current) {
        spanRef.current.textContent = `${prefix}${format(value)}${suffix}`;
      }
      return;
    }
    const controls = animate(motionVal, value, {
      duration: duration / 1000,
      ease: 'easeOut',
    });
    return () => controls.stop();
  }, [value, duration, reduced]);

  return (
    <span
      ref={spanRef}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {`${prefix}${format(value)}${suffix}`}
    </span>
  );
};

export default CountUp;
