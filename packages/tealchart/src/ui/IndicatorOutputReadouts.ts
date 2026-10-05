import type { IndicatorOutputReadout } from '../rendering/indicatorOutputReadouts';

import { div, span } from './dom';

const readoutNodes = new WeakMap<HTMLElement, Map<string, HTMLElement>>();
const readoutColors = new WeakMap<HTMLElement, string>();

function syncReadoutNodes(
  container: HTMLElement,
  entries: readonly IndicatorOutputReadout[],
  create: (entry: IndicatorOutputReadout) => HTMLElement,
  update: (node: HTMLElement, entry: IndicatorOutputReadout) => void,
): void {
  let nodes = readoutNodes.get(container);
  if (!nodes) {
    nodes = new Map();
    readoutNodes.set(container, nodes);
  }
  const retained = new Set<string>();
  let next = container.firstElementChild;
  for (const entry of entries) {
    const key = JSON.stringify([entry.scriptId, entry.plotId]);
    retained.add(key);
    let node = nodes.get(key);
    if (!node) {
      node = create(entry);
      nodes.set(key, node);
    }
    update(node, entry);
    if (node !== next) container.insertBefore(node, next);
    next = node.nextElementSibling;
  }
  for (const [key, node] of nodes) {
    if (!retained.has(key)) {
      node.remove();
      nodes.delete(key);
    }
  }
}

export function updateIndicatorStatusValues(
  container: HTMLElement,
  scriptId: string,
  readouts: readonly IndicatorOutputReadout[],
): void {
  const entries = readouts.filter((entry) => entry.scriptId === scriptId && entry.statusLine);
  const display = entries.length ? 'flex' : 'none';
  if (container.style.display !== display) container.style.display = display;
  syncReadoutNodes(container, entries, () => span({ style: { marginRight: '6px' } }), (node, entry) => {
    const text = entry.values.join(' ');
    if (node.textContent !== text) node.textContent = text;
    if (node.title !== entry.title) node.title = entry.title;
    if (readoutColors.get(node) !== entry.color) {
      node.style.color = entry.color;
      readoutColors.set(node, entry.color);
    }
  });
}

export function createIndicatorStatusValues(
  scriptId: string,
  readouts: readonly IndicatorOutputReadout[],
): HTMLElement {
  const container = div({
    attrs: { 'data-indicator-values': scriptId },
    style: { display: 'flex', fontFamily: 'monospace' },
  });
  updateIndicatorStatusValues(container, scriptId, readouts);
  return container;
}

export class IndicatorDataWindow {
  private readonly el = document.createElement('details');
  private readonly values = document.createElement('div');
  private readouts: readonly IndicatorOutputReadout[] = [];

  constructor() {
    this.el.setAttribute('data-tealchart-data-window', '');
    Object.assign(this.el.style, {
      position: 'absolute',
      top: '44px',
      right: '80px',
      zIndex: '4',
      fontSize: '12px',
      color: 'var(--tc-text, #d1d4dc)',
      background: 'var(--tc-bg, #131722)',
      borderRadius: '4px',
      padding: '4px 8px',
      maxWidth: '300px',
      pointerEvents: 'auto',
    });
    const summary = document.createElement('summary');
    summary.textContent = 'Data Window';
    summary.style.cursor = 'pointer';
    Object.assign(this.values.style, { maxHeight: '300px', overflow: 'auto' });
    this.el.append(summary, this.values);
    for (const event of ['mousedown', 'pointerdown', 'wheel', 'dblclick']) {
      this.el.addEventListener(event, (e) => e.stopPropagation());
    }
    this.el.hidden = true;
    this.el.addEventListener('toggle', () => {
      if (this.el.open) this.renderReadouts();
    });
  }

  getElement(): HTMLDetailsElement {
    return this.el;
  }

  setReadouts(readouts: readonly IndicatorOutputReadout[]): void {
    this.readouts = readouts.filter((entry) => entry.dataWindow);
    const hidden = this.readouts.length === 0;
    if (this.el.hidden !== hidden) this.el.hidden = hidden;
    if (this.el.open) this.renderReadouts();
  }

  private renderReadouts(): void {
    syncReadoutNodes(this.values, this.readouts,
      () => {
        const row = div({
          style: { display: 'flex', gap: '16px', justifyContent: 'space-between', paddingTop: '4px' },
        });
        row.append(
          span(),
          span({ style: { fontFamily: 'monospace' } }),
        );
        return row;
      },
      (row, entry) => {
        const title = row.children[0];
        const value = row.children[1];
        const text = entry.values.join(' ');
        if (title.textContent !== entry.title) title.textContent = entry.title;
        if (value.textContent !== text) value.textContent = text;
      },
    );
  }
}
