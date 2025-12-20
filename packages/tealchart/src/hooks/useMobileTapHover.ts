/**
 * useMobileTapHover - Generalized mobile tap-hover behavior hook
 *
 * On mobile, tapping an element toggles its "hover" state instead of using mouse hover.
 * Includes auto-hide timer functionality.
 *
 * Usage:
 * - Tap once to show hover state (e.g., action buttons)
 * - Tap again to hide, or wait for auto-hide timer
 * - Dragging cancels the tap and hides the hover state
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseMobileTapHoverOptions {
  /** Auto-hide delay in ms (default: 3000) */
  autoHideDelay?: number;
  /** Whether the zone is disabled (e.g., legend is collapsed) */
  disabled?: boolean;
}

export interface UseMobileTapHoverResult {
  /** Whether the hover state is active */
  isActive: boolean;
  /** Call this when a tap is detected in the zone */
  handleTap: () => void;
  /** Call this when dragging starts (cancels hover, clears timer) */
  handleDragStart: () => void;
  /** Manually show hover state and start timer */
  show: () => void;
  /** Manually hide hover state and clear timer */
  hide: () => void;
  /** Reset the auto-hide timer (keeps state visible for another delay period) */
  resetTimer: () => void;
}

/**
 * Hook for mobile tap-to-hover behavior with auto-hide timer
 */
export function useMobileTapHover(options: UseMobileTapHoverOptions = {}): UseMobileTapHoverResult {
  const { autoHideDelay = 3000, disabled = false } = options;

  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the auto-hide timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start the auto-hide timer
  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setIsActive(false);
      timerRef.current = null;
    }, autoHideDelay);
  }, [autoHideDelay, clearTimer]);

  // Reset the timer (keeps visible for another delay period)
  const resetTimer = useCallback(() => {
    if (isActive) {
      startTimer();
    }
  }, [isActive, startTimer]);

  // Show hover state and start timer
  const show = useCallback(() => {
    if (disabled) return;
    setIsActive(true);
    startTimer();
  }, [disabled, startTimer]);

  // Hide hover state and clear timer
  const hide = useCallback(() => {
    clearTimer();
    setIsActive(false);
  }, [clearTimer]);

  // Handle a tap in the zone - toggles hover state
  const handleTap = useCallback(() => {
    if (disabled) return;

    setIsActive(prev => {
      if (!prev) {
        // Showing - start auto-hide timer
        startTimer();
        return true;
      } else {
        // Hiding - clear timer
        clearTimer();
        return false;
      }
    });
  }, [disabled, startTimer, clearTimer]);

  // Handle drag start - hide and clear timer
  const handleDragStart = useCallback(() => {
    hide();
  }, [hide]);

  // Clear timer when disabled changes or on unmount
  useEffect(() => {
    if (disabled) {
      hide();
    }
    return () => clearTimer();
  }, [disabled, hide, clearTimer]);

  return {
    isActive,
    handleTap,
    handleDragStart,
    show,
    hide,
    resetTimer,
  };
}

/**
 * Detect if the current device is touch-capable (mobile/tablet)
 * Use this to conditionally apply mobile tap-hover behavior
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
