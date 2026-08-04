import type { ReactElement, ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { describe, expect, it } from 'vitest';
import { matchFont } from '@shopify/react-native-skia';

import type { NativeTradeLineGeometry } from '../utils/tradeLineLayout';

import { NativeTradeLineLabelBody } from './NativeTradeLineLabelBody';
import { NativeTradeLineButtonIcon } from './NativeTradeLineButtonIcon';
import { NativeAnimatedSkiaText } from './nativeSkiaText';

function shared<T>(value: T): SharedValue<T> {
  return { value } as SharedValue<T>;
}

function walkElements(node: ReactNode, visitor: (element: ReactElement) => void): void {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (Array.isArray(node)) {
    for (const child of node) walkElements(child, visitor);
    return;
  }
  if (typeof node !== 'object' || !('props' in node)) return;

  const element = node as ReactElement;
  visitor(element);
  walkElements(element.props.children as ReactNode, visitor);
}

function collectElementsByType(root: ReactNode, type: unknown): ReactElement[] {
  const elements: ReactElement[] = [];
  walkElements(root, (element) => {
    if (element.type === type) elements.push(element);
  });
  return elements;
}

const geometry: NativeTradeLineGeometry = {
  objectType: 'position',
  objectId: 'position-btc',
  price: 63777,
  fitting: {
    mode: 'full',
    hiddenActionTypes: [],
    hiddenSegmentIndexes: [],
    truncatedSegmentIndexes: [],
  },
  priceLabelText: '63,777.0',
  priceLabelTextX: 320,
  labelX: 80,
  labelWidth: 220,
  leftLineStartX: 62,
  leftLineEndX: 78,
  rightLineStartX: 302,
  rightLineEndX: 318,
  priceLabelX: 322,
  priceLabelWidth: 64,
  segments: [
    {
      text: 'Long',
      displayText: 'Long',
      textShort: 'Long',
      x: 80,
      width: 48,
      textX: 90,
      backgroundColor: '#20242a',
      textColor: '#18aee8',
      borderColor: '#18aee8',
      corners: 'left',
    },
    {
      text: '0.0034',
      displayText: '0.0034',
      x: 128,
      width: 70,
      textX: 138,
      backgroundColor: '#18aee8',
      textColor: '#101418',
      borderColor: '#18aee8',
      corners: 'none',
    },
    {
      text: '+$1.33 (+0.17%)',
      displayText: '+$1.33 (+0.17%)',
      x: 198,
      width: 124,
      textX: 208,
      backgroundColor: '#12c48b',
      textColor: '#101418',
      borderColor: '#12c48b',
      corners: 'none',
    },
  ],
  buttons: [
    {
      type: 'reverse',
      icon: '⇄',
      displayIcon: '⇄',
      x: 322,
      width: 16,
      textX: 324,
      backgroundColor: '#20242a',
      iconColor: '#18aee8',
      borderColor: '#18aee8',
      corners: 'none',
    },
    {
      type: 'close',
      icon: '×',
      displayIcon: '×',
      x: 338,
      width: 16,
      textX: 342,
      backgroundColor: '#20242a',
      iconColor: '#18aee8',
      borderColor: '#18aee8',
      corners: 'right',
    },
    {
      type: 'tp',
      icon: 'TP',
      displayIcon: 'TP',
      x: 360,
      width: 26,
      textX: 366,
      backgroundColor: '#12c48b',
      iconColor: '#101418',
      borderColor: '#12c48b',
      corners: 'left',
    },
    {
      type: 'sl',
      icon: 'SL',
      displayIcon: 'SL',
      x: 386,
      width: 26,
      textX: 392,
      backgroundColor: '#ff7a1a',
      iconColor: '#101418',
      borderColor: '#ff7a1a',
      corners: 'right',
    },
  ],
  dragZone: null,
  actionZones: [],
};

describe('NativeTradeLineLabelBody', () => {
  it('mounts text surfaces for OEMS label segments and text action buttons', () => {
    const font = matchFont({ fontSize: 11 });
    const smallFont = matchFont({ fontSize: 10 });
    const layer = NativeTradeLineLabelBody({
      geometry,
      labelY: shared(120),
      smallFont,
      textFont: font,
      textY: shared(134),
      tradeLabelHeight: 18,
    });
    const texts = collectElementsByType(layer, NativeAnimatedSkiaText).map((element) => element.props.text);
    const buttons = collectElementsByType(layer, NativeTradeLineButtonIcon).map((element) => element.props.button.type);

    expect(texts).toEqual(expect.arrayContaining(['Long', '0.0034', '+$1.33 (+0.17%)', 'TP', 'SL']));
    expect(texts.every((text) => typeof text === 'string' && text.length > 0)).toBe(true);
    expect(buttons).toEqual(['reverse', 'close']);
  });
});
