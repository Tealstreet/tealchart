/**
 * DebugConsole - Debug log viewer for Tealchart
 *
 * Displays a dropdown button that opens an overlay showing debug logs.
 * Logs are captured even when the overlay is closed.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { LogEntry, LogLevel, TealchartLogger } from '../debug/TealchartLogger';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    border: 'none',
    borderRadius: 4,
    backgroundColor: 'transparent',
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 500,
    transition: 'background-color 0.15s, color 0.15s',
    whiteSpace: 'nowrap' as const,
  },
  buttonHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.05))',
    color: 'var(--text, #d1d4dc)',
  },
  buttonActive: {
    backgroundColor: 'var(--accent-bg, rgba(41, 98, 255, 0.2))',
    color: 'var(--accent, #2962ff)',
  },
  buttonWithErrors: {
    color: 'var(--error, #ef5350)',
  },
  icon: {
    fontSize: 12,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 16,
    height: 16,
    padding: '0 4px',
    borderRadius: 8,
    backgroundColor: 'var(--error, #ef5350)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 600,
  },
  overlay: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    marginTop: 4,
    width: 500,
    maxWidth: '90vw',
    maxHeight: 400,
    backgroundColor: 'var(--card-bg, #1e222d)',
    border: '1px solid var(--border, #363a45)',
    borderRadius: 6,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border, #363a45)',
    backgroundColor: 'var(--card-header-bg, #262a35)',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text, #d1d4dc)',
  },
  headerActions: {
    display: 'flex',
    gap: 8,
  },
  headerButton: {
    padding: '4px 8px',
    border: 'none',
    borderRadius: 4,
    backgroundColor: 'transparent',
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 500,
    transition: 'background-color 0.15s, color 0.15s',
  },
  headerButtonHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.1))',
    color: 'var(--text, #d1d4dc)',
  },
  logList: {
    flex: 1,
    overflow: 'auto',
    padding: 8,
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    fontSize: 11,
    lineHeight: 1.5,
  },
  logEntry: {
    padding: '2px 4px',
    borderRadius: 2,
    marginBottom: 2,
    wordBreak: 'break-word' as const,
  },
  logEntryDebug: {
    color: 'var(--text2, #787b86)',
  },
  logEntryInfo: {
    color: 'var(--text, #d1d4dc)',
  },
  logEntryWarn: {
    color: '#ff9800',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  logEntryError: {
    color: '#ef5350',
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
  },
  timestamp: {
    color: 'var(--text2, #787b86)',
    marginRight: 8,
  },
  category: {
    color: 'var(--accent, #2962ff)',
    marginRight: 8,
    fontWeight: 600,
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    color: 'var(--text2, #787b86)',
    fontSize: 12,
  },
};

// ============================================================================
// Props
// ============================================================================

export interface DebugConsoleProps {
  /** The logger instance to display */
  logger: TealchartLogger | null;
}

// ============================================================================
// Component
// ============================================================================

export const DebugConsole: React.FC<DebugConsoleProps> = memo(({ logger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [buttonHovered, setButtonHovered] = useState(false);
  const [clearHovered, setClearHovered] = useState(false);
  const logListRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to logger updates
  useEffect(() => {
    if (!logger) {
      setLogs([]);
      return;
    }

    return logger.subscribe((entries) => {
      setLogs(entries);
    });
  }, [logger]);

  // Auto-scroll to bottom when new logs arrive and overlay is open
  useEffect(() => {
    if (isOpen && logListRef.current) {
      logListRef.current.scrollTop = logListRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleClear = useCallback(() => {
    logger?.clear();
  }, [logger]);

  const formatTimestamp = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    } as Intl.DateTimeFormatOptions);
  };

  const getLogStyle = (level: LogLevel) => {
    switch (level) {
      case LogLevel.Debug:
        return { ...styles.logEntry, ...styles.logEntryDebug };
      case LogLevel.Info:
        return { ...styles.logEntry, ...styles.logEntryInfo };
      case LogLevel.Warn:
        return { ...styles.logEntry, ...styles.logEntryWarn };
      case LogLevel.Error:
        return { ...styles.logEntry, ...styles.logEntryError };
      default:
        return styles.logEntry;
    }
  };

  // Count errors and warnings
  const errorCount = logs.filter(l => l.level === LogLevel.Error).length;
  const warnCount = logs.filter(l => l.level === LogLevel.Warn).length;
  const hasIssues = errorCount > 0 || warnCount > 0;

  if (!logger) return null;

  return (
    <div ref={containerRef} style={styles.container}>
      {/* Toggle button */}
      <button
        style={{
          ...styles.button,
          ...(buttonHovered ? styles.buttonHover : {}),
          ...(isOpen ? styles.buttonActive : {}),
          ...(hasIssues && !isOpen ? styles.buttonWithErrors : {}),
        }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setButtonHovered(true)}
        onMouseLeave={() => setButtonHovered(false)}
        title="Debug Console"
      >
        <span style={styles.icon}>🐛</span>
        <span>Debug</span>
        {errorCount > 0 && (
          <span style={styles.badge}>{errorCount}</span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div style={styles.overlay}>
          <div style={styles.header}>
            <span style={styles.headerTitle}>
              Debug Console ({logs.length} entries)
            </span>
            <div style={styles.headerActions}>
              <button
                style={{
                  ...styles.headerButton,
                  ...(clearHovered ? styles.headerButtonHover : {}),
                }}
                onClick={handleClear}
                onMouseEnter={() => setClearHovered(true)}
                onMouseLeave={() => setClearHovered(false)}
              >
                Clear
              </button>
            </div>
          </div>

          <div ref={logListRef} style={styles.logList}>
            {logs.length === 0 ? (
              <div style={styles.emptyState}>No logs yet</div>
            ) : (
              logs.map((entry) => (
                <div key={entry.id} style={getLogStyle(entry.level)}>
                  <span style={styles.timestamp}>{formatTimestamp(entry.timestamp)}</span>
                  <span style={styles.category}>[{entry.category}]</span>
                  <span>{entry.message}</span>
                  {entry.data !== undefined && (
                    <span style={{ marginLeft: 8, opacity: 0.7 }}>
                      {typeof entry.data === 'object'
                        ? JSON.stringify(entry.data)
                        : String(entry.data)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

DebugConsole.displayName = 'DebugConsole';
