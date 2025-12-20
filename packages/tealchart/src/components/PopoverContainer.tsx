/**
 * PopoverContainer - Shared popover/modal container for consistent styling
 */

import React, { memo, useCallback, useEffect } from 'react';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 40,
    zIndex: 1000,
  },
  container: {
    backgroundColor: 'var(--modal-bg, #1e222d)',
    borderRadius: 4,
    width: 280,
    maxHeight: 400,
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
    border: '1px solid var(--border, #363a45)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border, #363a45)',
    flexShrink: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text, #d1d4dc)',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    padding: 4,
    cursor: 'pointer',
    color: 'var(--text2, #787b86)',
    fontSize: 16,
    lineHeight: 1,
    borderRadius: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    padding: '8px',
    borderBottom: '1px solid var(--border, #363a45)',
    flexShrink: 0,
  },
  searchWrapper: {
    position: 'relative' as const,
  },
  searchIcon: {
    position: 'absolute' as const,
    left: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text3, #5d606b)',
    fontSize: 12,
    pointerEvents: 'none' as const,
  },
  searchInput: {
    width: '100%',
    padding: '6px 8px 6px 28px',
    backgroundColor: 'var(--input-bg, #2a2e39)',
    border: '1px solid var(--border, #363a45)',
    borderRadius: 3,
    color: 'var(--text, #d1d4dc)',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    minHeight: 0,
  },
  footer: {
    padding: '8px 12px',
    borderTop: '1px solid var(--border, #363a45)',
    flexShrink: 0,
  },
  footerButton: {
    width: '100%',
    padding: '6px 12px',
    backgroundColor: 'var(--accent, #2962ff)',
    color: '#fff',
    border: 'none',
    borderRadius: 3,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
};

// ============================================================================
// Props
// ============================================================================

export interface PopoverContainerProps {
  /** Whether the popover is open */
  isOpen: boolean;
  /** Callback to close the popover */
  onClose: () => void;
  /** Title shown in the header */
  title: string;
  /** Search placeholder text (if search is enabled) */
  searchPlaceholder?: string;
  /** Search value (controlled) */
  searchValue?: string;
  /** Search change handler */
  onSearchChange?: (value: string) => void;
  /** Footer button text (if footer is enabled) */
  footerButtonText?: string;
  /** Footer button click handler */
  onFooterButtonClick?: () => void;
  /** Content to render in the popover body */
  children: React.ReactNode;
  /** Custom width */
  width?: number;
  /** Custom max height */
  maxHeight?: number;
}

// ============================================================================
// Component
// ============================================================================

export const PopoverContainer: React.FC<PopoverContainerProps> = memo(({
  isOpen,
  onClose,
  title,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  footerButtonText,
  onFooterButtonClick,
  children,
  width = 280,
  maxHeight = 400,
}) => {
  // Handle overlay click (close popover)
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showSearch = searchPlaceholder && onSearchChange;
  const showFooter = footerButtonText && onFooterButtonClick;

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div
        style={{ ...styles.container, width, maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text, #d1d4dc)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text2, #787b86)')}
          >
            ×
          </button>
        </div>

        {/* Search */}
        {showSearch && (
          <div style={styles.searchContainer}>
            <div style={styles.searchWrapper}>
              <svg
                style={styles.searchIcon as React.CSSProperties}
                width="12"
                height="12"
                viewBox="0 0 18 18"
                fill="currentColor"
              >
                <path d="M12.5 11h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L17.49 16l-4.99-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
              </svg>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                style={styles.searchInput}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div style={styles.content}>
          {children}
        </div>

        {/* Footer */}
        {showFooter && (
          <div style={styles.footer}>
            <button
              style={styles.footerButton}
              onClick={onFooterButtonClick}
            >
              {footerButtonText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

PopoverContainer.displayName = 'PopoverContainer';

// Export styles for custom content styling
export const popoverStyles = {
  listItem: {
    padding: '6px 12px',
    cursor: 'pointer',
    color: 'var(--text, #d1d4dc)',
    fontSize: 13,
    transition: 'background-color 0.1s',
  },
  listItemHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.08))',
  },
  listItemActive: {
    backgroundColor: 'var(--accent-bg, rgba(41, 98, 255, 0.15))',
  },
  categoryHeader: {
    padding: '8px 12px 4px',
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text3, #5d606b)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
  },
  emptyState: {
    padding: '16px 12px',
    textAlign: 'center' as const,
    color: 'var(--text3, #5d606b)',
    fontSize: 12,
  },
  errorState: {
    padding: '12px',
    color: 'var(--error, #f23645)',
    fontSize: 12,
    backgroundColor: 'rgba(242, 54, 69, 0.1)',
    margin: 8,
    borderRadius: 4,
  },
  loadingState: {
    padding: '16px 12px',
    textAlign: 'center' as const,
    color: 'var(--text3, #5d606b)',
    fontSize: 12,
  },
  warningContainer: {
    padding: '8px 12px',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderBottom: '1px solid var(--border, #363a45)',
  },
  warningText: {
    fontSize: 11,
    color: 'var(--warning, #ff9800)',
    margin: 0,
  },
};
