import { describe, expect, it, vi } from 'vitest';

import { entries } from '../../../tealscript/tests/fixtures/v104Step';
import { stepSegments, traceStep, type StepChannel } from '../test/v104StepPaint';

vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useMemo: <T,>(factory: () => T) => factory() }));

const channels: StepChannel[] = ['web', 'web-pane', 'web-unified', 'web-index', 'native', 'native-static'];

describe('local composition of width-scaled dashes and native-bound half-slot turns', () => {
  for (const entry of entries) for (const channel of channels) for (const width of [1, 4, 8]) {
    for (const style of ['dashed', 'dotted'] as const) for (const series of [false, true]) {
      it(`${entry.id} ${channel} ${style} width${width} ${series ? 'series' : 'scalar'}: own pattern and both own turns`, () => {
        const colors = ['#2962ff', '#00aa00'];
        const colorAt = (row: number) => series ? colors[(row - entry.first) % colors.length] : colors[0];
        const trace = traceStep(entry, channel, {
          linewidth: width,
          lineStyle: style,
          color: series ? entry.csv.rows.slice(entry.first - 1, entry.anchor).map((_, i) => colors[i % colors.length]) : colors[0],
        }, true);
        const slot = trace.x(entry.primary[1]) - trace.x(entry.primary[0]);
        const pattern = style === 'dashed' ? [6 * width, 4 * width] : [2 * width, 3 * width];
        const strokes = trace.paints.filter(paint => paint.kind === 'stroke');
        expect(strokes.length).toBeGreaterThan(0);
        for (const stroke of strokes) expect(stroke.dash).toEqual(pattern);

        for (const transition of entry.certificate.transitions) {
          const row = transition.inputIndex.rowOrdinal;
          const turn = trace.x(row) - slot / 2;
          const owned = strokes.flatMap(paint => stepSegments([paint]).filter(([a, b]) =>
            Math.abs(a.x - turn) < 1e-8 && Math.abs(b.x - turn) < 1e-8 && Math.abs(a.y - b.y) > 1,
          ).map(segment => ({ paint, segment })));
          expect(owned, `phase${transition.phase} own half-slot`).toHaveLength(1);
          expect(owned[0].paint.color.toLowerCase()).toBe(colorAt(row));
          expect(owned[0].paint.dash).toEqual(pattern);
          const [a, b] = owned[0].segment;
          expect([a.y, b.y]).toEqual(transition.phase === 8 ? [75, 25] : [25, 75]);
        }

        const rising = entry.certificate.transitions.find((transition: any) => transition.phase === 8)!;
        const falling = entry.certificate.transitions.find((transition: any) => transition.phase === 24)!;
        const left = Math.ceil(trace.x(rising.inputIndex.rowOrdinal) - slot / 2 + width * 1.5);
        const right = Math.floor(trace.x(falling.inputIndex.rowOrdinal) - slot / 2 - width * 1.5);
        expect(left).toBeGreaterThanOrEqual(0);
        expect(right).toBeLessThan(trace.ink.width);
        const ink = Array.from({ length: right - left }, (_, i) => trace.ink.data[(25 * trace.ink.width + left + i) * 4 + 3] > 100);
        expect(ink.filter(Boolean).length).toBeGreaterThan(0);
        if (!series) {
          const period = pattern[0] + pattern[1];
          expect(ink.length).toBeGreaterThan(period * 2);
          expect(ink.filter(value => !value).length).toBeGreaterThan(0);
          expect(ink.slice(period)).toEqual(ink.slice(0, -period));
        }
      });
    }
  }
});
