/**
 * GapDetectionManager - Detects gaps in bar data and triggers recovery
 *
 * Monitors multiple conditions that indicate data gaps:
 * - Network reconnection (offline -> online)
 * - Tab visibility change (hidden -> visible)
 * - Bar timeout (no new bars for extended period)
 * - Bar timestamp gaps (gap between consecutive bars)
 */

import type { GapDetectionOptions, GapDetectionEvent, GapDetectionReason, GapDetectionErrorState } from './types';

/**
 * Default options for gap detection
 */
const DEFAULT_OPTIONS: Required<GapDetectionOptions> = {
  barTimeoutMultiplier: 2,
  visibilityDebounceMs: 1000,
  networkDebounceMs: 2000,
  minBarTimeoutMs: 30000,
  gapThresholdMultiplier: 1.5,
  enabled: true,
  maxRetries: 3,
  baseBackoffMs: 5000,
};

/**
 * Manager for detecting gaps in bar data and triggering recovery
 */
export class GapDetectionManager {
  private _options: Required<GapDetectionOptions>;
  private _onRecoveryNeeded: (event: GapDetectionEvent) => void;

  // Interval tracking
  private _intervalMs = 0;
  private _lastBarTime = 0;

  // Bar timeout
  private _barTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Visibility tracking
  private _wasHidden = false;
  private _visibilityDebounceId: ReturnType<typeof setTimeout> | null = null;

  // Network tracking
  private _wasOffline = false;
  private _networkDebounceId: ReturnType<typeof setTimeout> | null = null;

  // Bound event handlers for cleanup
  private _boundVisibilityHandler: (() => void) | null = null;
  private _boundOnlineHandler: (() => void) | null = null;
  private _boundOfflineHandler: (() => void) | null = null;

  // Recovery lock to prevent multiple simultaneous recoveries
  private _isRecovering = false;
  private _recoveryLockMs = 5000; // Minimum time between recoveries

  // Retry/backoff state
  private _retryCount = 0;
  private _backoffUntil = 0;
  private _lastRecoveryReason: GapDetectionReason | null = null;
  private _onErrorStateChange?: (errorState: GapDetectionErrorState | null) => void;

  // Track if manager is started
  private _isStarted = false;

  constructor(
    onRecoveryNeeded: (event: GapDetectionEvent) => void,
    options?: GapDetectionOptions
  ) {
    this._onRecoveryNeeded = onRecoveryNeeded;
    this._options = { ...DEFAULT_OPTIONS, ...options };

    // Initialize visibility state
    if (typeof document !== 'undefined') {
      this._wasHidden = document.visibilityState === 'hidden';
    }

    // Initialize network state
    if (typeof navigator !== 'undefined') {
      this._wasOffline = !navigator.onLine;
    }
  }

  /**
   * Set the bar interval in milliseconds
   * This determines the expected frequency of new bars
   */
  setInterval(intervalMs: number): void {
    this._intervalMs = intervalMs;

    // Restart bar timeout with new interval if started
    if (this._isStarted && this._lastBarTime > 0) {
      this._startBarTimeout();
    }
  }

  /**
   * Record that a bar was received
   * Updates the last bar time and restarts the timeout
   */
  recordBar(barTime: number): void {
    this._lastBarTime = barTime;

    // Restart bar timeout if started
    if (this._isStarted) {
      this._startBarTimeout();
    }
  }

  /**
   * Check if a new bar represents a gap
   * Returns a GapDetectionEvent if a gap is detected, null otherwise
   */
  checkBarGap(newBarTime: number): GapDetectionEvent | null {
    if (!this._options.enabled) return null;
    if (this._lastBarTime === 0) return null;
    if (this._intervalMs === 0) return null;

    const expectedNextBarTime = this._lastBarTime + this._intervalMs;
    const gapThreshold = this._intervalMs * this._options.gapThresholdMultiplier;
    const actualGap = newBarTime - this._lastBarTime;

    // Check if the gap exceeds the threshold
    if (actualGap > gapThreshold) {
      return {
        reason: 'bar-gap',
        timestamp: Date.now(),
        details: {
          expectedBarTime: expectedNextBarTime,
          actualBarTime: newBarTime,
          gapMs: actualGap,
        },
      };
    }

    return null;
  }

