import { describe, expect, it } from 'vitest';

import {
  calculatePartialBracketPercent,
  calculatePartialBracketPercentFromDelta,
  PARTIAL_BRACKET_DIMMED_OPACITY,
  PARTIAL_BRACKET_MARKER_INTERVAL,
  resolvePartialBracketMarkers,
} from './partialBrackets';

const BASE = {
  dragStartX: 400,
  zoneLeft: 0,
  zoneRight: 800,
  characterWidth: 6,
  paddingX: 6,
  minGap: 8,
};

const markersAt = (currentX: number, overrides: Partial<typeof BASE> = {}) =>
  resolvePartialBracketMarkers({ ...BASE, ...overrides, currentX });

describe('calculatePartialBracketPercentFromDelta', () => {
  // The bands split on the midpoints between markers spaced 55px apart.
  it('steps down through the ladder as the drag lengthens', () => {
    expect(calculatePartialBracketPercentFromDelta(0)).toBe(100);
    expect(calculatePartialBracketPercentFromDelta(27)).toBe(100);
    expect(calculatePartialBracketPercentFromDelta(28)).toBe(75);
    expect(calculatePartialBracketPercentFromDelta(82)).toBe(75);
    expect(calculatePartialBracketPercentFromDelta(137)).toBe(50);
    expect(calculatePartialBracketPercentFromDelta(192)).toBe(25);
    expect(calculatePartialBracketPercentFromDelta(193)).toBe(10);
  });

  it('is direction agnostic', () => {
    for (const delta of [30, 90, 150, 200]) {
      expect(calculatePartialBracketPercentFromDelta(-delta)).toBe(calculatePartialBracketPercentFromDelta(delta));
    }
  });

  it('reads the same through the start/current wrapper', () => {
    expect(calculatePartialBracketPercent(400, 300)).toBe(calculatePartialBracketPercentFromDelta(-100));
  });
});

describe('resolvePartialBracketMarkers', () => {
  // Was mirrored, so every percent except 100 appeared twice with nothing
  // saying which side was active.
  describe('one arm only', () => {
    it('draws each percent exactly once', () => {
      const percents = markersAt(560).map((marker) => marker.percent);
      expect(percents).toEqual([100, 75, 50, 25, 10]);
      expect(new Set(percents).size).toBe(percents.length);
    });

    it('lays the ladder out to the right when dragging right', () => {
      const markers = markersAt(560);
      expect(markers[0].centerX).toBe(400);
      expect(markers[1].centerX).toBe(400 + PARTIAL_BRACKET_MARKER_INTERVAL);
      expect(markers[4].centerX).toBe(400 + PARTIAL_BRACKET_MARKER_INTERVAL * 4);
    });

    it('mirrors the ladder to the left when dragging left', () => {
      const markers = markersAt(240);
      expect(markers[1].centerX).toBe(400 - PARTIAL_BRACKET_MARKER_INTERVAL);
      expect(markers[4].centerX).toBe(400 - PARTIAL_BRACKET_MARKER_INTERVAL * 4);
    });

    // A one-sided ladder must not imply a one-sided percent.
    it('marks the same percent active whichever way the drag went', () => {
      const right = markersAt(400 + 100).find((marker) => marker.isActive);
      const left = markersAt(400 - 100).find((marker) => marker.isActive);
      expect(right?.percent).toBe(left?.percent);
      expect(right?.percent).toBe(calculatePartialBracketPercentFromDelta(100));
    });
  });

  // Native deleted markers near the active one, so they blinked out and back.
  describe('crowded markers dim rather than vanish', () => {
    it('keeps every marker present', () => {
      expect(markersAt(400).length).toBe(5);
      expect(markersAt(700).length).toBe(5);
    });

    it('dims a neighbour that crowds the active marker', () => {
      const markers = markersAt(400, { characterWidth: 24 });
      const active = markers.find((marker) => marker.isActive);
      const neighbour = markers[1];
      expect(active?.opacity).toBe(1);
      expect(neighbour.opacity).toBe(PARTIAL_BRACKET_DIMMED_OPACITY);
    });

    it('leaves well-spaced markers at full opacity', () => {
      expect(markersAt(400).every((marker) => marker.opacity === 1)).toBe(true);
    });
  });

  // Markers used to clip individually, leaving a lopsided run.
  describe('the ladder shifts as one piece to stay in the pane', () => {
    it('keeps every marker inside a tight zone', () => {
      const markers = markersAt(560, { dragStartX: 700, zoneRight: 760 });
      for (const marker of markers) {
        expect(marker.centerX + marker.width / 2).toBeLessThanOrEqual(760.001);
      }
    });

    it('keeps the spacing even after shifting', () => {
      const markers = markersAt(560, { dragStartX: 700, zoneRight: 760 });
      for (let i = 1; i < markers.length; i += 1) {
        expect(Math.abs(markers[i].centerX - markers[i - 1].centerX)).toBeCloseTo(PARTIAL_BRACKET_MARKER_INTERVAL, 6);
      }
    });

    it('shifts right off a left edge too', () => {
      const markers = markersAt(40, { dragStartX: 100, zoneLeft: 20 });
      for (const marker of markers) {
        expect(marker.centerX - marker.width / 2).toBeGreaterThanOrEqual(19.999);
      }
    });
  });
});
