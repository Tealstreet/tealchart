/**
 * TealchartLogger - Debug logging system for Tealchart
 *
 * Provides:
 * - Ring buffer that always captures logs (for UI display)
 * - Optional console output (controlled by dev override)
 * - Subscribe pattern for React components
 * - Categories for filtering
 */

export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export interface LogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
  /** Count of consecutive duplicate logs (1 = no dupes) */
  count: number;
}

export interface TealchartLoggerOptions {
  /** Maximum number of log entries to keep (default: 500) */
  maxEntries?: number;
  /** Whether to output to browser console (default: true) */
  consoleOutput?: boolean;
  /** Prefix for console output (default: '[Tealchart]') */
  consolePrefix?: string;
}

type LogListener = (logs: LogEntry[]) => void;

/**
 * Logger instance for a Tealchart widget
 */
export class TealchartLogger {
  private _entries: LogEntry[] = [];
  private _listeners = new Set<LogListener>();
  private _nextId = 1;
  private _maxEntries: number;
  private _consoleOutput: boolean;
  private _consolePrefix: string;
  private _enabled = true;
  private _notifyScheduled = false;

  constructor(options: TealchartLoggerOptions = {}) {
    this._maxEntries = options.maxEntries ?? 500;
    this._consoleOutput = options.consoleOutput ?? true;
    this._consolePrefix = options.consolePrefix ?? '[Tealchart]';
  }

  /**
   * Enable or disable logging entirely (for performance profiling)
   */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * Set whether to output to browser console
   */
  setConsoleOutput(enabled: boolean): void {
    this._consoleOutput = enabled;
  }

  /**
   * Check if two log entries are duplicates (same level, category, message, data)
   */
  private _isDuplicate(a: LogEntry, level: LogLevel, category: string, message: string, data?: unknown): boolean {
    return a.level === level &&
           a.category === category &&
           a.message === message &&
           JSON.stringify(a.data) === JSON.stringify(data);
  }

  /**
   * Log a message
   */
  log(level: LogLevel, category: string, message: string, data?: unknown): void {
    if (!this._enabled) return;

    // Check for duplicate of last entry
    const lastEntry = this._entries[this._entries.length - 1];
    if (lastEntry && this._isDuplicate(lastEntry, level, category, message, data)) {
      // Increment count on existing entry
      lastEntry.count++;
      lastEntry.timestamp = Date.now(); // Update timestamp to latest

      // Console output for dupe
      if (this._consoleOutput) {
        this._logToConsole(lastEntry);
      }

      // Schedule notification
      if (this._listeners.size > 0) {
        this._scheduleNotify();
      }
      return;
    }

    const entry: LogEntry = {
      id: this._nextId++,
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      count: 1,
    };

    // Add to buffer
    this._entries.push(entry);

    // Trim if over max (use splice to mutate in place, avoiding reallocation)
    if (this._entries.length > this._maxEntries) {
      this._entries.splice(0, this._entries.length - this._maxEntries);
    }

    // Console output
    if (this._consoleOutput) {
      this._logToConsole(entry);
    }

    // Schedule batched notification (skip if no listeners)
    if (this._listeners.size > 0) {
      this._scheduleNotify();
    }
  }

  /**
   * Convenience methods for each log level
   */
  debug(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.Debug, category, message, data);
  }

  info(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.Info, category, message, data);
  }

  warn(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.Warn, category, message, data);
  }

  error(category: string, message: string, data?: unknown): void {
    this.log(LogLevel.Error, category, message, data);
  }

  /**
   * Get all log entries
   */
  getEntries(): LogEntry[] {
    return [...this._entries];
  }

  /**
   * Get entries filtered by category
   */
  getEntriesByCategory(category: string): LogEntry[] {
    return this._entries.filter(e => e.category === category);
  }

  /**
   * Get entries filtered by level
   */
  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this._entries.filter(e => e.level === level);
  }

  /**
   * Clear all log entries
   */
  clear(): void {
    this._entries = [];
    // Notify immediately on clear (user action)
    this._notifyListeners();
  }

  /**
   * Subscribe to log updates
   * Returns unsubscribe function
   */
  subscribe(listener: LogListener): () => void {
    this._listeners.add(listener);
    // Immediately call with current logs (pass directly, don't copy)
    listener(this._entries);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Dispose the logger
   */
  dispose(): void {
    this._entries = [];
    this._listeners.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private _logToConsole(entry: LogEntry): void {
    const countStr = entry.count > 1 ? ` (x${entry.count})` : '';
    const prefix = `${this._consolePrefix}[${entry.category}]${countStr}`;
    const args: unknown[] = [prefix, entry.message];
    if (entry.data !== undefined) {
      args.push(entry.data);
    }

    switch (entry.level) {
      case LogLevel.Debug:
        console.debug(...args);
        break;
      case LogLevel.Info:
        console.log(...args);
        break;
      case LogLevel.Warn:
        console.warn(...args);
        break;
      case LogLevel.Error:
        console.error(...args);
        break;
    }
  }

  /**
   * Schedule a batched notification on next animation frame
   * This coalesces multiple rapid logs into a single UI update
   */
  private _scheduleNotify(): void {
    if (this._notifyScheduled) return;
    this._notifyScheduled = true;
    requestAnimationFrame(() => {
      this._notifyScheduled = false;
      this._notifyListeners();
    });
  }

  private _notifyListeners(): void {
    if (this._listeners.size === 0) return;
    // Pass entries directly (listeners should not mutate)
    const entries = this._entries;
    for (const listener of this._listeners) {
      try {
        listener(entries);
      } catch (e) {
        console.error('[TealchartLogger] Listener error:', e);
      }
    }
  }
}

/**
 * Categories for Tealchart logging
 */
export const LogCategory = {
  GapDetection: 'GapDetection',
  Datafeed: 'Datafeed',
  Bars: 'Bars',
  Render: 'Render',
  Indicators: 'Indicators',
  Layout: 'Layout',
  Widget: 'Widget',
} as const;

export type LogCategoryType = (typeof LogCategory)[keyof typeof LogCategory];
