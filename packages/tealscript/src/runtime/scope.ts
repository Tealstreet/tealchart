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
import { copyMap, isPineMap } from './maps';
import { createPineUdtObject, isPineUdtObject, type PineUdtObject } from './objects';

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
  sourceSeries?: SourceSeriesAccessor;
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
  sourceSeries?: SourceSeriesAccessor;
}

export interface SourceSeriesAccessor {
  get(offset: number): number | undefined;
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
  declare(name: string, kind: VarKind, value: unknown, type?: string, sourceSeries?: SourceSeriesAccessor): void {
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
      existing.sourceSeries = sourceSeries;

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
      sourceSeries,
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
   * Check if a value should be wrapped in a series.
   *
   * Arrays are intentionally excluded because this runtime currently treats
   * `arrayVar[index]` as element access, while map history uses `mapVar[n]`.
   */
  private shouldBecomeSeries(value: unknown): boolean {
    return typeof value === 'number' || isPineMap(value);
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
   * Get the backing chart/source series for a source alias.
   */
  getSourceSeries(name: string): SourceSeriesAccessor | undefined {
    const entry = this.variables.get(name);
    if (entry) {
      return entry.sourceSeries;
    }

    return this.parent?.getSourceSeries(name);
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
  set(name: string, value: unknown, sourceSeries?: SourceSeriesAccessor): void {
    const entry = this.findEntry(name);
    if (!entry) {
      throw new Error(`Variable '${name}' is not declared`);
    }

    if (entry.series) {
      entry.series.set(value);
    }
    entry.value = value;
    entry.sourceSeries = sourceSeries;
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
      if (entry.kind !== 'varip' && entry.series) {
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
    const cloneContext = createCloneContext();

    for (const [name, entry] of this.variables) {
      variables.set(name, {
        value: cloneSnapshotValue(entry.value, cloneContext),
        initialized: entry.initialized,
        seriesSnapshot: entry.series ? cloneSeriesSnapshot(entry.series.snapshot(), cloneContext) : undefined,
        sourceSeries: entry.sourceSeries,
      });
    }

    return { variables };
  }

  /**
   * Restore from snapshot
   */
  restore(snapshot: ScopeSnapshot): void {
    const cloneContext = createCloneContext();
    for (const [name, snap] of snapshot.variables) {
      const entry = this.variables.get(name);
      if (entry) {
        collectVaripSources(snap.value, entry.value, cloneContext);
      }
    }

    for (const [name, snap] of snapshot.variables) {
      const entry = this.variables.get(name);
      if (entry) {
        if (entry.kind === 'varip') {
          continue;
        }
        entry.value = cloneSnapshotValue(snap.value, cloneContext);
        entry.initialized = snap.initialized;
        entry.sourceSeries = snap.sourceSeries;
        if (entry.series && snap.seriesSnapshot) {
          entry.series.restore(cloneSeriesSnapshot(snap.seriesSnapshot, cloneContext));
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

interface CloneContext {
  udtClones: WeakMap<PineUdtObject, PineUdtObject>;
  varipSources: WeakMap<PineUdtObject, PineUdtObject>;
}

function createCloneContext(): CloneContext {
  return {
    udtClones: new WeakMap(),
    varipSources: new WeakMap(),
  };
}

function cloneSnapshotValue(value: unknown, context: CloneContext): unknown {
  if (isPineArray(value)) {
    return copyArray(value);
  }
  if (isPineMatrix(value)) {
    return copyMatrix(value);
  }
  if (isPineMap(value)) {
    return copyMap(value);
  }
  return isPineUdtObject(value) ? cloneUdtSnapshotValue(value, context) : value;
}

function cloneUdtSnapshotValue(value: PineUdtObject, context: CloneContext): PineUdtObject {
  const existing = context.udtClones.get(value);
  if (existing) return existing;

  const clone = createPineUdtObject(value.typeName, [], value.varipFields);
  context.udtClones.set(value, clone);
  const varipSource = context.varipSources.get(value);

  for (const [fieldName, fieldValue] of value.fields) {
    const sourceValue = varipSource && value.varipFields.has(fieldName)
      ? varipSource.fields.get(fieldName)
      : fieldValue;
    clone.fields.set(fieldName, cloneSnapshotValue(sourceValue, context));
  }

  return clone;
}

function collectVaripSources(snapshotValue: unknown, currentValue: unknown, context: CloneContext): void {
  if (!isPineUdtObject(snapshotValue) || !isPineUdtObject(currentValue)) return;

  context.varipSources.set(snapshotValue, currentValue);
  for (const [fieldName, nestedSnapshotValue] of snapshotValue.fields) {
    collectVaripSources(nestedSnapshotValue, currentValue.fields.get(fieldName), context);
  }
}

function cloneSeriesSnapshot(snapshot: SeriesSnapshot<unknown>, context: CloneContext): SeriesSnapshot<unknown> {
  return {
    values: snapshot.values.map((value) => cloneSnapshotValue(value, context)),
    currentIndex: snapshot.currentIndex,
    committedIndex: snapshot.committedIndex,
    uncommittedValue: cloneSnapshotValue(snapshot.uncommittedValue, context),
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
