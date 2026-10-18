import { describe, expect, it, vi } from 'vitest';

import { bound, entries, executeStep } from '../../../tealscript/tests/fixtures/v104Step';
import { traceEntry } from '../test/v102Paint';
import { stepSegments, traceStep, type StepChannel } from '../test/v104StepPaint';

vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useMemo: <T,>(factory: () => T) => factory() }));
const channels: StepChannel[] = ['web', 'web-pane', 'web-unified', 'web-index', 'native', 'native-static'];
for (const entry of entries) for (const channel of channels) describe(`${entry.id} ${channel} own turn identity`, () => {
  for (const offset of [0, -2, 2]) for (const colored of [false, true]) it(`places both directed transitions at their own X(t)-b/2 (${colored ? 'series' : 'constant'} color, offset${offset})`, () => {
    bound(entry.regions.originalPng);
    const trace = traceStep(entry, channel, colored ? { offset, color: entry.csv.rows.slice(entry.first - 1, entry.anchor).map((_, i) => i % 2 ? '#2962ff' : '#00aa00') } : { offset });
    const segments = stepSegments(trace.paints.filter(p => p.kind === 'stroke'));
    const verticals = segments.filter(([a, b]) => Math.abs(a.x - b.x) < 1e-8 && Math.abs(a.y - b.y) > 1);
    const slot = trace.x(entry.primary[1]) - trace.x(entry.primary[0]);
    for (const transition of entry.certificate.transitions) {
      const row = transition.inputIndex.rowOrdinal;
      expect(entry.primary).toContain(row);
      expect(Number(entry.csv.raw(row, 'PHASE32'))).toBe(transition.phase);
      const center = trace.x(row) + offset * slot, turn = center - slot / 2;
      const own = verticals.filter(([a, b]) => Math.abs(a.x - turn) < 1e-8);
      expect(own, `phase${transition.phase} own${transition.ownIndex}`).toHaveLength(1);
      const [a, b] = own[0];
      expect(Math.sign(b.y - a.y)).toBe(transition.phase === 8 ? -1 : 1);
      expect(Math.abs(a.y - b.y)).toBeCloseTo(50, 8);
      expect(verticals.some(([p]) => Math.abs(p.x - center) < 1e-8)).toBe(false);
      expect(segments.some(([p, q]) => Math.abs(q.x - turn) < 1e-8 && p.x < turn && Math.abs(p.y - a.y) < 1e-8 && Math.abs(q.y - a.y) < 1e-8)).toBe(true);
      expect(segments.some(([p, q]) => Math.abs(p.x - turn) < 1e-8 && q.x > turn && Math.abs(p.y - b.y) < 1e-8 && Math.abs(q.y - b.y) < 1e-8)).toBe(true);
    }
  });
});

for (const entry of entries) for (const channel of ['web', 'native'] as const) it(`${entry.id} ${channel} paints each own phase ruler at its own row`, () => {
  const replay = executeStep(entry);
  const trace = traceEntry(replay, channel);
  const rulers = trace.paints.filter(p => p.kind === 'stroke');
  expect(rulers).toHaveLength(2);
  for (const [index, transition] of entry.certificate.transitions.entries()) {
    const row = transition.inputIndex.rowOrdinal;
    const x = (Number(entry.csv.raw(row, 'time')) * 1000 - replay.bars[0].time) /
      (replay.bars.at(-1)!.time - replay.bars[0].time) * 1000;
    expect(rulers[index].points).toHaveLength(2);
    expect(rulers[index].points[0].x).toBeCloseTo(x, 8);
    expect(rulers[index].points[1].x).toBeCloseTo(x, 8);
    expect(rulers[index].points.map(p => p.y)).toEqual([90, 10]);
    expect(rulers[index].width).toBe(1);
  }
});
