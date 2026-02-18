import type { ChartMargins, Viewport } from '../types';

import {
  calculateNiceStep,
  formatTimeLabel,
  generatePriceMarkers,
  generateTimeMarkers,
  priceToY,
  timeToX,
  xToTime,
  yToPrice,
} from './coordinates';

// Shared test fixtures
const defaultMargins: ChartMargins = { top: 10, right: 58, bottom: 30, left: 5 };

const defaultViewport: Viewport = {
  startTime: 1700000000000, // Nov 14, 2023
  endTime: 1700086400000, // ~24h later
  priceMin: 65000,
  priceMax: 66000,
};

// ============================================================================
// priceToY / yToPrice
// ============================================================================

describe('priceToY', () => {
  const priceHeight = 400;

  it('maps priceMax to margins.top', () => {
    const y = priceToY(defaultViewport.priceMax, defaultViewport, priceHeight, defaultMargins);
    expect(y).toBe(defaultMargins.top);
  });

  it('maps priceMin to margins.top + priceHeight', () => {
    const y = priceToY(defaultViewport.priceMin, defaultViewport, priceHeight, defaultMargins);
    expect(y).toBe(defaultMargins.top + priceHeight);
  });

  it('maps mid-price to midpoint of drawable area', () => {
    const midPrice = (defaultViewport.priceMin + defaultViewport.priceMax) / 2;
    const y = priceToY(midPrice, defaultViewport, priceHeight, defaultMargins);
    expect(y).toBe(defaultMargins.top + priceHeight / 2);
  });

  it('works with different margin values', () => {
    const margins: ChartMargins = { top: 50, right: 100, bottom: 60, left: 20 };
    const y = priceToY(defaultViewport.priceMax, defaultViewport, priceHeight, margins);
    expect(y).toBe(50);
  });

  it('works with negative prices', () => {
    const viewport: Viewport = { startTime: 0, endTime: 1000, priceMin: -100, priceMax: -50 };
    const y = priceToY(-75, viewport, priceHeight, defaultMargins);
    expect(y).toBe(defaultMargins.top + priceHeight / 2);
  });

  it('returns NaN for zero-range viewport (division by zero)', () => {
    const viewport: Viewport = { startTime: 0, endTime: 1000, priceMin: 100, priceMax: 100 };
    const y = priceToY(100, viewport, priceHeight, defaultMargins);
    expect(y).toBeNaN();
  });
});

describe('yToPrice', () => {
  const priceHeight = 400;

  it('maps margins.top back to priceMax', () => {
    const price = yToPrice(defaultMargins.top, defaultViewport, priceHeight, defaultMargins);
    expect(price).toBe(defaultViewport.priceMax);
  });

  it('maps margins.top + priceHeight back to priceMin', () => {
    const price = yToPrice(defaultMargins.top + priceHeight, defaultViewport, priceHeight, defaultMargins);
    expect(price).toBeCloseTo(defaultViewport.priceMin, 5);
  });
});

describe('priceToY / yToPrice round-trip', () => {
  const priceHeight = 400;

  it('round-trip returns original price within floating point tolerance', () => {
    const originalPrice = 65432.1;
    const y = priceToY(originalPrice, defaultViewport, priceHeight, defaultMargins);
    const recovered = yToPrice(y, defaultViewport, priceHeight, defaultMargins);
    expect(recovered).toBeCloseTo(originalPrice, 5);
  });
});

// ============================================================================
// timeToX / xToTime
// ============================================================================

describe('timeToX', () => {
  const chartWidth = 800;

  it('maps startTime to margins.left', () => {
    const x = timeToX(defaultViewport.startTime, defaultViewport, chartWidth, defaultMargins);
    expect(x).toBe(defaultMargins.left);
  });

  it('maps endTime to margins.left + chartWidth', () => {
    const x = timeToX(defaultViewport.endTime, defaultViewport, chartWidth, defaultMargins);
    expect(x).toBe(defaultMargins.left + chartWidth);
  });

  it('maps mid-time to midpoint of drawable area', () => {
    const midTime = (defaultViewport.startTime + defaultViewport.endTime) / 2;
    const x = timeToX(midTime, defaultViewport, chartWidth, defaultMargins);
    expect(x).toBe(defaultMargins.left + chartWidth / 2);
  });

  it('works with different margin values', () => {
    const margins: ChartMargins = { top: 50, right: 100, bottom: 60, left: 20 };
    const x = timeToX(defaultViewport.startTime, defaultViewport, chartWidth, margins);
    expect(x).toBe(20);
  });

  it('returns NaN for zero-range viewport (division by zero)', () => {
    const viewport: Viewport = { startTime: 5000, endTime: 5000, priceMin: 0, priceMax: 100 };
    const x = timeToX(5000, viewport, chartWidth, defaultMargins);
    expect(x).toBeNaN();
  });
});

