import type {
  AnalysisRequestIntent,
  AnalysisSelectionFrame,
  AnalysisSelectionState,
} from '../analysis/analysisSelection';

import { AnalysisSelection, analysisSelectionXAtTime } from '../analysis/analysisSelection';
import { button, div, icons } from './dom';

const CONTROLS_FADE_MS = 160;

export interface AnalysisSelectorOptions {
  container: HTMLElement;
  getFrame: () => AnalysisSelectionFrame | null;
  canStart: () => boolean;
  getControlsLeft?: () => number;
  controlsLeftTransition?: string;
  onAnalysisRequest?: (intent: AnalysisRequestIntent) => void;
  acceptsEvent?: (event: Event) => boolean;
  onActiveChange?: (active: boolean) => void;
}

export class AnalysisSelector {
  private readonly root = div({ style: { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '12' } });
  private readonly toolbar = div({
    style: {
      position: 'absolute',
      display: 'flex',
      gap: '4px',
      pointerEvents: 'auto',
      flexWrap: 'wrap',
      overflow: 'auto',
    },
  });
  private readonly surface = div({
    attrs: { 'aria-label': 'Select chart pattern', tabindex: '0' },
    style: {
      position: 'absolute',
      display: 'none',
      pointerEvents: 'auto',
      cursor: 'crosshair',
      touchAction: 'none',
      outline: 'none',
    },
  });
  private readonly highlight = div({
    style: {
      position: 'absolute',
      pointerEvents: 'none',
      border: '1px solid #34b4ac',
      background: 'rgba(52,180,172,0.18)',
    },
  });
  private readonly actions = div({
    style: {
      position: 'absolute',
      display: 'none',
      gap: '4px',
      pointerEvents: 'auto',
      flexWrap: 'wrap',
      overflow: 'auto',
    },
  });
  private readonly message = div({
    attrs: { role: 'status' },
    style: {
      position: 'absolute',
      display: 'none',
      maxWidth: '90%',
      padding: '6px 8px',
      borderRadius: '4px',
      pointerEvents: 'none',
    },
  });
  private active = false;
  private readonly selection = new AnalysisSelection((state) => {
    if (this.active !== state.active) {
      this.active = state.active;
      this.options.onActiveChange?.(state.active);
    }
    this.render(this.selection.getState());
  });
  private handler?: (intent: AnalysisRequestIntent) => void;
  private pointerId?: number;
  private disposed = false;
  private focusingSelection = false;
  private controlsVisible = false;
  private controlsFocused = false;
  private hideTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly options: AnalysisSelectorOptions) {
    this.handler = options.onAnalysisRequest;
    for (const controls of [this.toolbar, this.actions, this.message])
      controls.style.transition = options.controlsLeftTransition ?? '';
    const select = this.control('Select pattern', () => this.start());
    select.prepend(icons.analysisWand(14));
    Object.assign(select.style, { display: 'flex', alignItems: 'center', gap: '4px' });
    this.toolbar.append(
      this.control('Analyze chart', () => this.request('describe')),
      select,
    );
    this.actions.append(
      this.control('Describe this TA pattern', () => this.request('describe', true)),
      this.control('Find similar TA', () => this.request('similar', true)),
      this.control('Cancel', () => this.dismiss()),
    );
    this.root.append(this.surface, this.highlight, this.toolbar, this.actions, this.message);
    this.root.dataset.tealchartAnalysisSelector = '';
    options.container.append(this.root);
    for (const name of [
      'pointerdown',
      'pointerup',
      'pointermove',
      'mousedown',
      'mouseup',
      'mousemove',
      'click',
      'dblclick',
      'contextmenu',
      'wheel',
      'touchstart',
      'touchmove',
      'touchend',
    ])
      this.root.addEventListener(name, this.contain);
    this.surface.addEventListener('pointerdown', this.pointerDown);
    window.addEventListener('pointermove', this.pointerMove, true);
    window.addEventListener('pointerup', this.pointerUp, true);
    window.addEventListener('pointercancel', this.pointerCancel, true);
    window.addEventListener('blur', this.blur);
    document.addEventListener('keydown', this.keyDown, true);
    document.addEventListener('pointerdown', this.outsideInput, true);
    document.addEventListener('focusin', this.outsideInput, true);
    document.addEventListener('focusout', this.focusOut, true);
    document.addEventListener('pointerout', this.pointerOut, true);
    this.update();
  }

  setHandler(handler: ((intent: AnalysisRequestIntent) => void) | undefined): void {
    if (this.disposed) return;
    this.handler = handler;
    if (!handler) {
      this.clearHideTimer();
      this.controlsVisible = false;
      this.cancel();
    }
    this.update();
  }

  update(): void {
    if (this.disposed) return;
    this.selection.updateFrame(this.options.getFrame());
    this.render(this.selection.getState());
  }

  setColors(background: string, text: string, border: string): void {
    for (const control of this.root.querySelectorAll<HTMLButtonElement>('button'))
      Object.assign(control.style, { background, color: text, border: `1px solid ${border}` });
    Object.assign(this.message.style, { background, color: text, border: `1px solid ${border}` });
  }

  start(): boolean {
    if (!this.handler || this.disposed) return false;
    this.update();
    if (!this.options.canStart()) {
      this.selection.cancel('Finish the current chart gesture before selecting a pattern.');
      return false;
    }
    const started = this.selection.start();
    if (started && this.isActive()) {
      this.focusingSelection = true;
      try {
        this.surface.focus({ preventScroll: true });
      } finally {
        this.focusingSelection = false;
      }
    }
    return started && this.isActive();
  }

  isActive(): boolean {
    return !this.disposed && this.selection.getState().active;
  }

  cancel(message?: string): void {
    this.pointerId = undefined;
    this.selection.cancel(message);
  }

  leave(message?: string): void {
    if (this.isActive()) this.cancel(message);
    this.scheduleHide();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.handler = undefined;
    this.cancel();
    this.clearHideTimer();
    window.removeEventListener('pointermove', this.pointerMove, true);
    window.removeEventListener('pointerup', this.pointerUp, true);
    window.removeEventListener('pointercancel', this.pointerCancel, true);
    window.removeEventListener('blur', this.blur);
    document.removeEventListener('keydown', this.keyDown, true);
    document.removeEventListener('pointerdown', this.outsideInput, true);
    document.removeEventListener('focusin', this.outsideInput, true);
    document.removeEventListener('focusout', this.focusOut, true);
    document.removeEventListener('pointerout', this.pointerOut, true);
    this.root.remove();
  }

  private control(label: string, action: () => void): HTMLButtonElement {
    return button({
      text: label,
      attrs: { type: 'button', 'aria-label': label },
      style: {
        font: 'inherit',
        fontSize: '11px',
        borderRadius: '4px',
        padding: '5px 7px',
        cursor: 'pointer',
        whiteSpace: 'normal',
        minWidth: '0',
        maxWidth: '100%',
        flexShrink: '1',
        overflowWrap: 'anywhere',
      },
      onClick: (event) => {
        event.stopPropagation();
        if (!this.acceptsEvent(event)) {
          event.preventDefault();
          return;
        }
        action();
      },
    });
  }

  private request(action: AnalysisRequestIntent['action'], selected = false): void {
    if (this.disposed || !this.handler) return;
    this.update();
    const range = this.selection.getState().range;
    if (selected && (!this.selection.getState().active || !range || range.to <= range.from)) return;
    if (selected) this.selection.finish();
    else this.selection.cancel();
    this.handler?.({ action, ...(selected && range ? { range: { ...range } } : {}) });
  }

  private render(state: AnalysisSelectionState): void {
    if (!state.active) this.pointerId = undefined;
    const frame = this.selection.getFrame();
    this.root.style.display = this.handler ? 'block' : 'none';
    this.renderToolbarVisibility(state.active);
    this.actions.style.display = state.active ? 'flex' : 'none';
    const controlsLeft = Math.max((frame?.plot.left ?? 0) + 32, this.options.getControlsLeft?.() ?? 0);
    this.toolbar.style.left = `${controlsLeft}px`;
    if (frame)
      for (const controls of [this.toolbar, this.actions, this.message])
        Object.assign(controls.style, {
          maxWidth: `${Math.max(0, frame.plot.left + frame.plot.width - controlsLeft - 6)}px`,
          maxHeight: `${Math.max(0, frame.plot.height - 12)}px`,
        });
    const activeControls = state.active ? this.actions : this.toolbar;
    this.controlsFocused = this.handler !== undefined && document.activeElement instanceof Node &&
      activeControls.contains(document.activeElement);
    const controlsTop = frame
      ? Math.max(frame.plot.top + 6, frame.plot.top + frame.plot.height - (activeControls.offsetHeight || 30) - 6)
      : 6;
    this.toolbar.style.top = `${controlsTop}px`;
    this.surface.style.display = state.active && frame ? 'block' : 'none';
    this.message.textContent =
      state.message ?? (state.active && !state.range ? 'Drag across a pattern on the main chart.' : '');
    this.message.style.display = this.message.textContent ? 'block' : 'none';
    this.highlight.style.display = state.range ? 'block' : 'none';
    if (!frame) return;
    Object.assign(this.surface.style, {
      left: `${frame.plot.left}px`,
      top: `${frame.plot.top}px`,
      width: `${frame.plot.width}px`,
      height: `${frame.plot.height}px`,
    });
    this.actions.style.left = `${controlsLeft}px`;
    this.actions.style.top = `${controlsTop}px`;
    this.message.style.left = `${controlsLeft}px`;
    this.message.style.top = `${Math.max(frame.plot.top + 6, controlsTop - 38)}px`;
    for (const control of this.actions.querySelectorAll<HTMLButtonElement>('button'))
      control.disabled = control.textContent !== 'Cancel' && !state.range;
    if (state.range) {
      const left = Math.max(
        frame.plot.left,
        Math.min(frame.plot.left + frame.plot.width, analysisSelectionXAtTime(frame, state.range.from)),
      );
      const right = Math.max(
        frame.plot.left,
        Math.min(frame.plot.left + frame.plot.width, analysisSelectionXAtTime(frame, state.range.to)),
      );
      Object.assign(this.highlight.style, {
        left: `${left}px`,
        top: `${frame.plot.top}px`,
        width: `${right - left}px`,
        height: `${frame.plot.height}px`,
        boxSizing: 'border-box',
      });
    }
  }

  // Fades rather than toggling display; visibility follows the fade out so hidden controls leave the tab order.
  private renderToolbarVisibility(selecting: boolean): void {
    const shown = !selecting && this.controlsVisible;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const fade = reducedMotion ? [] : [`opacity ${CONTROLS_FADE_MS}ms ease`, `visibility 0s linear ${shown ? 0 : CONTROLS_FADE_MS}ms`];
    Object.assign(this.toolbar.style, {
      display: selecting ? 'none' : 'flex',
      opacity: shown ? '1' : '0',
      visibility: shown ? 'visible' : 'hidden',
      pointerEvents: shown ? 'auto' : 'none',
      transition: [this.options.controlsLeftTransition, ...fade].filter(Boolean).join(', '),
    });
  }

  private localPoint(event: PointerEvent): { x: number; y: number } {
    const rect = this.options.container.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * (this.options.container.clientWidth || rect.width)) / rect.width,
      y: ((event.clientY - rect.top) * (this.options.container.clientHeight || rect.height)) / rect.height,
    };
  }

  private readonly contain = (event: Event): void => {
    event.stopPropagation();
    if (!this.acceptsEvent(event) || event.type === 'contextmenu' || event.type === 'wheel') event.preventDefault();
  };
  private readonly pointerDown = (event: PointerEvent): void => {
    if (!this.acceptsEvent(event) || event.button !== 0 || this.pointerId !== undefined) return;
    event.preventDefault();
    event.stopPropagation();
    this.update();
    const point = this.localPoint(event);
    if (this.selection.begin(point.x, point.y)) this.pointerId = event.pointerId;
  };
  private readonly pointerMove = (event: PointerEvent): void => {
    if (!this.acceptsEvent(event)) return;
    const frame = this.selection.getFrame();
    const point = this.localPoint(event);
    const rect = this.options.container.getBoundingClientRect();
    const plot = frame?.plot ?? {
      left: 0, top: 0,
      width: this.options.container.clientWidth || rect.width,
      height: this.options.container.clientHeight || rect.height,
    };
    const inside = point.x >= plot.left && point.x <= plot.left + plot.width &&
      point.y >= plot.top && point.y <= plot.top + plot.height;
    if (inside || (event.target instanceof Node && this.root.contains(event.target))) this.showControls();
    else this.scheduleHide();
    if (this.pointerId === undefined || this.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.update();
    this.selection.move(this.localPoint(event).x);
  };
  private readonly pointerUp = (event: PointerEvent): void => {
    if (!this.acceptsEvent(event) || this.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.update();
    this.selection.end(this.localPoint(event).x);
    this.pointerId = undefined;
  };
  private readonly pointerCancel = (event: PointerEvent): void => {
    if (!this.acceptsEvent(event)) return;
    if (this.pointerId === event.pointerId) this.cancel('Pattern selection was interrupted. Select the pattern again.');
  };
  private readonly blur = (event: Event): void => {
    if (!this.acceptsEvent(event) || this.focusingSelection || event.target instanceof Element) return;
    this.controlsFocused = false;
    this.scheduleHide();
    if (this.selection.getState().active) this.cancel('Selection cancelled because the chart lost focus.');
  };
  private readonly outsideInput = (event: Event): void => {
    if (!this.acceptsEvent(event)) return;
    if (event.type === 'focusin') {
      this.controlsFocused = event.target instanceof Node &&
        (this.toolbar.contains(event.target) || this.actions.contains(event.target));
      if (this.controlsFocused) this.showControls();
      else this.scheduleHide();
    }
    if (
      this.selection.getState().active &&
      event.target instanceof Node &&
      !this.root.contains(event.target)
    )
      this.cancel('Selection cancelled because the chart lost focus.');
  };
  private readonly keyDown = (event: KeyboardEvent): void => {
    if (!this.acceptsEvent(event)) return;
    const state = this.selection.getState();
    if (event.key === 'Escape' && (state.active || state.range)) {
      if (state.active) {
        event.stopPropagation();
        event.preventDefault();
      }
      this.dismiss();
      return;
    }
    if (!state.active) return;
    if (
      event.target instanceof Element &&
      !this.root.contains(event.target) &&
      event.target.closest('input,textarea,[contenteditable="true"]')
    ) {
      this.cancel('Selection cancelled because the chart lost focus.');
      return;
    }
    event.stopPropagation();
    const buttonKey =
      event.target instanceof HTMLButtonElement &&
      this.root.contains(event.target) &&
      ['Enter', ' '].includes(event.key);
    if (event.key !== 'Tab' && !buttonKey) event.preventDefault();
  };

  private acceptsEvent(event: Event): boolean {
    return !this.disposed && (this.options.acceptsEvent?.(event) ?? true);
  }

  private dismiss(): void {
    this.cancel();
    this.handler?.({ action: 'cancel' });
  }

  private showControls(): void {
    this.clearHideTimer();
    if (this.controlsVisible || !this.handler) return;
    this.controlsVisible = true;
    this.render(this.selection.getState());
  }

  private scheduleHide(): void {
    if (!this.controlsVisible || this.controlsFocused || this.hideTimer !== undefined) return;
    this.hideTimer = setTimeout(() => {
      this.hideTimer = undefined;
      this.controlsVisible = false;
      this.render(this.selection.getState());
    }, 750);
  }

  private clearHideTimer(): void {
    if (this.hideTimer !== undefined) clearTimeout(this.hideTimer);
    this.hideTimer = undefined;
  }

  private readonly focusOut = (event: FocusEvent): void => {
    if (!this.acceptsEvent(event)) return;
    this.controlsFocused = event.relatedTarget instanceof Node &&
      (this.toolbar.contains(event.relatedTarget) || this.actions.contains(event.relatedTarget));
    if (!this.controlsFocused) this.scheduleHide();
  };

  private readonly pointerOut = (event: PointerEvent): void => {
    if (this.acceptsEvent(event) && !event.relatedTarget) this.scheduleHide();
  };
}
