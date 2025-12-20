import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ContextMenuItem } from '../types';

interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
  /** Container bounds for flip detection (defaults to viewport) */
  containerBottom?: number;
}

const MENU_STYLES: React.CSSProperties = {
  position: 'fixed', // Use fixed positioning for screen coordinates
  backgroundColor: '#1e1e1e',
  border: '1px solid #333',
  borderRadius: '4px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  minWidth: '160px',
  zIndex: 1000,
  padding: '4px 0',
};

const ITEM_STYLES: React.CSSProperties = {
  padding: '8px 12px',
  cursor: 'pointer',
  color: '#e0e0e0',
  fontSize: '13px',
  whiteSpace: 'nowrap',
};

const ITEM_HOVER_STYLES: React.CSSProperties = {
  backgroundColor: '#2d2d2d',
};

const ITEM_DISABLED_STYLES: React.CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed',
};

const SEPARATOR_STYLES: React.CSSProperties = {
  height: '1px',
  backgroundColor: '#333',
  margin: '4px 0',
};

export const ContextMenu: React.FC<ContextMenuProps> = ({ items, x, y, onClose, containerBottom }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = React.useState<{ left: number; top: number }>({ left: x, top: y });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Delay adding listeners to prevent immediate close from the triggering click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position after render to keep menu in bounds
  React.useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const bottomBound = containerBottom ?? window.innerHeight;

      // Position menu to the LEFT of the trigger point
      let newX = x - rect.width - 5;
      if (newX < 5) newX = 5;

      // Flip up if would go below container bottom
      let newY = y;
      if (y + rect.height > bottomBound - 10) {
        newY = y - rect.height;
      }

      setAdjustedPosition({ left: newX, top: newY });
    }
  }, [x, y, containerBottom]);

  if (items.length === 0) {
    return null;
  }

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.enabled === false) {
      return;
    }
    item.click();
    onClose();
  };

  const menu = (
    <div
      ref={menuRef}
      style={{
        ...MENU_STYLES,
        left: adjustedPosition.left,
        top: adjustedPosition.top,
      }}
    >
      {items.map((item, index) => {
        // Separator
        if (item.text === '-') {
          return <div key={index} style={SEPARATOR_STYLES} />;
        }

        const isDisabled = item.enabled === false;

        return (
          <div
            key={index}
            style={{
              ...ITEM_STYLES,
              ...(isDisabled ? ITEM_DISABLED_STYLES : {}),
            }}
            onClick={() => handleItemClick(item)}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                Object.assign(e.currentTarget.style, ITEM_HOVER_STYLES);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
            }}
          >
            {item.text}
          </div>
        );
      })}
    </div>
  );

  // Render via portal to avoid parent transforms affecting fixed positioning
  return createPortal(menu, document.body);
};
