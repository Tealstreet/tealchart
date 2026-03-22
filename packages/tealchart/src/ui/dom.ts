/**
 * DOM Utilities - Lightweight helpers for vanilla DOM manipulation
 *
 * Provides a concise API for creating and managing DOM elements
 * without React overhead.
 */

// ============================================================================
// Types
// ============================================================================

export type ElementProps<T extends HTMLElement = HTMLElement> = {
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  text?: string;
  html?: string;
  attrs?: Record<string, string>;
  data?: Record<string, string>;
  onClick?: (e: MouseEvent) => void;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  onMouseDown?: (e: MouseEvent) => void;
  onMouseUp?: (e: MouseEvent) => void;
  onInput?: (e: Event) => void;
  onChange?: (e: Event) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  children?: (HTMLElement | string | null | undefined)[];
  ref?: (el: T) => void;
};

// ============================================================================
// Core createElement function
// ============================================================================

/**
 * Create an HTML element with props
 *
 * @example
 * const div = h('div', { className: 'foo', text: 'Hello' });
 * const btn = h('button', { onClick: () => alert('Hi'), children: ['Click me'] });
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: ElementProps<HTMLElementTagNameMap[K]>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (!props) return el;

  if (props.className) {
    el.className = props.className;
  }

  if (props.style) {
    Object.assign(el.style, props.style);
  }

  if (props.text !== undefined) {
    el.textContent = props.text;
  }

  if (props.html !== undefined) {
    el.innerHTML = props.html;
  }

  if (props.attrs) {
    for (const [key, value] of Object.entries(props.attrs)) {
      el.setAttribute(key, value);
    }
  }

  if (props.data) {
    for (const [key, value] of Object.entries(props.data)) {
      el.dataset[key] = value;
    }
  }

  // Event listeners
  if (props.onClick) {
    el.addEventListener('click', props.onClick as EventListener);
  }
  if (props.onMouseEnter) {
    el.addEventListener('mouseenter', props.onMouseEnter as EventListener);
  }
  if (props.onMouseLeave) {
    el.addEventListener('mouseleave', props.onMouseLeave as EventListener);
  }
  if (props.onMouseDown) {
    el.addEventListener('mousedown', props.onMouseDown as EventListener);
  }
  if (props.onMouseUp) {
    el.addEventListener('mouseup', props.onMouseUp as EventListener);
  }
  if (props.onInput) {
    el.addEventListener('input', props.onInput);
  }
  if (props.onChange) {
    el.addEventListener('change', props.onChange);
  }
  if (props.onKeyDown) {
    el.addEventListener('keydown', props.onKeyDown as EventListener);
  }

  // Children
  if (props.children) {
    for (const child of props.children) {
      if (child === null || child === undefined) continue;
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
  }

  // Ref callback
  if (props.ref) {
    props.ref(el);
  }

  return el;
}

// ============================================================================
// Convenience functions
// ============================================================================

/**
 * Create a div element
 */
export function div(props?: ElementProps<HTMLDivElement>): HTMLDivElement {
  return h('div', props);
}

/**
 * Create a span element
 */
export function span(props?: ElementProps<HTMLSpanElement>): HTMLSpanElement {
  return h('span', props);
}

/**
 * Create a button element
 */
export function button(props?: ElementProps<HTMLButtonElement>): HTMLButtonElement {
  return h('button', props);
}

/**
 * Create an input element
 */
export function input(props?: ElementProps<HTMLInputElement> & {
  type?: string;
  value?: string;
  placeholder?: string;
  checked?: boolean;
  disabled?: boolean;
}): HTMLInputElement {
  const el = h('input', props);
  if (props?.type) el.type = props.type;
  if (props?.value !== undefined) el.value = props.value;
  if (props?.placeholder) el.placeholder = props.placeholder;
  if (props?.checked !== undefined) el.checked = props.checked;
  if (props?.disabled !== undefined) el.disabled = props.disabled;
  return el;
}

/**
 * Create a select element with options
 */
export function select(
  props?: ElementProps<HTMLSelectElement> & {
    options?: Array<{ value: string; label: string; selected?: boolean }>;
    value?: string;
  }
): HTMLSelectElement {
  const el = h('select', props);
  if (props?.options) {
    for (const opt of props.options) {
      const option = h('option', {
        text: opt.label,
        attrs: { value: opt.value },
      });
      if (opt.selected || opt.value === props.value) {
        option.selected = true;
      }
      el.appendChild(option);
    }
  }
  return el;
}

/**
 * Create a label element
 */
export function label(props?: ElementProps<HTMLLabelElement> & {
  for?: string;
}): HTMLLabelElement {
  const el = h('label', props);
  if (props?.for) el.htmlFor = props.for;
  return el;
}

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Clear all children from an element
 */
