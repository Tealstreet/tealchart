import type {
  UserDrawingObjectTreeDispatchAction,
  UserDrawingObjectTreeModel,
  UserDrawingObjectTreeRow,
} from '../drawings';

import {
  resolveUserDrawingObjectTreeRowDispatchAction,
  USER_DRAWING_OBJECT_TREE_COMPACT_ACTION_LABELS,
  USER_DRAWING_OBJECT_TREE_RENDERED_ROW_ACTIONS,
} from '../drawings';
import { button, div, input, span } from './dom';

export interface UserDrawingObjectTreePanelOptions {
  model: UserDrawingObjectTreeModel;
  onDispatch: (action: UserDrawingObjectTreeDispatchAction) => boolean;
  onClose?: () => void;
}

const styles = {
  panel: {
    position: 'fixed',
    top: '56px',
    right: '16px',
    width: '320px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'min(560px, calc(100vh - 72px))',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(17, 19, 26, 0.96)',
    border: '1px solid rgba(120, 123, 134, 0.28)',
    borderRadius: '6px',
    boxShadow: '0 16px 44px rgba(0, 0, 0, 0.42)',
    color: '#d1d4dc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '12px',
    overflow: 'hidden',
    zIndex: '10020',
  } as Partial<CSSStyleDeclaration>,
  header: {
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 10px 0 12px',
    borderBottom: '1px solid rgba(120, 123, 134, 0.18)',
    backgroundColor: 'rgba(30, 34, 45, 0.86)',
  } as Partial<CSSStyleDeclaration>,
  title: {
    fontSize: '13px',
    fontWeight: '600',
  } as Partial<CSSStyleDeclaration>,
  closeButton: {
    width: '28px',
    height: '28px',
    border: '0',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '18px',
    lineHeight: '28px',
  } as Partial<CSSStyleDeclaration>,
  body: {
    overflowY: 'auto',
    padding: '6px',
  } as Partial<CSSStyleDeclaration>,
  empty: {
    padding: '28px 12px',
    color: '#787b86',
    textAlign: 'center',
  } as Partial<CSSStyleDeclaration>,
  groupLabel: {
    padding: '8px 8px 4px',
    color: '#787b86',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0',
    textTransform: 'uppercase',
  } as Partial<CSSStyleDeclaration>,
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minHeight: '38px',
    padding: '6px 6px 6px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
  } as Partial<CSSStyleDeclaration>,
  selectedRow: {
    backgroundColor: 'rgba(41, 98, 255, 0.2)',
    outline: '1px solid rgba(41, 98, 255, 0.36)',
  } as Partial<CSSStyleDeclaration>,
  rowText: {
    minWidth: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as Partial<CSSStyleDeclaration>,
  rowIcon: {
    width: '18px',
    color: '#9ca3af',
    textAlign: 'center',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,
  rowLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as Partial<CSSStyleDeclaration>,
  renameInput: {
    minWidth: '0',
    flex: '1',
    height: '26px',
    padding: '0 8px',
    border: '1px solid rgba(120, 123, 134, 0.42)',
    borderRadius: '4px',
    backgroundColor: 'rgba(7, 9, 14, 0.86)',
    color: '#d1d4dc',
    fontSize: '12px',
    outline: 'none',
  } as Partial<CSSStyleDeclaration>,
  rowMeta: {
    color: '#787b86',
    fontSize: '11px',
    marginLeft: '4px',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,
  rowActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: '4px',
  } as Partial<CSSStyleDeclaration>,
  actionButton: {
    minWidth: '26px',
    height: '26px',
    padding: '0 7px',
    border: '0',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '11px',
  } as Partial<CSSStyleDeclaration>,
  actionButtonDisabled: {
    opacity: '0.38',
    cursor: 'default',
  } as Partial<CSSStyleDeclaration>,
};

export class UserDrawingObjectTreePanel {
  private model: UserDrawingObjectTreeModel;
  private readonly options: UserDrawingObjectTreePanelOptions;
  private readonly el: HTMLDivElement;
  private editingDrawingId: string | null = null;
  private editingName = '';

  constructor(options: UserDrawingObjectTreePanelOptions) {
    this.options = options;
    this.model = options.model;
    this.el = div({
      style: styles.panel,
      attrs: {
        role: 'dialog',
        'aria-label': 'Drawing object tree',
      },
    });
    this.el.addEventListener('mousedown', (event) => event.stopPropagation());
    this.el.addEventListener('mouseup', (event) => event.stopPropagation());
    this.el.addEventListener('click', (event) => event.stopPropagation());
    this.el.addEventListener('contextmenu', (event) => event.stopPropagation());
    document.body.appendChild(this.el);
    this.render();
  }

  updateModel(model: UserDrawingObjectTreeModel): void {
    this.model = model;
    if (this.editingDrawingId && !this.model.rows.some((row) => row.drawingId === this.editingDrawingId)) {
      this.cancelRename();
      return;
    }
    this.render();
  }

  close(): void {
    this.el.remove();
    this.options.onClose?.();
  }

  private render(): void {
    this.el.replaceChildren();
    this.el.appendChild(this.createHeader());
    const body = div({ style: styles.body });
    if (this.model.rows.length === 0) {
      body.appendChild(div({ style: styles.empty, text: 'No drawings' }));
    } else {
      this.renderRows(body);
    }
    this.el.appendChild(body);
  }

  private createHeader(): HTMLDivElement {
    const closeButton = button({
      style: styles.closeButton,
      text: 'x',
      attrs: { type: 'button', 'aria-label': 'Close drawing object tree' },
      onClick: () => this.close(),
    });
    return div({
      style: styles.header,
      children: [
        span({
          style: styles.title,
          text: `Drawings (${this.model.drawingCount})`,
        }),
        closeButton,
      ],
    });
  }

  private renderRows(body: HTMLDivElement): void {
    const rowsById = new Map(this.model.rows.map((row) => [row.id, row]));
    const groups = this.model.groups?.length ? this.model.groups : undefined;
    if (!groups) {
      for (const row of this.model.rows) body.appendChild(this.createRow(row));
      return;
    }

    for (const group of groups) {
      body.appendChild(div({ style: styles.groupLabel, text: group.label }));
      for (const rowId of group.rowIds) {
        const row = rowsById.get(rowId);
        if (row) body.appendChild(this.createRow(row));
      }
    }
  }

  private createRow(row: UserDrawingObjectTreeRow): HTMLDivElement {
    const isEditing = this.editingDrawingId === row.drawingId;
    const rowEl = div({
      style: {
        ...styles.row,
        ...(row.selected ? styles.selectedRow : {}),
      },
      attrs: {
        role: 'button',
        tabindex: '0',
        'aria-label': `Select ${row.label}`,
        'aria-pressed': row.selected ? 'true' : 'false',
      },
      onClick: (event) => {
        if (isEditing) return;
        this.dispatchAndRefresh({ type: 'select', drawingId: row.drawingId, additive: event.ctrlKey || event.metaKey });
      },
      onKeyDown: (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this.dispatchAndRefresh({ type: 'select', drawingId: row.drawingId });
      },
    });

    rowEl.appendChild(
      div({
        style: styles.rowText,
        children: [
          span({ style: styles.rowIcon, text: row.icon }),
          isEditing
            ? input({
                style: styles.renameInput,
                value: this.editingName,
                attrs: {
                  type: 'text',
                  'aria-label': `Rename ${row.label}`,
                },
                onClick: (event) => event.stopPropagation(),
                onMouseDown: (event) => event.stopPropagation(),
                onInput: (event) => {
                  this.editingName = (event.currentTarget as HTMLInputElement).value;
                },
                onKeyDown: (event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    this.commitRename(row);
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    this.cancelRename();
                  }
                },
                ref: (el) => {
                  window.setTimeout(() => {
                    el.focus();
                    el.select();
                  }, 0);
                },
              })
            : span({ style: styles.rowLabel, text: row.label }),
          span({ style: styles.rowMeta, text: `${row.visible ? '' : 'hidden '}${row.locked ? 'locked' : ''}`.trim() }),
        ],
      }),
    );
    rowEl.appendChild(this.createRowActions(row));
    return rowEl;
  }

  private createRowActions(row: UserDrawingObjectTreeRow): HTMLDivElement {
    const actions = div({ style: styles.rowActions });
    if (this.editingDrawingId === row.drawingId) {
      actions.appendChild(
        button({
          style: styles.actionButton,
          text: 'Save',
          attrs: { type: 'button', 'aria-label': 'Save drawing name' },
          onClick: (event) => {
            event.stopPropagation();
            this.commitRename(row);
          },
        }),
      );
      actions.appendChild(
        button({
          style: styles.actionButton,
          text: 'Cancel',
          attrs: { type: 'button', 'aria-label': 'Cancel drawing rename' },
          onClick: (event) => {
            event.stopPropagation();
            this.cancelRename();
          },
        }),
      );
      return actions;
    }
    for (const actionType of USER_DRAWING_OBJECT_TREE_RENDERED_ROW_ACTIONS) {
      const descriptor = row.actions?.find((action) => action.type === actionType);
      if (!descriptor) continue;
      const enabled = descriptor.enabled;
      actions.appendChild(
        button({
          style: {
            ...styles.actionButton,
            ...(enabled ? {} : styles.actionButtonDisabled),
          },
          text: USER_DRAWING_OBJECT_TREE_COMPACT_ACTION_LABELS[actionType] ?? descriptor.label,
          attrs: {
            type: 'button',
            title: descriptor.label,
            'aria-label': descriptor.label,
            'aria-disabled': enabled ? 'false' : 'true',
          },
          onClick: enabled
            ? (event) => {
                event.stopPropagation();
                if (actionType === 'rename') {
                  this.beginRename(row);
                  return;
                }
                const action = resolveUserDrawingObjectTreeRowDispatchAction(row, actionType);
                if (action) this.dispatchAndRefresh(action);
              }
            : (event) => event.stopPropagation(),
        }),
      );
    }
    return actions;
  }

  private dispatchAndRefresh(action: UserDrawingObjectTreeDispatchAction): void {
    this.options.onDispatch(action);
  }

  private beginRename(row: UserDrawingObjectTreeRow): void {
    this.editingDrawingId = row.drawingId;
    this.editingName = row.customName ?? row.label;
    this.render();
  }

  private commitRename(row: UserDrawingObjectTreeRow): void {
    const action = resolveUserDrawingObjectTreeRowDispatchAction(row, 'rename', { name: this.editingName });
    if (!action) return;
    if (this.options.onDispatch(action)) {
      this.editingDrawingId = null;
      this.editingName = '';
      this.render();
    }
  }

  private cancelRename(): void {
    this.editingDrawingId = null;
    this.editingName = '';
    this.render();
  }
}
