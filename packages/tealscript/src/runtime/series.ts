/**
 * Series - The Heart of TealScript
 *
 * In TealScript, every value is a series with history.
 * series[0] = current bar's value
 * series[1] = previous bar's value
 * series[n] = n bars ago
 *
 * Series supports:
 * - Setting/getting values at current bar
 * - History access via offset
 * - Advancing to next bar
 * - Rollback for realtime bar recalculation
 * - Snapshot/restore for var persistence
 */

/**
 * Represents a value that changes over time (bar by bar) with history access.
 */
export class Series<T> {
  private values: (T | undefined)[] = [];
  private currentIndex: number = -1;

  // For rollback support (realtime bars)
  private committedIndex: number = -1;
  private uncommittedValue: T | undefined = undefined;
  private hasUncommittedValue: boolean = false;

  /**
   * Create a new series, optionally with an initial value
   */
  constructor(initialValue?: T) {
    if (initialValue !== undefined) {
      this.values.push(initialValue);
      this.currentIndex = 0;
      this.committedIndex = 0;
    }
  }

  /**
   * Get the current bar index
   */
  get barIndex(): number {
    return this.currentIndex;
  }

  /**
   * Get value at offset from current bar
   * offset=0: current bar
   * offset=1: previous bar
   * offset=n: n bars ago
   *
   * Returns undefined if offset goes beyond available history
   */
  get(offset: number = 0): T | undefined {
    if (offset < 0) {
      // Can't look into the future
      return undefined;
    }

    const idx = this.currentIndex - offset;
    if (idx < 0) {
      // Beyond available history
      return undefined;
    }

    // If accessing current bar and we have uncommitted value, return that
    if (offset === 0 && this.hasUncommittedValue) {
      return this.uncommittedValue;
    }

    return this.values[idx];
  }

  /**
   * Set the current bar's value
   */
  set(value: T): void {
    if (this.currentIndex < 0) {
      // First value - initialize
      this.values.push(value);
      this.currentIndex = 0;
    } else if (this.currentIndex >= this.values.length) {
      // New bar - extend array
      this.values.push(value);
    } else {
      // Update current bar (realtime update)
      this.uncommittedValue = value;
      this.hasUncommittedValue = true;
    }
  }

  /**
   * Advance to the next bar.
   * Called when moving from bar N to bar N+1.
   * Commits any uncommitted value first.
   */
  advance(): void {
    // Commit any uncommitted value
    if (this.hasUncommittedValue && this.currentIndex >= 0) {
      this.values[this.currentIndex] = this.uncommittedValue;
      this.hasUncommittedValue = false;
      this.uncommittedValue = undefined;
    }

    this.currentIndex++;
    this.committedIndex = this.currentIndex - 1;

    // Ensure array has space for the new bar
    if (this.currentIndex >= this.values.length) {
      this.values.push(undefined);
    }
  }

  /**
   * Commit the current bar's value.
   * Called when a bar closes and becomes historical.
   */
  commit(): void {
    if (this.hasUncommittedValue && this.currentIndex >= 0 && this.currentIndex < this.values.length) {
      this.values[this.currentIndex] = this.uncommittedValue;
    }
    this.hasUncommittedValue = false;
    this.uncommittedValue = undefined;
    this.committedIndex = this.currentIndex;
  }

  /**
   * Rollback to the last committed state.
   * Used for realtime bar recalculation - discards uncommitted changes.
   */
  rollback(): void {
    this.hasUncommittedValue = false;
    this.uncommittedValue = undefined;
    // Restore to last committed value (already in array)
  }

  /**
   * Get the current committed value (ignoring uncommitted changes)
   */
  getCommitted(): T | undefined {
    if (this.currentIndex < 0 || this.currentIndex >= this.values.length) {
      return undefined;
    }
    return this.values[this.currentIndex];
  }

  /**
   * Check if the series has any values
   */
  get isEmpty(): boolean {
    return this.values.length === 0;
  }

  /**
   * Get the total number of bars with values
   */
  get length(): number {
    return this.values.length;
  }

  /**
   * Get all values as an array (for plotting)
   */
  toArray(): (T | undefined)[] {
    // If we have uncommitted value, include it
    if (this.hasUncommittedValue && this.currentIndex >= 0 && this.currentIndex < this.values.length) {
      const result = [...this.values];
      result[this.currentIndex] = this.uncommittedValue;
      return result;
    }
    return [...this.values];
  }

  /**
   * Create a snapshot of the series state for var persistence
   */
  snapshot(): SeriesSnapshot<T> {
    return {
      values: [...this.values],
      currentIndex: this.currentIndex,
      committedIndex: this.committedIndex,
      uncommittedValue: this.uncommittedValue,
      hasUncommittedValue: this.hasUncommittedValue,
    };
  }

  /**
   * Restore from a snapshot
   */
  restore(snapshot: SeriesSnapshot<T>): void {
    this.values = [...snapshot.values];
    this.currentIndex = snapshot.currentIndex;
    this.committedIndex = snapshot.committedIndex;
    this.uncommittedValue = snapshot.uncommittedValue;
    this.hasUncommittedValue = snapshot.hasUncommittedValue;
  }

  /**
   * Reset the series to empty state
   */
  reset(): void {
    this.values = [];
    this.currentIndex = -1;
    this.committedIndex = -1;
    this.uncommittedValue = undefined;
    this.hasUncommittedValue = false;
  }
}

/**
 * Snapshot of series state for persistence
 */
export interface SeriesSnapshot<T> {
  values: (T | undefined)[];
  currentIndex: number;
  committedIndex: number;
  uncommittedValue: T | undefined;
  hasUncommittedValue: boolean;
}

/**
 * Create a series from an array of values
 * Useful for creating series from historical bar data
 */
export function seriesFrom<T>(values: T[]): Series<T> {
  const series = new Series<T>();
  for (const value of values) {
    series.advance();
    series.set(value);
    series.commit();
  }
  return series;
}

/**
 * Create a constant series (same value for all bars)
 * Useful for literal values in expressions
 */
export function constantSeries<T>(value: T, length: number): Series<T> {
  const series = new Series<T>();
  for (let i = 0; i < length; i++) {
    series.advance();
    series.set(value);
    series.commit();
  }
  return series;
}

/**
 * Type for values that can be either a plain value or a series
 * Used in the runtime to handle both cases
 */
export type MaybeSeriesValue<T> = T | Series<T>;

/**
 * Helper to get the current value from either a plain value or series
 */
export function getValue<T>(value: MaybeSeriesValue<T>, offset: number = 0): T | undefined {
  if (value instanceof Series) {
    return value.get(offset);
  }
  // Plain value - offset doesn't matter for constants
  return offset === 0 ? value : undefined;
}

/**
 * Helper to check if a value is a series
 */
export function isSeries<T>(value: MaybeSeriesValue<T>): value is Series<T> {
  return value instanceof Series;
}
