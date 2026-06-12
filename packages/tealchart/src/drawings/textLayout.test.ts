import { describe, expect, it } from 'vitest';

import {
  measureUserDrawingTextLines,
  resolveUserDrawingTextEditMetrics,
  resolveUserDrawingTextLabelLayout,
  splitUserDrawingTextLines,
} from './textLayout';

describe('user drawing text layout', () => {
  it('splits text labels into platform-stable lines', () => {
    expect(splitUserDrawingTextLines('A\r\nB\nC\rD')).toEqual(['A', 'B', 'C', 'D']);
    expect(splitUserDrawingTextLines('')).toEqual(['']);
  });

  it('resolves text editor metrics from multiline text', () => {
    expect(resolveUserDrawingTextEditMetrics('A\nLonger')).toEqual({
      lines: ['A', 'Longer'],
      longestLineLength: 6,
    });
  });

  it('wraps measured text lines to a bounded box width', () => {
    const measured = measureUserDrawingTextLines('Alpha beta gamma', (line) => line.length * 6, 48);
    expect(measured).toEqual([
      { text: 'Alpha', width: 30 },
      { text: 'beta', width: 24 },
      { text: 'gamma', width: 30 },
    ]);

    expect(
      resolveUserDrawingTextLabelLayout({
        text: 'Alpha beta gamma',
        point: { x: 100, y: 50 },
        textAlign: 'left',
        lines: measured.map((line) => line.text),
        lineWidths: measured.map((line) => line.width),
        boxWidth: 60,
        labelPadding: 6,
        lineHeight: 18,
      }),
    ).toMatchObject({
      box: { x: 70, y: 22, width: 60, height: 56 },
      lines: [
        { text: 'Alpha', width: 30, x: 76, y: 32 },
        { text: 'beta', width: 24, x: 76, y: 50 },
        { text: 'gamma', width: 30, x: 76, y: 68 },
      ],
    });
  });

  it('preserves single-line geometry while expanding multiline labels', () => {
    expect(
      resolveUserDrawingTextLabelLayout({
        text: 'Note',
        point: { x: 50, y: 50 },
        textAlign: 'center',
        lineWidths: [24],
        labelPadding: 6,
        lineHeight: 18,
      }),
    ).toEqual({
      box: { x: 32, y: 40, width: 36, height: 20 },
      lineHeight: 18,
      padding: 6,
      lines: [{ text: 'Note', width: 24, x: 38, y: 50 }],
    });

    expect(
      resolveUserDrawingTextLabelLayout({
        text: 'Longer\nB',
        point: { x: 50, y: 50 },
        textAlign: 'right',
        lineWidths: [36, 6],
        labelPadding: 6,
        lineHeight: 18,
      }),
    ).toEqual({
      box: { x: 26, y: 31, width: 48, height: 38 },
      lineHeight: 18,
      padding: 6,
      lines: [
        { text: 'Longer', width: 36, x: 32, y: 41 },
        { text: 'B', width: 6, x: 62, y: 59 },
      ],
    });
  });
});
