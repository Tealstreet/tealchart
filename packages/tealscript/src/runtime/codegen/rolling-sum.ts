export interface RollingSumState {
  raw: number[];
  realized: number[];
  total: number;
  compensation: number;
  seen: number;
  width: number;
}

export function createRollingSumState(): RollingSumState {
  return { raw: [], realized: [], total: 0, compensation: 0, seen: 0, width: 0 };
}

export function copyRollingSumState(state: RollingSumState): RollingSumState {
  return { ...state, raw: [...state.raw], realized: [...state.realized] };
}

export function advanceRollingSum(state: RollingSumState, source: number, length: number, capacity = 5000): number {
  if (!Number.isInteger(length) || length < 1) throw new Error(`Sum length must be a positive integer; got ${length}`);
  const missing = Number.isNaN(source);
  const seen = state.seen + (missing ? 0 : 1);
  const width = Math.min(seen, length);
  if (missing && state.width === width) return width === length ? state.total : NaN;
  if (!missing) {
    state.raw.unshift(source);
    state.realized.unshift(0);
  }
  let total = state.total;
  let compensation = state.compensation;
  const add = (value: number) => {
    const adjusted = value - compensation;
    const next = total + adjusted;
    compensation = (next - total) - adjusted;
    total = next;
  };
  const raw = (offset: number): number => {
    const value = state.raw[offset];
    if (value === undefined) throw new Error(`Sum length ${length} exceeds retained source history`);
    return value;
  };
  const shift = missing ? 0 : 1;
  if (state.width + shift > width) {
    for (let offset = state.width - 1 + shift; offset > width; offset--) add(-raw(offset));
  } else if (width > state.width + shift || width < seen) {
    for (let offset = state.width + shift; offset < Math.min(width + 1, seen); offset++) add(raw(offset));
  }
  const value = missing ? 0 : source;
  const magnitude = Math.abs(compensation);
  const raised = value + magnitude;
  const rebaseline = compensation !== 0 && value !== 0 && raised !== 0 && Number.isFinite(raised)
    && magnitude - (raised - value) > 0;
  let realized = value;
  if (rebaseline) {
    total = value;
    for (let offset = 1; offset < width; offset++) total = total + raw(offset);
    compensation = 0;
  } else if (width === seen) {
    realized = value - compensation;
    const next = total + realized;
    compensation = (next - total) - realized;
    total = next;
  } else {
    const leaving = state.realized[width];
    if (leaving === undefined) throw new Error(`Sum length ${length} exceeds retained eviction history`);
    const removed = -leaving - compensation;
    const partial = total + removed;
    const error = (partial - total) - removed;
    realized = value - error;
    const next = partial + realized;
    compensation = (next - partial) - realized;
    total = next;
  }
  if (!missing) state.realized[0] = realized;
  state.total = total;
  state.compensation = compensation;
  state.seen = seen;
  state.width = width;
  const keep = Math.max(capacity, length + 1);
  if (state.raw.length > keep) {
    state.raw.length = keep;
    state.realized.length = keep;
  }
  return width === length ? total : NaN;
}
