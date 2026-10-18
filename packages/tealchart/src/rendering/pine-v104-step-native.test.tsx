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

const sourcePalettes = {
  constant: ['#2962ff'],
  series: ['#00aa00', '#2962ff'],
  scalar: ['#2962ff'],
  'scalar-alpha': ['#2962ff80'],
  'source-alpha': ['#00aa0080', '#2962ffbf', '#ff8800ff'],
};

for (const entry of entries) for (const channel of channels) for (const [mode, palette] of Object.entries(sourcePalettes)) for (const transition of entry.certificate.transitions) {
  it(`${entry.id} ${channel} paints each own phase${transition.phase} directed turn and directed arms (${mode})`, () => {
    bound(entry.regions.originalPng);
    const colorAt = (row: number) => palette[(row - entry.first) % palette.length];
    const trace = traceStep(entry, channel, palette.length > 1 ? {
      color: entry.csv.rows.slice(entry.first - 1, entry.anchor).map((_, i) => palette[i % palette.length]),
    } : mode.startsWith('scalar') ? { color: palette[0] } : {}, true);
    const slot = trace.x(entry.primary[1]) - trace.x(entry.primary[0]);
    const row = transition.inputIndex.rowOrdinal;
    const turn = trace.x(row) - slot / 2;
    const incoming = transition.phase === 8 ? 75 : 25;
    const outgoing = 100 - incoming;
    for (const ownRow of [row - 1, row, row + 1]) {
      const observed = Array.isArray(trace.plot.color) ? trace.plot.color[ownRow - entry.first] : trace.plot.color;
      expect(observed?.toLowerCase()).toBe(colorAt(ownRow));
    }

    // Source row j owns centre(j-1) -> half-slot(j) -> centre(j), including alpha.
    // Construct from raw source phases/times and literal colours, never recorded paths.
    const reference = createCanvas(trace.ink.width, trace.ink.height).getContext('2d');
    reference.lineWidth = 1;
    reference.lineCap = reference.lineJoin = 'round';
    const levelAt = (ownRow: number) => {
      const phase = Number(entry.csv.raw(ownRow, 'PHASE32'));
      return phase >= 8 && phase < 24 ? 25 : 75;
    };
    const sampleRows = [row - 1, row, row + 1, row + 2];
    const appendSample = (ownRow: number, move: boolean) => {
      if (move) reference.moveTo(trace.x(ownRow - 1), levelAt(ownRow - 1));
      const halfSlot = trace.x(ownRow) - slot / 2;
      reference.lineTo(halfSlot, levelAt(ownRow - 1));
      reference.lineTo(halfSlot, levelAt(ownRow));
      reference.lineTo(trace.x(ownRow), levelAt(ownRow));
    };
    if (mode.startsWith('scalar')) {
      reference.strokeStyle = palette[0];
      reference.beginPath();
      sampleRows.forEach((ownRow, i) => appendSample(ownRow, i === 0));
      reference.stroke();
    } else if (channel.startsWith('native')) {
      // Native groups source-colour subpaths in first-source-occurrence order.
      for (const color of palette) {
        reference.strokeStyle = color;
        reference.beginPath();
        sampleRows.filter(ownRow => colorAt(ownRow) === color).forEach(ownRow => appendSample(ownRow, true));
        reference.stroke();
      }
    } else {
      for (const ownRow of sampleRows) {
        reference.strokeStyle = colorAt(ownRow);
        reference.beginPath();
        appendSample(ownRow, true);
        reference.stroke();
      }
    }
    const regions = [
      { name: 'vertical', x0: Math.floor(turn) - 2, x1: Math.ceil(turn) + 2, y0: 22, y1: 78 },
      { name: 'incoming arm', x0: Math.ceil(turn - slot) + 2, x1: Math.floor(turn) - 2, y0: incoming - 3, y1: incoming + 4 },
      { name: 'outgoing arm', x0: Math.ceil(turn) + 2, x1: Math.floor(turn + slot) - 2, y0: outgoing - 3, y1: outgoing + 4 },
    ];
    for (const region of regions) {
      expect(region.x0).toBeGreaterThanOrEqual(0);
      expect(region.x1).toBeLessThanOrEqual(trace.ink.width);
      const width = region.x1 - region.x0, height = region.y1 - region.y0;
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      const expected = reference.getImageData(region.x0, region.y0, width, height);
      const actual: number[] = [];
      for (let y = region.y0; y < region.y1; y++) for (let x = region.x0; x < region.x1; x++) {
        const i = (y * trace.ink.width + x) * 4;
        actual.push(...trace.ink.data.slice(i, i + 4));
      }
      expect(actual).toHaveLength(expected.data.length);
      const differences = actual.flatMap((value, i) => value === expected.data[i] ? [] : [{ x: region.x0 + Math.floor(i / 4) % width, y: region.y0 + Math.floor(i / 4 / width), component: i % 4, actual: value, expected: expected.data[i] }]);
      // Evaluate every owned patch even when another patch fails.
      expect.soft(differences, `phase${transition.phase} own${transition.ownIndex} ${region.name} source-owned RGBA and geometry ${JSON.stringify(differences.slice(0, 12))}`).toEqual([]);
      expect([...expected.data].filter((value, i) => i % 4 === 3 && value > 0).length).toBeGreaterThan(1);
    }
    const center = Math.round(trace.x(row));
    expect(trace.ink.data[(50 * trace.ink.width + center) * 4 + 3], `phase${transition.phase} bar-centre alternative remains blank`).toBe(0);
  });
}