describe('xToTime', () => {
  const chartWidth = 800;

  it('maps margins.left back to startTime', () => {
    const time = xToTime(defaultMargins.left, defaultViewport, chartWidth, defaultMargins);
    expect(time).toBe(defaultViewport.startTime);
  });
});

describe('timeToX / xToTime round-trip', () => {
  const chartWidth = 800;

  it('round-trip returns original time within floating point tolerance', () => {
    const originalTime = 1700043200000;
    const x = timeToX(originalTime, defaultViewport, chartWidth, defaultMargins);
    const recovered = xToTime(x, defaultViewport, chartWidth, defaultMargins);
    expect(recovered).toBeCloseTo(originalTime, 0);
  });
});

// ============================================================================
// generatePriceMarkers
// ============================================================================

describe('generatePriceMarkers', () => {
  it('returns empty array for zero-range viewport (priceMax === priceMin)', () => {
    const viewport: Viewport = { startTime: 0, endTime: 1000, priceMin: 100, priceMax: 100 };
    expect(generatePriceMarkers(viewport, 400)).toEqual([]);
  });

  it('returns empty array when priceMax < priceMin', () => {
    const viewport: Viewport = { startTime: 0, endTime: 1000, priceMin: 200, priceMax: 100 };
    expect(generatePriceMarkers(viewport, 400)).toEqual([]);
  });

  it('returns array of nice round numbers for typical BTC range', () => {
    const viewport: Viewport = { startTime: 0, endTime: 1000, priceMin: 65000, priceMax: 66000 };
    const markers = generatePriceMarkers(viewport, 400);
    expect(markers.length).toBeGreaterThanOrEqual(2);
    // Markers should be round multiples (divisible by some step like 100 or 200)
    for (const marker of markers) {
      // At this range, markers should be multiples of at least 50
      expect(marker % 50).toBeCloseTo(0, 5);
    }
  });

  it('all markers are within or near viewport bounds', () => {
    const viewport: Viewport = { startTime: 0, endTime: 1000, priceMin: 65000, priceMax: 66000 };
    const markers = generatePriceMarkers(viewport, 400);
    for (const marker of markers) {
      // Markers can be slightly outside viewport due to grid alignment, but not wildly so
      expect(marker).toBeGreaterThanOrEqual(viewport.priceMin - 1000);
      expect(marker).toBeLessThanOrEqual(viewport.priceMax + 1000);
    }
  });

  it('respects minimum spacing - no more than priceHeight/24 markers', () => {
    const priceHeight = 400;
    const viewport: Viewport = { startTime: 0, endTime: 1000, priceMin: 65000, priceMax: 66000 };
    const markers = generatePriceMarkers(viewport, priceHeight);
    const maxLabels = Math.floor(priceHeight / 24);
    expect(markers.length).toBeLessThanOrEqual(maxLabels);
  });

  it('works for tiny prices (e.g., 0.00001 to 0.00002)', () => {
    const viewport: Viewport = { startTime: 0, endTime: 1000, priceMin: 0.00001, priceMax: 0.00002 };
    const markers = generatePriceMarkers(viewport, 400);
    expect(markers.length).toBeGreaterThanOrEqual(2);
    for (const marker of markers) {
      expect(marker).toBeGreaterThanOrEqual(0);
      expect(marker).toBeLessThanOrEqual(0.0001);
    }
  });

  it('works for huge prices (e.g., 100000 to 200000)', () => {
    const viewport: Viewport = { startTime: 0, endTime: 1000, priceMin: 100000, priceMax: 200000 };
    const markers = generatePriceMarkers(viewport, 400);
    expect(markers.length).toBeGreaterThanOrEqual(2);
    for (const marker of markers) {
      expect(marker).toBeGreaterThanOrEqual(50000);
      expect(marker).toBeLessThanOrEqual(250000);
    }
  });

  it('large priceHeight produces more markers than small priceHeight', () => {
    const viewport: Viewport = { startTime: 0, endTime: 1000, priceMin: 65000, priceMax: 66000 };
    const markersLarge = generatePriceMarkers(viewport, 1000);
    const markersSmall = generatePriceMarkers(viewport, 100);
    expect(markersLarge.length).toBeGreaterThanOrEqual(markersSmall.length);
  });

  it('small priceHeight (50px) produces very few markers', () => {
    const viewport: Viewport = { startTime: 0, endTime: 1000, priceMin: 65000, priceMax: 66000 };
    const markers = generatePriceMarkers(viewport, 50);
    expect(markers.length).toBeLessThanOrEqual(2);
  });

  it('markers are sorted in ascending order', () => {
    const viewport: Viewport = { startTime: 0, endTime: 1000, priceMin: 65000, priceMax: 66000 };
    const markers = generatePriceMarkers(viewport, 400);
    for (let i = 1; i < markers.length; i++) {
      expect(markers[i]).toBeGreaterThan(markers[i - 1]);
    }
  });
});