  /**
   * Start monitoring for gaps
   * Call this after subscribing to bars
   */
  start(): void {
    if (this._isStarted) return;
    if (!this._options.enabled) return;

    this._isStarted = true;

    // Set up event listeners
    this._setupEventListeners();

    // Start bar timeout if we have interval info
    if (this._intervalMs > 0 && this._lastBarTime > 0) {
      this._startBarTimeout();
    }
  }

  /**
   * Stop monitoring for gaps
   * Call this before unsubscribing from bars
   */
  stop(): void {
    if (!this._isStarted) return;

    this._isStarted = false;

    // Clear timeouts
    this._clearBarTimeout();
    this._clearVisibilityDebounce();
    this._clearNetworkDebounce();

    // Remove event listeners
    this._removeEventListeners();
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.stop();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private _setupEventListeners(): void {
    if (typeof document !== 'undefined') {
      this._boundVisibilityHandler = this._handleVisibilityChange.bind(this);
      document.addEventListener('visibilitychange', this._boundVisibilityHandler);
    }

    if (typeof window !== 'undefined') {
      this._boundOnlineHandler = this._handleOnline.bind(this);
      this._boundOfflineHandler = this._handleOffline.bind(this);
      window.addEventListener('online', this._boundOnlineHandler);
      window.addEventListener('offline', this._boundOfflineHandler);
    }
  }

  private _removeEventListeners(): void {
    if (this._boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this._boundVisibilityHandler);
      this._boundVisibilityHandler = null;
    }

    if (this._boundOnlineHandler) {
      window.removeEventListener('online', this._boundOnlineHandler);
      this._boundOnlineHandler = null;
    }

    if (this._boundOfflineHandler) {
      window.removeEventListener('offline', this._boundOfflineHandler);
      this._boundOfflineHandler = null;
    }
  }

  private _handleVisibilityChange(): void {
    const isHidden = document.visibilityState === 'hidden';

    if (isHidden) {
      // Going hidden - track this state
      this._wasHidden = true;
      // Clear bar timeout since we won't be getting updates
      this._clearBarTimeout();
    } else if (this._wasHidden) {
      // Coming back from hidden - schedule recovery
      this._wasHidden = false;
      this._scheduleVisibilityRecovery();
    }
  }

  private _handleOnline(): void {
    if (this._wasOffline) {
      this._wasOffline = false;
      this._scheduleNetworkRecovery();
    }
  }

  private _handleOffline(): void {
    this._wasOffline = true;
    // Clear bar timeout since we won't be getting updates
    this._clearBarTimeout();
  }

  private _scheduleVisibilityRecovery(): void {
    this._clearVisibilityDebounce();

    this._visibilityDebounceId = setTimeout(() => {
      this._visibilityDebounceId = null;
      this._triggerRecovery('visibility-change');
    }, this._options.visibilityDebounceMs);
  }

  private _scheduleNetworkRecovery(): void {
    this._clearNetworkDebounce();

    this._networkDebounceId = setTimeout(() => {
      this._networkDebounceId = null;
      this._triggerRecovery('network-reconnect');
    }, this._options.networkDebounceMs);
  }

  private _startBarTimeout(): void {
    this._clearBarTimeout();

    if (this._intervalMs === 0) return;

    // Calculate timeout duration
    const timeoutMs = Math.max(
      this._intervalMs * this._options.barTimeoutMultiplier,
      this._options.minBarTimeoutMs
    );

    this._barTimeoutId = setTimeout(() => {
      this._barTimeoutId = null;
      this._triggerRecovery('bar-timeout');
    }, timeoutMs);
  }

  private _clearBarTimeout(): void {
    if (this._barTimeoutId !== null) {
      clearTimeout(this._barTimeoutId);
      this._barTimeoutId = null;
    }
  }

