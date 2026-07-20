/**
 * Simple pub-sub event emitter for widget events
 * Mirrors TradingView's subscription pattern
 */

export type EventCallback = (...args: unknown[]) => void;

export class EventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  subscribe(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  unsubscribe(event: string, callback: EventCallback): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(...args);
        } catch (e) {
          console.error(`[Tealchart] Error in event handler for "${event}":`, e);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/**
 * TradingView-style subscription object
 * Allows subscribing with an optional context object for identification
 */

export class Subscription<T extends (...args: any[]) => void> {
  private listeners: Map<object | null, Set<T>> = new Map();

  subscribe(obj: object | null, callback: T): void {
    if (!this.listeners.has(obj)) {
      this.listeners.set(obj, new Set());
    }
    this.listeners.get(obj)!.add(callback);
  }

  unsubscribe(obj: object | null, callback: T): void {
    const objListeners = this.listeners.get(obj);
    if (objListeners) {
      objListeners.delete(callback);
    }
  }

  unsubscribeAll(obj: object | null): void {
    this.listeners.delete(obj);
  }

  emit(...args: Parameters<T>): void {
    this.listeners.forEach((callbacks) => {
      callbacks.forEach((callback) => {
        try {
          callback(...args);
        } catch (e) {
          console.error('[Tealchart] Error in subscription handler:', e);
        }
      });
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}
