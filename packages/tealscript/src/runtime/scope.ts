/**
 * Scope - Variable Management
 *
 * Handles variable storage and scoping:
 * - Regular variables (re-evaluated each bar)
 * - var variables (persist across bars, initialized once)
 * - varip variables (persist even during intrabar updates)
 * - Block scoping for if/for/while
 */

import { Series, type SeriesSnapshot } from './series';
import { copyArray, isPineArray } from './arrays';
import { copyMatrix, isPineMatrix } from './matrices';

/**
 * Variable declaration kind
 */
export type VarKind = 'none' | 'var' | 'varip';

/**
 * Variable entry in scope
 */
export interface VariableEntry {
  value: unknown;
  kind: VarKind;
  type?: string; // Type annotation
  initialized: boolean; // Has been initialized at least once
  series?: Series<unknown>; // For series variables
}

/**
 * Scope snapshot for rollback
 */
export interface ScopeSnapshot {
  variables: Map<string, VariableSnapshot>;
}

interface VariableSnapshot {
  value: unknown;
  initialized: boolean;
  seriesSnapshot?: SeriesSnapshot<unknown>;
}

/**
 * Scope class - manages variables in Tealscript execution
 */
export class Scope {
  private variables: Map<string, VariableEntry> = new Map();
  private parent: Scope | null;

  // Snapshots for rollback
  private lastCommittedState: ScopeSnapshot | null = null;

  constructor(parent: Scope | null = null) {
    this.parent = parent;
  }

  // =========================================================================
  // Variable Declaration
  // =========================================================================

  /**
   * Declare a new variable
   */
  declare(name: string, kind: VarKind, value: unknown, type?: string): void {
    // For var/varip, only initialize if not already declared
    if (kind === 'var' || kind === 'varip') {
      const existing = this.getLocal(name);
      if (existing && existing.initialized) {
        // Already initialized - don't reinitialize
        return;
      }
    }

    const existing = this.getLocal(name);
    if (existing) {
      existing.value = value;
      existing.kind = kind;
      existing.type = type;
      existing.initialized = true;

      if (existing.series) {
        existing.series.set(value);
      } else if (this.shouldBecomeSeries(value)) {
        existing.series = new Series<unknown>();
        existing.series.advance();
        existing.series.set(value);
      }
      return;
    }

    const entry: VariableEntry = {
      value,
      kind,
      type,
      initialized: true,
    };

    // Wrap in series if needed
    if (this.shouldBecomeSeries(value)) {
      entry.series = new Series<unknown>();
      entry.series.advance();
      entry.series.set(value);
    }

    this.variables.set(name, entry);
  }

  /**
   * Check if a value should be wrapped in a series
   * Currently: numbers become series for history access
   */
  private shouldBecomeSeries(value: unknown): boolean {
    return typeof value === 'number';
  }

  // =========================================================================
  // Variable Access
  // =========================================================================

  /**
   * Get variable from this scope only
   */
  private getLocal(name: string): VariableEntry | undefined {
    return this.variables.get(name);
  }

  /**
   * Get variable (searches parent scopes)
   */
  get(name: string): unknown {
    const entry = this.variables.get(name);
    if (entry) {
      // If it's a series, return current value
      if (entry.series) {
        return entry.series.get(0);
      }
      return entry.value;
    }

    // Search parent scope
    if (this.parent) {
      return this.parent.get(name);
    }

    return undefined;
  }

  /**
   * Get variable with history offset
   */
  getWithOffset(name: string, offset: number): unknown {
    const entry = this.variables.get(name);
    if (entry) {
      if (entry.series) {
        return entry.series.get(offset);
      }
      // Non-series: offset 0 returns value, others return undefined
      return offset === 0 ? entry.value : undefined;
    }

    if (this.parent) {
      return this.parent.getWithOffset(name, offset);
    }

    return undefined;
  }

  /**
   * Get the series for a variable (for direct manipulation)
   */
  getSeries(name: string): Series<unknown> | undefined {
    const entry = this.variables.get(name);
    if (entry?.series) {
      return entry.series;
    }

    if (this.parent) {
      return this.parent.getSeries(name);
    }

    return undefined;
  }

  /**
   * Check if variable exists
   */
  has(name: string): boolean {
    if (this.variables.has(name)) {
      return true;
    }
    return this.parent ? this.parent.has(name) : false;
  }

  /**
   * Get the entry for a variable
   */
  getEntry(name: string): VariableEntry | undefined {
    const entry = this.variables.get(name);
    if (entry) {
      return entry;
    }
    return this.parent?.getEntry(name);
  }

  // =========================================================================
  // Variable Assignment
  // =========================================================================

