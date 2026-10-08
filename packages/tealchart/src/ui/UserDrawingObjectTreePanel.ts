import type {
  UserDrawingObjectTreeDispatchAction,
  UserDrawingObjectTreeModel,
  UserDrawingObjectTreeRow,
} from '../drawings';

import {
  resolveUserDrawingObjectTreeRowDispatchAction,
  USER_DRAWING_OBJECT_TREE_BUILT_IN_ROW_ACTIONS,
  USER_DRAWING_OBJECT_TREE_COMPACT_ACTION_LABELS,
} from '../drawings';
import type { RenderOptions } from '../types';
import { applyChromeThemeVars } from './chromeTheme';
import { button, div, input, span } from './dom';
import { showWebOverlayError, type WebOverlayHost, type WebOverlayHostFactory } from './OverlayHost';

export interface UserDrawingObjectTreePanelOptions {
  model: UserDrawingObjectTreeModel;
  /** Chart overlay layer to mount into. The panel is chart-contained, not viewport-level. */
  parent: HTMLElement;
  onDispatch: (action: UserDrawingObjectTreeDispatchAction) => boolean;
  onClose?: () => void;
  renderOptions?: Partial<RenderOptions>;
  overlayHost?: WebOverlayHostFactory;
}

const styles = {
  panel: {
    // Chart-contained, like every other panel. Anchored to the chart's overlay
    // layer rather than the viewport, or it lands outside the chart entirely on
    // any page where the chart is not full-bleed.
    position: 'absolute',
    top: '56px',
    right: '16px',
    width: '320px',
    maxWidth: 'calc(100% - 32px)',
    maxHeight: 'calc(100% - 72px)',
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--tc-popover-bg, var(--tc-canvas-bg, rgba(17, 19, 26, 0.96)))',
    border: '1px solid var(--tc-border, rgba(120, 123, 134, 0.28))',
    borderRadius: '6px',
    boxShadow: '0 16px 44px rgba(0, 0, 0, 0.42)',
    color: 'var(--tc-text, #d1d4dc)',
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
    borderBottom: '1px solid var(--tc-border, rgba(120, 123, 134, 0.18))',
    backgroundColor: 'var(--tc-input-bg, rgba(30, 34, 45, 0.86))',
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
    color: 'var(--tc-text2, #9ca3af)',
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
    color: 'var(--tc-text3, #787b86)',
    textAlign: 'center',
  } as Partial<CSSStyleDeclaration>,
  groupLabel: {
    padding: '8px 8px 4px',
    color: 'var(--tc-text3, #787b86)',
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
    backgroundColor: 'var(--tc-accent-bg, rgba(41, 98, 255, 0.2))',
    outline: '1px solid var(--tc-accent, rgba(41, 98, 255, 0.36))',
  } as Partial<CSSStyleDeclaration>,
  rowText: {
    minWidth: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as Partial<CSSStyleDeclaration>,
  rowIcon: {
    width: '18px',
    color: 'var(--tc-text2, #9ca3af)',
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
    border: '1px solid var(--tc-border, rgba(120, 123, 134, 0.42))',
    borderRadius: '4px',
    backgroundColor: 'var(--tc-menu-bg, var(--tc-canvas-bg, rgba(7, 9, 14, 0.86)))',
    color: 'var(--tc-text, #d1d4dc)',
    fontSize: '12px',
    outline: 'none',
  } as Partial<CSSStyleDeclaration>,
  rowMeta: {
    color: 'var(--tc-text3, #787b86)',
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
    color: 'var(--tc-text2, #9ca3af)',
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
  private host?: WebOverlayHost;
  private hostCleanup: Array<() => void> = [];
  private closed = false;

  constructor(options: UserDrawingObjectTreePanelOptions) {
    this.options = options;
    this.model = options.model;
    this.el = div({
      style: styles.panel,
      attrs: {
        role: 'dialog',
        'aria-label': 'Drawing object tree',
        'data-tealchart-user-drawing-object-tree-panel': 'true',
      },
    });
    applyChromeThemeVars(this.el, options.renderOptions);
    this.el.addEventListener('mousedown', (event) => event.stopPropagation());
    this.el.addEventListener('mouseup', (event) => event.stopPropagation());
    this.el.addEventListener('click', (event) => event.stopPropagation());
    this.el.addEventListener('contextmenu', (event) => event.stopPropagation());
    this.render();
    if (options.overlayHost) this.mountHosted();
    else options.parent.appendChild(this.el);
  }

  /** Re-apply theme vars explicitly; the overlay layer does not restyle children. */
  setRenderOptions(renderOptions: Partial<RenderOptions> | undefined): void {
    applyChromeThemeVars(this.el, renderOptions);
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
    if (this.closed) return;
    this.closed = true;
    this.hostCleanup.forEach((cleanup) => cleanup());
    this.host?.dispose();
    this.el.remove();
    this.options.onClose?.();
  }

  getElement(): HTMLElement { return this.el; }

  private mountHosted(): void {
    const source = this.options.parent;
    const failed = (error: string) => queueMicrotask(() => { if (!this.closed) { showWebOverlayError(source, error); this.close(); } });
    try {
      const host = this.options.overlayHost!({ kind: 'floating', source, onError: failed });
      this.host = host;
      void host.ready.then((environment) => {
        if (this.closed || this.host !== host) return;
        const position = () => {
          const rect = host.sourceRect();
          const width = Math.min(320, Math.max(0, rect.width - 32));
          const point = environment.targetPoint({ x: rect.x + rect.width - width - 16, y: rect.y + 56 });
          Object.assign(this.el.style, { position: 'fixed', left: `${point.x}px`, top: `${point.y}px`, right: 'auto',
            width: `${width}px`, maxWidth: `${width}px`, maxHeight: `${Math.max(0, rect.height - 72)}px` });
        };
        environment.portalRoot.append(this.el);
        position();
        host.setContent(this.el);
        this.hostCleanup.push(host.subscribeInput((input) => {
          if (input.type === 'keydown' && input.inside && (!input.sourceId || input.sourceId === host.surfaceId) && (input.event as KeyboardEvent).key === 'Escape') {
            input.event.preventDefault();
            this.close();
          }
        }));
        const owner = environment.sourceWindow;
        owner.addEventListener('resize', position);
        owner.addEventListener('scroll', position, true);
        const Resize = (owner as Window & typeof globalThis).ResizeObserver;
        const resize = Resize ? new Resize(position) : undefined;
        resize?.observe(source);
        this.hostCleanup.push(() => owner.removeEventListener('resize', position),
          () => owner.removeEventListener('scroll', position, true), () => resize?.disconnect());
      }).catch((error: unknown) => failed(error instanceof Error ? error.message : String(error)));
    } catch (error) { failed(error instanceof Error ? error.message : String(error)); }
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
    const actions = div({
      style: styles.rowActions,
      attrs: { 'data-tealchart-user-drawing-object-tree-row-actions': row.drawingId },
    });
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
    for (const actionType of USER_DRAWING_OBJECT_TREE_BUILT_IN_ROW_ACTIONS) {
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