// ============================================================================
// generateTimeMarkers
// ============================================================================

describe('generateTimeMarkers', () => {
  it('returns empty array for zero-range viewport', () => {
    const viewport: Viewport = { startTime: 5000, endTime: 5000, priceMin: 0, priceMax: 100 };
    expect(generateTimeMarkers(viewport, 800)).toEqual([]);
  });

  it('returns empty array when endTime < startTime', () => {
    const viewport: Viewport = { startTime: 10000, endTime: 5000, priceMin: 0, priceMax: 100 };
    expect(generateTimeMarkers(viewport, 800)).toEqual([]);
  });

  it('all markers have step property > 0', () => {
    const markers = generateTimeMarkers(defaultViewport, 800);
    expect(markers.length).toBeGreaterThan(0);
    for (const marker of markers) {
      expect(marker.step).toBeGreaterThan(0);
    }
  });

  it('first marker has showMonthLabel: true', () => {
    const markers = generateTimeMarkers(defaultViewport, 800);
    expect(markers.length).toBeGreaterThan(0);
    expect(markers[0].showMonthLabel).toBe(true);
  });

  it('narrow chart (100px) produces very few markers', () => {
    const markers = generateTimeMarkers(defaultViewport, 100);
    expect(markers.length).toBeLessThanOrEqual(3);
  });

  it('wide chart (2000px) produces more markers than narrow chart', () => {
    const markersWide = generateTimeMarkers(defaultViewport, 2000);
    const markersNarrow = generateTimeMarkers(defaultViewport, 200);
    expect(markersWide.length).toBeGreaterThan(markersNarrow.length);
  });
});

// ============================================================================
// formatTimeLabel
// ============================================================================

describe('formatTimeLabel', () => {
  // Use a fixed date: Jan 15, 2024 14:30:00 UTC
  const testTime = new Date('2024-01-15T14:30:00Z').getTime();

  it('step >= 1 year returns full year string', () => {
    const step = 31536000000; // 1 year in ms
    const label = formatTimeLabel(testTime, step);
    expect(label).toBe('2024');
  });

  it('step >= 1 month returns "Mon \'YY"', () => {
    const step = 2592000000; // 30 days in ms
    const label = formatTimeLabel(testTime, step);
    const date = new Date(testTime);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    expect(label).toBe(`${months[date.getMonth()]} '${date.getFullYear().toString().slice(-2)}`);
  });

  it('step >= 1 day without showMonthLabel returns day number', () => {
    const step = 86400000; // 1 day in ms
    const label = formatTimeLabel(testTime, step, false);
    const date = new Date(testTime);
    expect(label).toBe(date.getDate().toString());
  });

  it('step >= 1 day with showMonthLabel returns "Mon \'YY"', () => {
    const step = 86400000; // 1 day in ms
    const label = formatTimeLabel(testTime, step, true);
    const date = new Date(testTime);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    expect(label).toBe(`${months[date.getMonth()]} '${date.getFullYear().toString().slice(-2)}`);
  });

  it('step >= 1 hour without showMonthLabel returns "H:00"', () => {
    const step = 3600000; // 1 hour in ms
    const label = formatTimeLabel(testTime, step, false);
    const date = new Date(testTime);
    expect(label).toBe(`${date.getHours()}:00`);
  });

  it('step < 1 hour returns "H:MM"', () => {
    const step = 1800000; // 30 minutes in ms
    const label = formatTimeLabel(testTime, step, false);
    const date = new Date(testTime);
    expect(label).toBe(`${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`);
  });
});

// ============================================================================
// calculateNiceStep
// ============================================================================

describe('calculateNiceStep', () => {
  it('returns nice numbers (1, 2, 5, or multiples thereof)', () => {
    const step = calculateNiceStep(100, 7);
    const magnitude = Math.pow(10, Math.floor(Math.log10(step)));
    const normalized = step / magnitude;
    expect([1, 2, 5, 10]).toContain(normalized);
  });

  it('range=100, targetSteps=5 returns 20', () => {
    expect(calculateNiceStep(100, 5)).toBe(20);
  });

  it('range=1000, targetSteps=3 returns 500', () => {
    expect(calculateNiceStep(1000, 3)).toBe(500);
  });

  it('range=0.1, targetSteps=10 returns 0.01', () => {
    expect(calculateNiceStep(0.1, 10)).toBeCloseTo(0.01, 10);
  });
});
