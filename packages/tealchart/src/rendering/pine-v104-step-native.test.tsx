import { createCanvas } from '@napi-rs/canvas';
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

for (const entry of entries) for (const channel of channels) for (const colored of [false, true]) for (const transition of entry.certificate.transitions) {
  it(`${entry.id} ${channel} paints each own phase${transition.phase} directed turn and directed arms (${colored ? 'series' : 'constant'})`, () => {
    bound(entry.regions.originalPng);
    const trace = traceStep(entry, channel, colored ? {
      color: entry.csv.rows.slice(entry.first - 1, entry.anchor).map((_, i) => i % 2 ? '#2962ff' : '#00aa00'),
    } : {});
    const slot = trace.x(entry.primary[1]) - trace.x(entry.primary[0]);
    const pixel = (x: number, y: number) => {
      const i = (y * trace.ink.width + x) * 4;
      return [...trace.ink.data.slice(i, i + 4)];
    };
    const ownColor = (row: number) => {
      const color = colored && (row - entry.first) % 2 === 0 ? '#00aa00' : '#2962ff';
      const observed = Array.isArray(trace.plot.color) ? trace.plot.color[row - entry.first] : trace.plot.color;
      expect(observed?.toLowerCase()).toBe(color);
      return [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16));
    };
    const row = transition.inputIndex.rowOrdinal;
    const turn = trace.x(row) - slot / 2;
    const incoming = transition.phase === 8 ? 75 : 25;
    const outgoing = 100 - incoming;
    const regions = [
      { name: 'vertical', x0: Math.floor(turn) - 2, x1: Math.ceil(turn) + 2, y0: 30, y1: 70, color: ownColor(row), minimum: 30 },
      { name: 'incoming arm', x0: Math.floor(turn - slot * 0.75), x1: Math.floor(turn - slot * 0.25), y0: incoming - 2, y1: incoming + 3, color: ownColor(row), minimum: 1 },
      { name: 'outgoing arm', x0: Math.ceil(turn + slot * 0.25), x1: Math.ceil(turn + slot * 0.75), y0: outgoing - 2, y1: outgoing + 3, color: ownColor(row), minimum: 1 },
    ];
    for (const region of regions) {
      expect(region.x0).toBeGreaterThanOrEqual(0);
      expect(region.x1).toBeLessThanOrEqual(trace.ink.width);
      let ownInk = 0;
      for (let y = region.y0; y < region.y1; y++) for (let x = region.x0; x < region.x1; x++) {
        const rgba = pixel(x, y);
        if (rgba[3] >= 100 && (region.name !== 'vertical' || region.color.every((value, index) => Math.abs(value - rgba[index]) <= 2))) ownInk++;
      }
      expect(ownInk, `phase${transition.phase} own${transition.ownIndex} ${region.name} visible ink`).toBeGreaterThan(region.minimum);
    }
    // This local primitive fixes paint visibility; native credit remains location/direction only.
    const reference = createCanvas(trace.ink.width, trace.ink.height).getContext('2d');
    reference.strokeStyle = '#' + ownColor(row).map(value => value.toString(16).padStart(2, '0')).join('');
    reference.lineWidth = 1;
    reference.lineCap = 'round';
    reference.beginPath();
    reference.moveTo(turn, incoming);
    reference.lineTo(turn, outgoing);
    reference.stroke();
    const vertical = regions[0];
    const expected = reference.getImageData(vertical.x0, vertical.y0, vertical.x1 - vertical.x0, vertical.y1 - vertical.y0);
    const actual = [];
    for (let y = vertical.y0; y < vertical.y1; y++) for (let x = vertical.x0; x < vertical.x1; x++) actual.push(...pixel(x, y));
    expect(actual, `phase${transition.phase} own${transition.ownIndex} exact vertical RGBA`).toEqual([...expected.data]);
    const center = Math.round(trace.x(row));
    expect(pixel(center, 50)[3], `phase${transition.phase} bar-centre alternative remains blank`).toBe(0);
  });
}
