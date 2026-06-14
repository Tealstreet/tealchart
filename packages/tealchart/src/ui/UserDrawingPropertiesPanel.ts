import type {
  UserDrawingPropertiesSurface,
  UserDrawingPropertiesSurfaceCommand,
  UserDrawingPropertiesSurfaceControl,
} from '../drawings';

import { Component } from './Component';
import { button, div, span } from './dom';

export interface UserDrawingPropertiesPanelOptions {
  surface: UserDrawingPropertiesSurface;
  onDispatch: (command: UserDrawingPropertiesSurfaceCommand) => boolean;
  onClose?: () => void;
}

interface UserDrawingPropertiesPanelState {
  surface: UserDrawingPropertiesSurface;
}

const styles = {
  panel: {
    position: 'fixed',
    top: '56px',
    right: '16px',
    width: '336px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'min(620px, calc(100vh - 72px))',
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
    minWidth: '0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
    padding: '8px',
  } as Partial<CSSStyleDeclaration>,
  empty: {
    padding: '28px 12px',
    color: '#787b86',
    textAlign: 'center',
  } as Partial<CSSStyleDeclaration>,
  group: {
    padding: '6px 0 10px',
    borderBottom: '1px solid rgba(120, 123, 134, 0.14)',
  } as Partial<CSSStyleDeclaration>,
  groupLabel: {
    padding: '0 2px 8px',
    color: '#787b86',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0',
    textTransform: 'uppercase',
  } as Partial<CSSStyleDeclaration>,
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  } as Partial<CSSStyleDeclaration>,
  controlButton: {
    minWidth: '32px',
    height: '30px',
    padding: '0 9px',
    border: '1px solid rgba(120, 123, 134, 0.22)',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: '#d1d4dc',
    cursor: 'pointer',
    fontSize: '12px',
  } as Partial<CSSStyleDeclaration>,
  controlButtonSelected: {
    borderColor: 'rgba(41, 98, 255, 0.72)',
    backgroundColor: 'rgba(41, 98, 255, 0.2)',
  } as Partial<CSSStyleDeclaration>,
  controlButtonDisabled: {
    opacity: '0.38',
    cursor: 'default',
  } as Partial<CSSStyleDeclaration>,
  swatch: {
    width: '18px',
    height: '18px',
    display: 'inline-block',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.42)',
    verticalAlign: 'middle',
  } as Partial<CSSStyleDeclaration>,
};

export class UserDrawingPropertiesPanel extends Component<UserDrawingPropertiesPanelState> {
  private readonly options: UserDrawingPropertiesPanelOptions;

  constructor(options: UserDrawingPropertiesPanelOptions) {
    super('div', { surface: options.surface }, { style: styles.panel });
    this.options = options;
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Drawing properties');
    this.el.addEventListener('mousedown', (event) => event.stopPropagation());
    this.el.addEventListener('mouseup', (event) => event.stopPropagation());
    this.el.addEventListener('click', (event) => event.stopPropagation());
    this.el.addEventListener('contextmenu', (event) => event.stopPropagation());
    this.mount(document.body);
  }

  updateSurface(surface: UserDrawingPropertiesSurface): void {
    this.setState({ surface });
  }

  close(): void {
    this.unmount();
    this.options.onClose?.();
  }

  protected render(): void {
    const { surface } = this.state;
    this.el.replaceChildren();
    this.el.appendChild(this.createHeader());
    const body = div({ style: styles.body });
    if (!surface.drawing || surface.groups.length === 0) {
      body.appendChild(div({ style: styles.empty, text: 'No editable drawing' }));
    } else {
      for (const group of surface.groups) {
        const controls = div({ style: styles.controls });
        for (const control of group.controls) {
          controls.appendChild(this.createControl(control));
        }
        body.appendChild(
          div({
            style: styles.group,
            children: [div({ style: styles.groupLabel, text: group.label }), controls],
          }),
        );
      }
    }
    this.el.appendChild(body);
  }

  private createHeader(): HTMLDivElement {
    const { surface } = this.state;
    const title = surface.drawing ? `${surface.drawing.kind} properties` : 'Drawing properties';
    const closeButton = button({
      style: styles.closeButton,
      text: 'x',
      attrs: { type: 'button', 'aria-label': 'Close drawing properties' },
      onClick: () => this.close(),
    });
    return div({
      style: styles.header,
      children: [span({ style: styles.title, text: title }), closeButton],
    });
  }

  private createControl(control: UserDrawingPropertiesSurfaceControl): HTMLButtonElement {
    const style = {
      ...styles.controlButton,
      ...(control.selected ? styles.controlButtonSelected : null),
      ...(!control.enabled ? styles.controlButtonDisabled : null),
    };
    const content =
      control.type === 'swatch'
        ? span({ style: { ...styles.swatch, backgroundColor: control.value }, attrs: { 'aria-hidden': 'true' } })
        : span({ text: control.icon ?? String(control.value) });
    return button({
      style,
      attrs: {
        type: 'button',
        'aria-label': control.label,
        'aria-pressed': String(control.selected),
        'aria-disabled': String(!control.enabled),
      },
      children: [content],
      onClick: () => {
        if (!control.enabled) return;
        this.options.onDispatch(control.command);
      },
    });
  }
}