  /**
   * Set variable value (for := assignment)
   */
  set(name: string, value: unknown): void {
    const entry = this.findEntry(name);
    if (!entry) {
      throw new Error(`Variable '${name}' is not declared`);
    }

    if (entry.series) {
      entry.series.set(value);
    }
    entry.value = value;
  }

  /**
   * Find entry in this scope or parents
   */
  private findEntry(name: string): VariableEntry | undefined {
    const entry = this.variables.get(name);
    if (entry) {
      return entry;
    }
    return this.parent?.findEntry(name);
  }

  // =========================================================================
  // Bar Lifecycle
  // =========================================================================

  /**
   * Advance to next bar
   * - Regular variables are reset
   * - var/varip variables persist
   */
  advanceBar(): void {
    for (const [_name, entry] of this.variables) {
      // Advance series
      if (entry.series) {
        entry.series.advance();
        // Set the persisted value as the initial value for new bar
        if (entry.kind === 'var' || entry.kind === 'varip') {
          entry.series.set(entry.value);
        }
      }

      // Reset regular variables
      if (entry.kind === 'none') {
        entry.value = undefined;
        entry.initialized = false;
      }
    }
  }

  /**
   * Commit current bar state
   * @param isLastBar - Only take a snapshot on the last bar (for realtime rollback)
   */
  commit(isLastBar = false): void {
    // Commit all series
    for (const entry of this.variables.values()) {
      if (entry.series) {
        entry.series.commit();
      }
    }

    // Only snapshot on the last bar — rollback is only used for realtime recalculation
    if (isLastBar) {
      this.lastCommittedState = this.snapshot();
    }
  }

  /**
   * Rollback to last committed state
   */
  rollback(): void {
    if (this.lastCommittedState) {
      this.restore(this.lastCommittedState);
    }

    // Rollback all series
    for (const entry of this.variables.values()) {
      if (entry.series) {
        entry.series.rollback();
      }
    }
  }

  // =========================================================================
  // Snapshot/Restore
  // =========================================================================

  /**
   * Create a snapshot of current state
   */
  snapshot(): ScopeSnapshot {
    const variables = new Map<string, VariableSnapshot>();

    for (const [name, entry] of this.variables) {
      variables.set(name, {
        value: cloneSnapshotValue(entry.value),
        initialized: entry.initialized,
        seriesSnapshot: entry.series ? cloneSeriesSnapshot(entry.series.snapshot()) : undefined,
      });
    }

    return { variables };
  }

  /**
   * Restore from snapshot
   */
  restore(snapshot: ScopeSnapshot): void {
    for (const [name, snap] of snapshot.variables) {
      const entry = this.variables.get(name);
      if (entry) {
        entry.value = cloneSnapshotValue(snap.value);
        entry.initialized = snap.initialized;
        if (entry.series && snap.seriesSnapshot) {
          entry.series.restore(cloneSeriesSnapshot(snap.seriesSnapshot));
        }
      }
    }
  }

  // =========================================================================
  // Child Scopes
  // =========================================================================

  /**
   * Create a child scope (for if/for/while blocks)
   */
  createChild(): Scope {
    return new Scope(this);
  }

  /**
   * Get all variable names in this scope
   */
  getLocalNames(): string[] {
    return Array.from(this.variables.keys());
  }

  /**
   * Get all variable names including parents
   */
  getAllNames(): string[] {
    const names = new Set<string>(this.getLocalNames());
    if (this.parent) {
      for (const name of this.parent.getAllNames()) {
        names.add(name);
      }
    }
    return Array.from(names);
  }

  // =========================================================================
  // Debug
  // =========================================================================

  /**
   * Get debug representation of scope
   */
  debug(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [name, entry] of this.variables) {
      result[name] = {
        value: entry.series ? entry.series.get(0) : entry.value,
        kind: entry.kind,
        initialized: entry.initialized,
        hasSeries: !!entry.series,
      };
    }
    return result;
  }
}

function cloneSnapshotValue(value: unknown): unknown {
  if (isPineArray(value)) {
    return copyArray(value);
  }
  return isPineMatrix(value) ? copyMatrix(value) : value;
}

function cloneSeriesSnapshot(snapshot: SeriesSnapshot<unknown>): SeriesSnapshot<unknown> {
  return {
    values: snapshot.values.map(cloneSnapshotValue),
    currentIndex: snapshot.currentIndex,
    committedIndex: snapshot.committedIndex,
    uncommittedValue: cloneSnapshotValue(snapshot.uncommittedValue),
    hasUncommittedValue: snapshot.hasUncommittedValue,
  };
}

/**
 * Create a root scope with built-in constants
 */
export function createRootScope(): Scope {
  const scope = new Scope();

  // Built-in constants could be added here if needed
  // e.g., math constants, color constants, etc.

  return scope;
}
