import type {
  AnalysisRequestIntent,
  AnalysisSelectionFrame,
  AnalysisSelectionState,
} from '../analysis/analysisSelection';

import { AnalysisSelection, analysisSelectionXAtTime } from '../analysis/analysisSelection';
import { button, div, icons } from './dom';

export interface AnalysisSelectorOptions {
  container: HTMLElement;
  getFrame: () => AnalysisSelectionFrame | null;
  canStart: () => boolean;
  onAnalysisRequest?: (intent: AnalysisRequestIntent) => void;
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
  private readonly selection = new AnalysisSelection((state) => this.render(state));
  private handler?: (intent: AnalysisRequestIntent) => void;
  private pointerId?: number;
  private disposed = false;
  private focusingSelection = false;

  constructor(private readonly options: AnalysisSelectorOptions) {
    this.handler = options.onAnalysisRequest;
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
      this.control('Cancel', () => this.cancel()),
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
    this.update();
  }

  setHandler(handler: ((intent: AnalysisRequestIntent) => void) | undefined): void {
    this.handler = handler;
    if (!handler) this.cancel();
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
    if (started) {
      this.focusingSelection = true;
      try {
        this.surface.focus({ preventScroll: true });
      } finally {
        this.focusingSelection = false;
      }
    }
    return started;
  }

  cancel(message?: string): void {
    this.pointerId = undefined;
    this.selection.cancel(message);
  }

  dispose(): void {
    this.disposed = true;
    this.handler = undefined;
    this.cancel();
    window.removeEventListener('pointermove', this.pointerMove, true);
    window.removeEventListener('pointerup', this.pointerUp, true);
    window.removeEventListener('pointercancel', this.pointerCancel, true);
    window.removeEventListener('blur', this.blur);
    document.removeEventListener('keydown', this.keyDown, true);
    document.removeEventListener('pointerdown', this.outsideInput, true);
    document.removeEventListener('focusin', this.outsideInput, true);
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
    this.toolbar.style.display = state.active ? 'none' : 'flex';
    this.toolbar.style.left = `${(frame?.plot.left ?? 0) + 6}px`;
    if (frame)
      for (const controls of [this.toolbar, this.actions])
        Object.assign(controls.style, {
          maxWidth: `${Math.max(0, frame.plot.width - 12)}px`,
          maxHeight: `${Math.max(0, frame.plot.height - 12)}px`,
        });
    const activeControls = state.active ? this.actions : this.toolbar;
    const controlsTop = frame
      ? Math.max(frame.plot.top + 6, frame.plot.top + frame.plot.height - (activeControls.offsetHeight || 30) - 6)
      : 6;
    this.toolbar.style.top = `${controlsTop}px`;
    this.surface.style.display = state.active && frame ? 'block' : 'none';
    this.actions.style.display = state.active ? 'flex' : 'none';
    this.message.textContent =
      state.message ?? (state.active && !state.range ? 'Drag across a pattern on the main chart.' : '');
    this.message.style.display = this.message.textContent ? 'block' : 'none';
    if (!frame) return;
    Object.assign(this.surface.style, {
      left: `${frame.plot.left}px`,
      top: `${frame.plot.top}px`,
      width: `${frame.plot.width}px`,
      height: `${frame.plot.height}px`,
    });
    this.actions.style.left = `${frame.plot.left + 6}px`;
    this.actions.style.top = `${controlsTop}px`;
    this.message.style.left = `${frame.plot.left + 6}px`;
    this.message.style.top = `${Math.max(frame.plot.top + 6, controlsTop - 38)}px`;
    for (const control of this.actions.querySelectorAll<HTMLButtonElement>('button'))
      control.disabled = control.textContent !== 'Cancel' && !state.range;
    this.highlight.style.display = state.range ? 'block' : 'none';
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

  private localPoint(event: PointerEvent): { x: number; y: number } {
    const rect = this.options.container.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * (this.options.container.clientWidth || rect.width)) / rect.width,
      y: ((event.clientY - rect.top) * (this.options.container.clientHeight || rect.height)) / rect.height,
    };
  }

  private readonly contain = (event: Event): void => {
    event.stopPropagation();
    if (event.type === 'contextmenu' || event.type === 'wheel') event.preventDefault();
  };
  private readonly pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.pointerId !== undefined) return;
    event.preventDefault();
    event.stopPropagation();
    this.update();
    const point = this.localPoint(event);
    if (this.selection.begin(point.x, point.y)) this.pointerId = event.pointerId;
  };
  private readonly pointerMove = (event: PointerEvent): void => {
    if (this.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.update();
    this.selection.move(this.localPoint(event).x);
  };
  private readonly pointerUp = (event: PointerEvent): void => {
    if (this.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.update();
    this.selection.end(this.localPoint(event).x);
    this.pointerId = undefined;
  };
  private readonly pointerCancel = (event: PointerEvent): void => {
    if (this.pointerId === event.pointerId) this.cancel('Pattern selection was interrupted. Select the pattern again.');
  };
  private readonly blur = (event: Event): void => {
    if (!this.focusingSelection && !(event.target instanceof Element) && this.selection.getState().active)
      this.cancel('Selection cancelled because the chart lost focus.');
  };
  private readonly outsideInput = (event: Event): void => {
    if (this.selection.getState().active && event.target instanceof Node && !this.root.contains(event.target))
      this.cancel('Selection cancelled because the chart lost focus.');
  };
  private readonly keyDown = (event: KeyboardEvent): void => {
    if (!this.selection.getState().active) return;
    if (
      event.target instanceof Element &&
      !this.root.contains(event.target) &&
      event.target.closest('input,textarea,[contenteditable="true"]')
    ) {
      this.cancel('Selection cancelled because the chart lost focus.');
      return;
    }
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
      return;
    }
    const buttonKey =
      event.target instanceof HTMLButtonElement &&
      this.root.contains(event.target) &&
      ['Enter', ' '].includes(event.key);
    if (event.key !== 'Tab' && !buttonKey) event.preventDefault();
  };
}
