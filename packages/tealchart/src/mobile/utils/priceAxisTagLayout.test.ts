import { describe, expect, it } from 'vitest';

import {
  createNativePriceAxisTagLayout,
  createNativePriceAxisTagTextLayout,
  findNativeResolvedPriceAxisTagCenterY,
  fitNativePriceAxisTextToWidth,
  getNativeCountdownLayoutText,
  getNativePriceAxisPrimaryTextBaselineOffset,
  getNativePriceAxisSecondaryTextBaselineOffset,
  getNativePriceAxisSingleLineTextBaselineOffset,
  getNativePriceLineMeasurementText,
  resolveNativePriceAxisTagStack,
} from './priceAxisTagLayout';

const textWidth = (text: string) => text.length * 7;

function assertNoTagOverlap(tags: ReturnType<typeof resolveNativePriceAxisTagStack>, gap = 2) {
  for (let index = 1; index < tags.length; index += 1) {
    const previous = tags[index - 1];
    const current = tags[index];

    expect(current.centerY - current.height / 2).toBeGreaterThanOrEqual(previous.centerY + previous.height / 2 + gap);
  }
}

describe('native price axis tag layout', () => {
  it('fits long dynamic countdown labels inside the reserved axis tag width', () => {
    const frame = {
      dimensions: {
        width: 390,
      },
    };
    const layoutText = getNativeCountdownLayoutText('100:00:00');
    const tag = createNativePriceAxisTagLayout({
      frame,
      text: layoutText,
      textWidth,
      minWidth: 52,
      paddingX: 6,
      rightInset: 4,
    });
    const liveText = createNativePriceAxisTagTextLayout(tag.x, tag.width, '100:00:00', textWidth, 6);

    expect(liveText.text).toBe('100:00:00');
    expect(liveText.x).toBeGreaterThanOrEqual(tag.x + 6);
    expect(liveText.x + textWidth(liveText.text)).toBeLessThanOrEqual(tag.x + tag.width - 6);
  });

  it('truncates public long countdown values that exceed the axis lane', () => {
    const fitted = fitNativePriceAxisTextToWidth('100000:00:00', 56, textWidth);

    expect(fitted).toMatch(/\.\.\.$/);
    expect(textWidth(fitted)).toBeLessThanOrEqual(56);
  });

  it('uses a wide countdown sample for hour-based countdown labels', () => {
    expect(getNativeCountdownLayoutText('09:59')).toBe('88:88');
    expect(getNativeCountdownLayoutText('1:00:00')).toBe('888:88:88');
  });

  it('chooses the measured widest line label candidate', () => {
    expect(getNativePriceLineMeasurementText('63,777', '88:88', textWidth)).toBe('63,777');
    expect(getNativePriceLineMeasurementText('1', '888:88:88', textWidth)).toBe('888:88:88');
  });

  it('centers text inside a fixed-width price-axis tag', () => {
    const layout = createNativePriceAxisTagTextLayout(100, 120, '63,777', textWidth, 6);

    expect(layout.x).toBe(100 + (120 - textWidth('63,777')) / 2);
  });

  it('derives price-line tag text baselines from tag height', () => {
    expect(getNativePriceAxisSingleLineTextBaselineOffset(22)).toBe(15);
    expect(getNativePriceAxisPrimaryTextBaselineOffset(34)).toBe(14);
    expect(getNativePriceAxisSecondaryTextBaselineOffset(34)).toBe(27);
  });

  it('keeps tags inside the right price-axis lane', () => {
    const tag = createNativePriceAxisTagLayout({
      frame: {
        dimensions: {
          width: 380,
        },
      },
      text: '63,777.0',
      textWidth,
      minWidth: 52,
      paddingX: 6,
      rightInset: 4,
    });

    expect(tag.x).toBeGreaterThanOrEqual(302);
    expect(tag.x + tag.width).toBeLessThanOrEqual(376);
  });

  it('lets wide price-axis tags grow left while preserving the full label', () => {
    const tag = createNativePriceAxisTagLayout({
      frame: {
        dimensions: {
          width: 380,
        },
      },
      text: '123,456,789.0',
      textWidth,
      minWidth: 52,
      paddingX: 6,
      rightInset: 4,
    });

    expect(tag.text).toBe('123,456,789.0');
    expect(tag.x).toBeLessThan(302);
    expect(tag.x + tag.width).toBe(376);
    expect(tag.textX + textWidth(tag.text)).toBe(370);
  });

  it('stacks overlapping price-axis tags without changing their order', () => {
    const tags = resolveNativePriceAxisTagStack(
      [
        { id: 'last', originalY: 100, height: 34, priority: 100 },
        { id: 'tp', originalY: 108, height: 34, priority: 70 },
        { id: 'order', originalY: 112, height: 20, priority: 90 },
      ],
      40,
      180,
      2,
    );

    expect(tags.map((tag) => tag.id)).toEqual(['last', 'tp', 'order']);
    assertNoTagOverlap(tags);
  });

  it('keeps stacked tags within the visible price-axis lane', () => {
    const tags = resolveNativePriceAxisTagStack(
      [
        { id: 'a', originalY: 166, height: 34 },
        { id: 'b', originalY: 170, height: 34 },
        { id: 'c', originalY: 174, height: 34 },
      ],
      20,
      180,
      2,
    );

    expect(tags[0].centerY - tags[0].height / 2).toBeGreaterThanOrEqual(20);
    expect(tags[tags.length - 1].centerY + tags[tags.length - 1].height / 2).toBeLessThanOrEqual(180);
  });

  it('does not clamp offscreen tags into the visible price-axis lane', () => {
    const tags = resolveNativePriceAxisTagStack(
      [
        { id: 'above', originalY: -120, height: 22, priority: 100 },
        { id: 'visible', originalY: 100, height: 22, priority: 90 },
        { id: 'below', originalY: 320, height: 22, priority: 100 },
      ],
      20,
      180,
      2,
    );

    expect(tags.map((tag) => tag.id)).toEqual(['visible']);
    expect(findNativeResolvedPriceAxisTagCenterY(tags, 'above', -120)).toBe(-120);
    expect(findNativeResolvedPriceAxisTagCenterY(tags, 'below', 320)).toBe(320);
  });

  it('anchors the highest-priority tag within a collision cluster', () => {
    const tags = resolveNativePriceAxisTagStack(
      [
        { id: 'bracket', originalY: 92, height: 22, priority: 70 },
        { id: 'last', originalY: 100, height: 34, priority: 100 },
        { id: 'order', originalY: 108, height: 20, priority: 90 },
      ],
      20,
      180,
      2,
    );

    expect(findNativeResolvedPriceAxisTagCenterY(tags, 'last', 0)).toBe(100);
    expect(findNativeResolvedPriceAxisTagCenterY(tags, 'bracket', 0)).toBeLessThan(100);
    expect(findNativeResolvedPriceAxisTagCenterY(tags, 'order', 0)).toBeGreaterThan(100);
  });

  it('keeps a fixed last-trade tag at its projected price while moving overlapping tags', () => {
    const tags = resolveNativePriceAxisTagStack(
      [
        { id: 'position', originalY: 92, height: 22, priority: 90 },
        { id: 'last', originalY: 100, height: 34, priority: 100, fixed: true },
        { id: 'order', originalY: 108, height: 22, priority: 90 },
      ],
      20,
      180,
      2,
    );

    expect(findNativeResolvedPriceAxisTagCenterY(tags, 'last', 0)).toBe(100);
    assertNoTagOverlap(tags);
  });

  it('does not use bottom overflow correction to move a fixed last-trade tag', () => {
    const tags = resolveNativePriceAxisTagStack(
      [
        { id: 'last', originalY: 140, height: 34, priority: 100, fixed: true },
        { id: 'order', originalY: 146, height: 22, priority: 90 },
      ],
      20,
      180,
      2,
    );

    expect(findNativeResolvedPriceAxisTagCenterY(tags, 'last', 0)).toBe(140);
    assertNoTagOverlap(tags);
  });

  it('does not use top overflow correction to overlap a fixed last-trade tag', () => {
    const tags = resolveNativePriceAxisTagStack(
      [
        { id: 'order', originalY: 40, height: 34, priority: 90 },
        { id: 'last', originalY: 48, height: 34, priority: 100, fixed: true },
      ],
      20,
      180,
      2,
    );

    expect(findNativeResolvedPriceAxisTagCenterY(tags, 'last', 0)).toBe(48);
    assertNoTagOverlap(tags);
  });

  it('clusters through the full cluster bounds when tag heights differ', () => {
    const tags = resolveNativePriceAxisTagStack(
      [
        { id: 'wide', originalY: 100, height: 80, priority: 100 },
        { id: 'small', originalY: 145, height: 10, priority: 10 },
        { id: 'tail', originalY: 150, height: 12, priority: 10 },
      ],
      20,
      220,
      2,
    );

    expect(findNativeResolvedPriceAxisTagCenterY(tags, 'wide', 0)).toBe(100);
    expect(findNativeResolvedPriceAxisTagCenterY(tags, 'tail', 0)).toBeGreaterThan(145);
  });

  // The plot floor is the top of the time axis, which carries the date ticks
  // and the settings gear. A label reaching into it gets drawn over.
  it('keeps a fixed tag inside the plot instead of letting it reach the time axis', () => {
    const tags = resolveNativePriceAxisTagStack(
      // A two-line countdown tag, priced within the pane but near its floor.
      [{ id: 'last', originalY: 195, height: 34, fixed: true }],
      0,
      200,
    );

    expect(tags).toHaveLength(1);
    expect(tags[0].centerY + tags[0].height / 2).toBeLessThanOrEqual(200);
    expect(tags[0].fixed).toBe(true);
    // Still anchors the stack — it just cannot leave the plot to do it.
    expect(tags[0].originalY).toBe(195);
  });

  it('finds resolved tag centers by stable id with fallback', () => {
    const tags = resolveNativePriceAxisTagStack([{ id: 'last', originalY: 100, height: 22 }], 0, 200);

    expect(findNativeResolvedPriceAxisTagCenterY(tags, 'last', 1)).toBe(100);
    expect(findNativeResolvedPriceAxisTagCenterY(tags, 'missing', 1)).toBe(1);
  });
});

describe('native price axis tag overflow', () => {
  it('leaves a tag with the axis to itself on its own line when another overflows the top', () => {
    // The last-trade tag is pinned and can poke above the pane; the order tag
    // 260px below it has nothing to give way to.
    const resolved = resolveNativePriceAxisTagStack(
      [
        { id: 'priceLine:last-trade', originalY: 40, height: 34, fixed: true },
        { id: 'order:1', originalY: 300, height: 20 },
      ],
      30,
      600,
    );

    expect(resolved.find((tag) => tag.id === 'order:1')?.centerY).toBe(300);
  });

  it('still moves the run that is packed against the overflowing edge', () => {
    const resolved = resolveNativePriceAxisTagStack(
      [
        { id: 'order:1', originalY: 585, height: 20 },
        { id: 'order:2', originalY: 595, height: 20 },
        { id: 'order:3', originalY: 300, height: 20 },
      ],
      30,
      600,
    );
    const bottom = resolved[resolved.length - 1];

    expect(bottom.centerY + bottom.height / 2).toBeLessThanOrEqual(600);
    // The distant tag keeps its place while the crowded pair closes up.
    expect(resolved.find((tag) => tag.id === 'order:3')?.centerY).toBe(300);
  });
});