  private _clearVisibilityDebounce(): void {
    if (this._visibilityDebounceId !== null) {
      clearTimeout(this._visibilityDebounceId);
      this._visibilityDebounceId = null;
    }
  }

  private _clearNetworkDebounce(): void {
    if (this._networkDebounceId !== null) {
      clearTimeout(this._networkDebounceId);
      this._networkDebounceId = null;
    }
  }

  private _shouldSkipRecovery(reason: GapDetectionReason): boolean {
    const now = Date.now();

    // Still in backoff period
    if (now < this._backoffUntil) {
      console.log(`[GapDetection] Skipping recovery (${reason}) - in backoff until ${new Date(this._backoffUntil).toISOString()}`);
      return true;
    }

    // Max retries exceeded
    if (this._retryCount >= this._options.maxRetries) {
      console.log(`[GapDetection] Skipping recovery (${reason}) - max retries (${this._options.maxRetries}) exceeded`);
      return true;
    }

    return false;
  }

  private _triggerRecovery(reason: GapDetectionReason): void {
    // Check recovery lock
    if (this._isRecovering) {
      console.log(`[GapDetection] Skipping recovery (${reason}) - already recovering`);
      return;
    }

    // Check backoff and max retries
    if (this._shouldSkipRecovery(reason)) {
      return;
    }

    // Calculate exponential backoff: baseBackoffMs * 2^retryCount
    const backoffMs = this._options.baseBackoffMs * Math.pow(2, this._retryCount);
    this._retryCount++;
    this._backoffUntil = Date.now() + backoffMs;
    this._lastRecoveryReason = reason;

    // Check if we've hit max retries after this attempt
    if (this._retryCount >= this._options.maxRetries) {
      console.log(`[GapDetection] Max retries reached - emitting error state`);
      this._emitErrorState();
    }

    // Set recovery lock
    this._isRecovering = true;
    setTimeout(() => {
      this._isRecovering = false;
    }, this._recoveryLockMs);

    // Clear all pending debounces to avoid duplicate recoveries
    this._clearVisibilityDebounce();
    this._clearNetworkDebounce();
    this._clearBarTimeout();

    console.log(`[GapDetection] Triggering recovery: ${reason} (attempt ${this._retryCount}/${this._options.maxRetries}, next backoff: ${backoffMs}ms)`);

    const event: GapDetectionEvent = {
      reason,
      timestamp: Date.now(),
    };

    this._onRecoveryNeeded(event);
  }

  private _emitErrorState(): void {
    if (this._onErrorStateChange) {
      this._onErrorStateChange({
        hasError: true,
        retryCount: this._retryCount,
        maxRetries: this._options.maxRetries,
        reason: this._lastRecoveryReason ?? undefined,
      });
    }
  }

  // ============================================================================
  // Public Methods for Retry State Management
  // ============================================================================

  /**
   * Reset retry state after successful bar sequence.
   * Call this when bars are being received successfully without gaps.
   */
  resetRetryState(): void {
    const hadError = this._retryCount >= this._options.maxRetries;
    this._retryCount = 0;
    this._backoffUntil = 0;
    this._lastRecoveryReason = null;

    // Emit cleared error state if we had an error before
    if (hadError && this._onErrorStateChange) {
      this._onErrorStateChange(null);
    }
  }

  /**
   * Get current error state for UI display.
   * Returns null if no error, or error state if max retries exceeded.
   */
  getErrorState(): GapDetectionErrorState | null {
    if (this._retryCount >= this._options.maxRetries) {
      return {
        hasError: true,
        retryCount: this._retryCount,
        maxRetries: this._options.maxRetries,
        reason: this._lastRecoveryReason ?? undefined,
      };
    }
    return null;
  }

  /**
   * Set callback for error state changes.
   * Used to update UI when error state changes.
   */
  setOnErrorStateChange(callback: (errorState: GapDetectionErrorState | null) => void): void {
    this._onErrorStateChange = callback;
  }
}
