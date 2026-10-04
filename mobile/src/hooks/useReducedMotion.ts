/**
 * useReducedMotion — subscribes to the system's "Reduce Motion" accessibility
 * setting and re-renders when it changes.
 *
 * Replaces the 4-line inline pattern duplicated across 13 screens.
 *
 * Usage:
 *   import { useReducedMotion } from '../hooks/useReducedMotion';
 *   const reduceMotion = useReducedMotion();
 *   if (reduceMotion) { /* skip decorative animation *\/ }
 */

import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  return reduceMotion;
}
