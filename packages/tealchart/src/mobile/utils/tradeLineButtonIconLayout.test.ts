import { describe, expect, it } from 'vitest';

import { createNativeCloseButtonIconLines, createNativeReverseButtonIconLines } from './tradeLineButtonIconLayout';

describe('native trade line button icon layout', () => {
  it('centers close icons inside the trade-line button box', () => {
    const lines = createNativeCloseButtonIconLines({ x: 100, y: 40, width: 16, height: 18 });
    const yValues = lines.flatMap((line) => [line.y1, line.y2]);
    const xValues = lines.flatMap((line) => [line.x1, line.x2]);

    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.strokeWidth)).toEqual([1.8, 1.8]);
    expect(Math.min(...xValues)).toBe(104);
    expect(Math.max(...xValues)).toBe(112);
    expect(Math.min(...yValues)).toBe(45);
    expect(Math.max(...yValues)).toBe(53);
    expect((Math.min(...xValues) + Math.max(...xValues)) / 2).toBe(108);
    expect((Math.min(...yValues) + Math.max(...yValues)) / 2).toBe(49);
    expect(lines[0]).toMatchObject({ x1: 104, y1: 45, x2: 112, y2: 53 });
    expect(lines[1]).toMatchObject({ x1: 112, y1: 45, x2: 104, y2: 53 });
  });

  it('centers reverse icons inside the trade-line button box', () => {
    const lines = createNativeReverseButtonIconLines({ x: 100, y: 40, width: 16, height: 18 });
    const yValues = lines.flatMap((line) => [line.y1, line.y2]);
    const xValues = lines.flatMap((line) => [line.x1, line.x2]);

    expect(lines).toHaveLength(4);
    expect(lines.map((line) => line.strokeWidth)).toEqual([1.4, 1.4, 1.4, 1.4]);
    expect(Math.min(...xValues)).toBe(103);
    expect(Math.max(...xValues)).toBe(113);
    expect(Math.min(...yValues)).toBe(43);
    expect(Math.max(...yValues)).toBe(55);
    expect((Math.min(...xValues) + Math.max(...xValues)) / 2).toBe(108);
    expect((Math.min(...yValues) + Math.max(...yValues)) / 2).toBe(49);
    expect(lines[0]).toMatchObject({ x1: 103, y1: 46, x2: 113, y2: 46 });
    expect(lines[1]).toMatchObject({ x1: 110, y1: 43, x2: 113, y2: 46 });
    expect(lines[2]).toMatchObject({ x1: 103, y1: 52, x2: 113, y2: 52 });
    expect(lines[3]).toMatchObject({ x1: 106, y1: 55, x2: 103, y2: 52 });
  });
});