export function clear(el: HTMLElement): void {
  el.innerHTML = '';
}

/**
 * Append multiple children to an element
 */
export function append(parent: HTMLElement, ...children: (HTMLElement | string | null | undefined)[]): void {
  for (const child of children) {
    if (child === null || child === undefined) continue;
    if (typeof child === 'string') {
      parent.appendChild(document.createTextNode(child));
    } else {
      parent.appendChild(child);
    }
  }
}

/**
 * Set CSS custom properties on an element
 */
export function setCssVars(el: HTMLElement, vars: Record<string, string>): void {
  for (const [key, value] of Object.entries(vars)) {
    const cssKey = key.startsWith('--') ? key : `--${key}`;
    el.style.setProperty(cssKey, value);
  }
}

/**
 * Apply styles conditionally
 */
export function applyStyles(
  el: HTMLElement,
  styles: Partial<CSSStyleDeclaration>,
  condition = true
): void {
  if (condition) {
    Object.assign(el.style, styles);
  }
}

/**
 * Toggle a class on an element
 */
export function toggleClass(el: HTMLElement, className: string, force?: boolean): void {
  el.classList.toggle(className, force);
}

/**
 * Create an SVG element with proper namespace
 */
export function svg(
  tag: string,
  attrs?: Record<string, string>,
  children?: (SVGElement | string)[]
): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
  }
  return el;
}

// ============================================================================
// Common SVG Icons
// ============================================================================

export const icons = {
  /** Eye icon (visible) */
  eye: (size = 16, color = 'currentColor'): SVGElement => svg('svg', {
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    'stroke-width': '2',
  }, [
    svg('path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }),
    svg('circle', { cx: '12', cy: '12', r: '3' }),
  ]),

  /** Eye-off icon (hidden) */
  eyeOff: (size = 16, color = 'currentColor'): SVGElement => svg('svg', {
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    'stroke-width': '2',
  }, [
    svg('path', { d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' }),
    svg('line', { x1: '1', y1: '1', x2: '23', y2: '23' }),
  ]),

  /** Settings/gear icon */
  gear: (size = 16, color = 'currentColor'): SVGElement => svg('svg', {
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    'stroke-width': '2',
  }, [
    svg('circle', { cx: '12', cy: '12', r: '3' }),
    svg('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' }),
  ]),

  /** Trash/delete icon */
  trash: (size = 16, color = 'currentColor'): SVGElement => svg('svg', {
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    'stroke-width': '2',
  }, [
    svg('polyline', { points: '3 6 5 6 21 6' }),
    svg('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }),
  ]),

  /** Close/X icon */
  close: (size = 16, color = 'currentColor'): SVGElement => svg('svg', {
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    'stroke-width': '2',
  }, [
    svg('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
    svg('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
  ]),

  /** Search icon */
  search: (size = 16, color = 'currentColor'): SVGElement => svg('svg', {
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    'stroke-width': '2',
  }, [
    svg('circle', { cx: '11', cy: '11', r: '8' }),
    svg('line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' }),
  ]),

  /** Refresh/sync icon (two curved arrows) */
  refresh: (size = 16, color = 'currentColor'): SVGElement => svg('svg', {
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  }, [
    svg('path', { d: 'M21 2v6h-6' }),
    svg('path', { d: 'M3 12a9 9 0 0 1 15-6.7L21 8' }),
    svg('path', { d: 'M3 22v-6h6' }),
    svg('path', { d: 'M21 12a9 9 0 0 1-15 6.7L3 16' }),
  ]),

  /** Spinner (animated) */
  spinner: (size = 16, color = 'currentColor'): SVGElement => {
    const el = svg('svg', {
      width: String(size),
      height: String(size),
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      'stroke-width': '2',
    }, [
      svg('circle', {
        cx: '12',
        cy: '12',
        r: '10',
        'stroke-opacity': '0.25',
      }),
      svg('path', {
        d: 'M12 2a10 10 0 0 1 10 10',
        'stroke-linecap': 'round',
      }),
    ]);
    // Add animation style
    el.style.cssText = 'animation: tealchart-spin 1s linear infinite';
    return el;
  },

  /** Chart indicator (ƒx) */
  indicator: (size = 16, color = 'currentColor'): SVGElement => svg('svg', {
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    'stroke-width': '2',
  }, [
    svg('text', {
      x: '4',
      y: '18',
      'font-family': 'serif',
      'font-style': 'italic',
      'font-size': '18',
      fill: color,
      stroke: 'none',
    }, ['ƒ']),
  ]),
};

// Inject keyframes for spinner animation
if (typeof document !== 'undefined') {
  const styleId = 'tealchart-dom-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes tealchart-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}
