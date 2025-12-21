/**
 * DebugConsole - Debug log viewer for Tealchart
 *
 * Displays a dropdown button that opens an overlay showing debug logs.
 * Logs are captured even when the overlay is closed.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    alignItems: 'center',
  },
  dragHandle: {
    cursor: 'move',
    padding: '0 8px',
    color: 'var(--text2, #787b86)',
    userSelect: 'none' as const,
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
    userSelect: 'text' as const,
    cursor: 'text',
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
  dupeCount: {
    marginLeft: 6,
    padding: '0 4px',
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: 'var(--text2, #787b86)',
    fontSize: 10,
    fontWeight: 500,
  },
  filterContainer: {
    padding: '4px 12px 8px',
    borderBottom: '1px solid var(--border, #363a45)',
  },
  filterInput: {
    width: '100%',
    padding: '4px 8px',
    border: '1px solid var(--border, #363a45)',
    borderRadius: 4,
    backgroundColor: 'var(--input-bg, #1e222d)',
    color: 'var(--text, #d1d4dc)',
    fontSize: 11,
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    outline: 'none',
  },
  resizeHandle: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    cursor: 'se-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text2, #787b86)',
    fontSize: 18,
    userSelect: 'none' as const,
    backgroundColor: 'var(--card-header-bg, #262a35)',
    borderTopLeftRadius: 4,
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
  const [copyHovered, setCopyHovered] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState({ top: 0, left: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [overlaySize, setOverlaySize] = useState({ width: 500, height: 400 });
  const [filter, setFilter] = useState('');
  const logListRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Subscribe to logger updates (only when overlay is open to save perf)
  useEffect(() => {
    if (!logger || !isOpen) {
      return;
    }

    return logger.subscribe((entries) => {
      // Copy array for React state (logger passes internal array directly)
      setLogs([...entries]);
    });
  }, [logger, isOpen]);

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

  const handleToggle = useCallback(() => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setOverlayPosition({
        top: rect.bottom + 4,
        left: Math.max(8, rect.left),
      });
    }
    setIsOpen(!isOpen);
  }, [isOpen]);

  // Copy logs to clipboard
  const handleCopy = useCallback(() => {
    const text = logs.map(entry => {
      const time = new Date(entry.timestamp).toISOString();
      const data = entry.data !== undefined ? ` ${JSON.stringify(entry.data)}` : '';
      return `${time} [${entry.level}] [${entry.category}] ${entry.message}${data}`;
    }).join('\n');
    navigator.clipboard.writeText(text);
  }, [logs]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - overlayPosition.left,
      y: e.clientY - overlayPosition.top,
    });
  }, [overlayPosition]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setOverlayPosition({
        top: e.clientY - dragOffset.y,
        left: e.clientX - dragOffset.x,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Min size only, no max bounds
      const newWidth = Math.max(300, e.clientX - overlayPosition.left);
      const newHeight = Math.max(200, e.clientY - overlayPosition.top);
      setOverlaySize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, overlayPosition]);

  // Filter logs: +term includes, -term excludes, plain term includes
  const filteredLogs = useMemo(() => {
    if (!filter.trim()) return logs;

    const terms = filter.split(/\s+/).filter(Boolean);
    const includes: string[] = [];
    const excludes: string[] = [];

    terms.forEach(term => {
      if (term.startsWith('-') && term.length > 1) {
        excludes.push(term.slice(1).toLowerCase());
      } else if (term.startsWith('+') && term.length > 1) {
        includes.push(term.slice(1).toLowerCase());
      } else {
        includes.push(term.toLowerCase());
      }
    });

    return logs.filter(entry => {
      const text = `${entry.category} ${entry.message} ${entry.data !== undefined ? JSON.stringify(entry.data) : ''}`.toLowerCase();

      // Check excludes first
      for (const ex of excludes) {
        if (text.includes(ex)) return false;
      }

      // If no includes specified, show all (that weren't excluded)
      if (includes.length === 0) return true;

      // Check includes - must match at least one
      for (const inc of includes) {
        if (text.includes(inc)) return true;
      }
      return false;
    });
  }, [logs, filter]);

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
        ref={buttonRef}
        style={{
          ...styles.button,
          ...(buttonHovered ? styles.buttonHover : {}),
          ...(isOpen ? styles.buttonActive : {}),
          ...(hasIssues && !isOpen ? styles.buttonWithErrors : {}),
        }}
        onClick={handleToggle}
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

      {/* Overlay - uses fixed positioning to escape overflow:hidden containers */}
      {isOpen && (
        <div
          ref={overlayRef}
          style={{
            ...styles.overlay,
            position: 'fixed',
            top: overlayPosition.top,
            left: overlayPosition.left,
            width: overlaySize.width,
            height: overlaySize.height,
            maxWidth: 'none',
            maxHeight: 'none',
          }}
        >
          <div style={styles.header}>
            {/* Drag handle */}
            <span
              style={styles.dragHandle}
              onMouseDown={handleDragStart}
              title="Drag to move"
            >
              ⋮⋮
            </span>
            <span style={styles.headerTitle}>
              Debug ({filteredLogs.length}/{logs.length})
            </span>
            <div style={styles.headerActions}>
              <button
                style={{
                  ...styles.headerButton,
                  ...(copyHovered ? styles.headerButtonHover : {}),
                }}
                onClick={handleCopy}
                onMouseEnter={() => setCopyHovered(true)}
                onMouseLeave={() => setCopyHovered(false)}
                title="Copy all logs to clipboard"
              >
                Copy
              </button>
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

          {/* Filter input */}
          <div style={styles.filterContainer}>
            <input
              type="text"
              style={styles.filterInput}
              placeholder="Filter: term, +include, -exclude"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div ref={logListRef} style={styles.logList}>
            {filteredLogs.length === 0 ? (
              <div style={styles.emptyState}>
                {logs.length === 0 ? 'No logs yet' : 'No matching logs'}
              </div>
            ) : (
              filteredLogs.map((entry) => (
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
                  {entry.count > 1 && (
                    <span style={styles.dupeCount}>×{entry.count}</span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Resize handle */}
          <div
            style={styles.resizeHandle}
            onMouseDown={handleResizeStart}
            title="Drag to resize"
          >
            ⌟
          </div>
        </div>
      )}
    </div>
  );
});

DebugConsole.displayName = 'DebugConsole';
