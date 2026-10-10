import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import {
  resolveNativeIndicatorOutputAxisLabelGroups,
  resolveNativeIndicatorOutputLiveLabels,
} from './NativeIndicatorOutputAxisLabelLayer';

const frame = createNativeChartFrameFromPanes({
  dimensions: { width: 390, height: 420, margins: { bottom: 32, left: 0, right: 76, top: 24 } },
  panes: [
    { id: 'main', type: 'main', top: 24, height: 200, yMin: 0, yMax: 100 },
    { id: 'rsi', type: 'indicator', top: 224, height: 164, yMin: 0, yMax: 100 },
  ],
});
const axisFont = { measureText: (text: string) => ({ width: text.length * 6 }) } as never;
const pane = frame.panes[1]!;
const label = (id: string, value: number, text: string, color = '#fff') => ({
  id,
  pane,
  value,
  text,
  color,
  valueY: 300,
  y: 296,
  sourceTime: 120_000,
});
const committedGroups = resolveNativeIndicatorOutputAxisLabelGroups({
  axisFont,
  frame,
  labels: [label('rsi:a', 51.2, '51.20'), label('rsi:b', 40, '40.00')],
});

describe('resolveNativeIndicatorOutputLiveLabels', () => {
  it('moves readouts that keep their tags, laid out against the committed width', () => {
    const live = resolveNativeIndicatorOutputLiveLabels({
      axisFont,
      committedGroups,
      frame,
      nextLabels: [label('rsi:a', 52.4, '52.40'), label('rsi:b', 40, '40.00')],
    });

    expect(live?.['rsi:a']).toMatchObject({ value: 52.4, text: '52.40', labelOffsetFromValueY: -4 });
    expect(live?.['rsi:a']?.textX).toBe(committedGroups[0]!.x + (committedGroups[0]!.width - '52.40'.length * 6) / 2);
  });

  it('hands to React a readout that would widen, recolour, appear or vanish', () => {
    const resolve = (nextLabels: ReturnType<typeof label>[]) =>
      resolveNativeIndicatorOutputLiveLabels({ axisFont, committedGroups, frame, nextLabels });

    expect(resolve([label('rsi:a', 152.4, '152.400000'), label('rsi:b', 40, '40.00')])).toBeNull();
    expect(resolve([label('rsi:a', 52.4, '52.40', '#f00'), label('rsi:b', 40, '40.00')])).toBeNull();
    expect(resolve([label('rsi:a', 52.4, '52.40')])).toBeNull();
    expect(resolve([label('rsi:a', 52.4, '52.40'), label('rsi:c', 40, '40.00')])).toBeNull();
    expect(resolve([{ ...label('rsi:a', 52.4, '52.40'), sourceTime: 60_000 }, label('rsi:b', 40, '40.00')])).toBeNull();
  });
});
