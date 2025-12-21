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
   * Log a message
   */
  log(level: LogLevel, category: string, message: string, data?: unknown): void {
    if (!this._enabled) return;

    const entry: LogEntry = {
      id: this._nextId++,
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
    };

    // Add to buffer
    this._entries.push(entry);

    // Trim if over max
    if (this._entries.length > this._maxEntries) {
      this._entries = this._entries.slice(-this._maxEntries);
    }

    // Console output
    if (this._consoleOutput) {
      this._logToConsole(entry);
    }

    // Notify listeners
    this._notifyListeners();
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
    this._notifyListeners();
  }

  /**
   * Subscribe to log updates
   * Returns unsubscribe function
   */
  subscribe(listener: LogListener): () => void {
    this._listeners.add(listener);
    // Immediately call with current logs
    listener(this.getEntries());
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
    const prefix = `${this._consolePrefix}[${entry.category}]`;
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

  private _notifyListeners(): void {
    const entries = this.getEntries();
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
