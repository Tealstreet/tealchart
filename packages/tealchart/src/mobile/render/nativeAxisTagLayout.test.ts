import { matchFont } from '@shopify/react-native-skia';
import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import {
  createNativeAxisLaneTagLayout,
  createNativeAxisTagLayout,
  getNativeAxisTagTextCharacterCapacity,
} from './nativeAxisTagLayout';

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 320,
    margins: {
      top: 0,
      right: 90,
      bottom: 20,
      left: 0,
    },
  },
  panes: [
    {
      id: 'main',
      type: 'main',
      top: 0,
      height: 300,
      yMin: 0,
      yMax: 100,
    },
  ],
});

describe('native axis tag render layout', () => {
  it('sizes price-axis tags to their content instead of the whole axis lane', () => {
    const font = matchFont({ fontSize: 11 });
    const tag = createNativeAxisTagLayout(frame, font, '0.74737');
    const laneTag = createNativeAxisLaneTagLayout(frame);

    expect(tag.width).toBeLessThan(laneTag.width);
    expect(tag.x + tag.width).toBe(laneTag.x + laneTag.width);
  });

  it('reserves the full right price-axis lane for live drag-preview tags', () => {
    const tag = createNativeAxisLaneTagLayout(frame);

    expect(tag.x).toBe(301);
    expect(tag.width).toBe(88);
    expect(tag.textX).toBe(306);
  });

  it('derives live tag character capacity from padded tag content width', () => {
    expect(getNativeAxisTagTextCharacterCapacity(84, 7)).toBe(10);
    expect(getNativeAxisTagTextCharacterCapacity(12, 7)).toBe(1);
  });
});
