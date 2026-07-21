/**
 * Base Component Class - Foundation for vanilla DOM components
 *
 * Provides a simple lifecycle and state management pattern for
 * building UI components without React.
 */

// ============================================================================
// Types
// ============================================================================

export interface ComponentOptions {
  /** CSS class name(s) for the root element */
  className?: string;
  /** Inline styles for the root element */
  style?: Partial<CSSStyleDeclaration>;
  /** Parent element to mount to */
  parent?: HTMLElement;
}

// ============================================================================
// Base Component Class
// ============================================================================

export abstract class Component<S = Record<string, unknown>> {
  protected el: HTMLElement;
  protected state: S;
  private _mounted = false;

  constructor(tagName: string = 'div', initialState: S = {} as S, options: ComponentOptions = {}) {
    this.el = document.createElement(tagName);
    this.state = initialState;

    if (options.className) {
      this.el.className = options.className;
    }

    if (options.style) {
      Object.assign(this.el.style, options.style);
    }

    if (options.parent) {
      this.mount(options.parent);
    }
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * Mount the component to a parent element
   */
  mount(parent: HTMLElement): void {
    if (this._mounted) {
      console.warn('Component already mounted');
      return;
    }

    parent.appendChild(this.el);
    this._mounted = true;
    this.onMount();
  }

  /**
   * Unmount the component from the DOM
   */
  unmount(): void {
    if (!this._mounted) {
      return;
    }

    this.onUnmount();
    this.el.remove();
    this._mounted = false;
  }

  /**
   * Called after mount - override to add event listeners, etc.
   */
  protected onMount(): void {
    this.render();
  }

  /**
   * Called before unmount - override to clean up event listeners, etc.
   */
  protected onUnmount(): void {
    // Override in subclasses
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Update state and trigger re-render
   */
  setState(newState: Partial<S>): void {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };
    this.onStateChange(prevState);
    this.render();
  }

  /**
   * Called when state changes - override to perform side effects
   */
  protected onStateChange(_prevState: S): void {
    // Override in subclasses
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  /**
   * Render the component - must be implemented by subclasses
   */
  protected abstract render(): void;

  /**
   * Get the root element
   */
  getElement(): HTMLElement {
    return this.el;
  }

  /**
   * Check if component is mounted
   */
  isMounted(): boolean {
    return this._mounted;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Create an element with optional class and content
   */
  protected createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: {
      className?: string;
      textContent?: string;
      innerHTML?: string;
      style?: Partial<CSSStyleDeclaration>;
      attributes?: Record<string, string>;
      onClick?: (e: MouseEvent) => void;
      onMouseEnter?: (e: MouseEvent) => void;
      onMouseLeave?: (e: MouseEvent) => void;
    }
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tagName);

    if (options?.className) {
      el.className = options.className;
    }

    if (options?.textContent) {
      el.textContent = options.textContent;
    }

    if (options?.innerHTML) {
      el.innerHTML = options.innerHTML;
    }

    if (options?.style) {
      Object.assign(el.style, options.style);
    }

    if (options?.attributes) {
      for (const [key, value] of Object.entries(options.attributes)) {
        el.setAttribute(key, value);
      }
    }

    if (options?.onClick) {
      el.addEventListener('click', options.onClick as EventListener);
    }

    if (options?.onMouseEnter) {
      el.addEventListener('mouseenter', options.onMouseEnter as EventListener);
    }

    if (options?.onMouseLeave) {
      el.addEventListener('mouseleave', options.onMouseLeave as EventListener);
    }

    return el;
  }

  /**
   * Apply CSS variables to the root element
   */
  protected setCssVars(vars: Record<string, string>): void {
    for (const [key, value] of Object.entries(vars)) {
      this.el.style.setProperty(key, value);
    }
  }

  /**
   * Show the component
   */
  show(): void {
    this.el.style.display = '';
  }

  /**
   * Hide the component
   */
  hide(): void {
    this.el.style.display = 'none';
  }

  /**
   * Toggle visibility
   */
  toggle(visible?: boolean): void {
    if (visible === undefined) {
      visible = this.el.style.display === 'none';
    }
    if (visible) {
      this.show();
    } else {
      this.hide();
    }
  }
}

// ============================================================================
// Simple Template Component
// ============================================================================

/**
 * A simpler component that uses innerHTML templates
 */
export class TemplateComponent extends Component<Record<string, unknown>> {
  private template: (state: Record<string, unknown>) => string;
  private eventBindings: Array<{ selector: string; event: string; handler: (e: Event) => void }> = [];

  constructor(
    template: (state: Record<string, unknown>) => string,
    initialState: Record<string, unknown> = {},
    options: ComponentOptions = {}
  ) {
    super('div', initialState, options);
    this.template = template;
  }

  /**
   * Add an event binding that will be applied after each render
   */
  on(selector: string, event: string, handler: (e: Event) => void): this {
    this.eventBindings.push({ selector, event, handler });
    return this;
  }

  protected render(): void {
    this.el.innerHTML = this.template(this.state);
    this.bindEvents();
  }

  private bindEvents(): void {
    for (const binding of this.eventBindings) {
      const elements = this.el.querySelectorAll(binding.selector);
      for (const el of Array.from(elements)) {
        el.addEventListener(binding.event, binding.handler);
      }
    }
  }
}
