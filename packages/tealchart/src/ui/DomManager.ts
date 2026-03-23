/**
 * DomManager - Lifecycle-managed DOM helper
 *
 * Wraps the existing h() helper from dom.ts with tracking for automatic cleanup.
 * All elements, event listeners, and intervals are tracked and can be disposed in one call.
 */

import type { ElementProps } from './dom';

import { h } from './dom';

interface TrackedListener {
  el: EventTarget;
  event: string;
  handler: EventListenerOrEventListenerObject;
  options?: AddEventListenerOptions;
}

export class DomManager {
  private _elements: HTMLElement[] = [];
  private _listeners: TrackedListener[] = [];
  private _intervals: ReturnType<typeof setInterval>[] = [];

  /**
   * Create an element via h() — tracked for disposal
   */
  create<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props?: ElementProps<HTMLElementTagNameMap[K]>,
  ): HTMLElementTagNameMap[K] {
    const el = h(tag, props);
    this._elements.push(el);
    return el;
  }

  /**
   * Create a div — tracked for disposal
   */
  div(props?: ElementProps<HTMLDivElement>): HTMLDivElement {
    return this.create('div', props);
  }

  /**
   * Create a span — tracked for disposal
   */
  span(props?: ElementProps<HTMLSpanElement>): HTMLSpanElement {
    return this.create('span', props);
  }

  /**
   * Create a button — tracked for disposal
   */
  button(props?: ElementProps<HTMLButtonElement>): HTMLButtonElement {
    return this.create('button', props);
  }

  /**
   * Bind an event listener — tracked for automatic removal on dispose
   */
  on(
    el: EventTarget,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions,
  ): void {
    el.addEventListener(event, handler, options);
    this._listeners.push({ el, event, handler, options });
  }

  /**
   * Create a tracked interval
   */
  setInterval(handler: () => void, ms: number): ReturnType<typeof setInterval> {
    const id = globalThis.setInterval(handler, ms);
    this._intervals.push(id);
    return id;
  }

  /**
   * Remove a specific element and its associated listeners
   */
  remove(el: HTMLElement): void {
    // Remove associated listeners
    this._listeners = this._listeners.filter((l) => {
      if (l.el === el) {
        el.removeEventListener(l.event, l.handler, l.options);
        return false;
      }
      return true;
    });

    // Remove from tracked elements
    const idx = this._elements.indexOf(el);
    if (idx !== -1) {
      this._elements.splice(idx, 1);
    }

    // Remove from DOM
    el.remove();
  }

  /**
   * Dispose all: remove all elements, unbind all events, clear all intervals
   */
  dispose(): void {
    // Remove all listeners
    for (const { el, event, handler, options } of this._listeners) {
      el.removeEventListener(event, handler, options);
    }
    this._listeners = [];

    // Remove all elements from DOM
    for (const el of this._elements) {
      el.remove();
    }
    this._elements = [];

    // Clear all intervals
    for (const id of this._intervals) {
      clearInterval(id);
    }
    this._intervals = [];
  }
}
