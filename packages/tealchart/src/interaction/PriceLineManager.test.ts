// @vitest-environment jsdom

import type { PriceLineLabelBounds } from '../types';

import Konva from 'konva';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PriceLineManager } from './PriceLineManager';

interface PriceLineManagerProbe {
  cachedLineGroups: Map<string, Konva.Group>;
  dispose: () => void;
}

function stubCanvasContext(): void {
  const mockCtx = {
    canvas: { width: 800, height: 600 },
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'top',
    globalAlpha: 1,
    lineCap: 'butt',
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    clearRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    measureText: (text: string) => ({ width: text.length * 7 }),
    setLineDash: () => {},
    arc: () => {},
    clip: () => {},
    rect: () => {},
    roundRect: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 0]) }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    transform: () => {},
    setTransform: () => {},
    scale: () => {},
    translate: () => {},
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLCanvasElement.prototype.getContext = (() => mockCtx) as any;
}

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  Object.defineProperty(container, 'getBoundingClientRect', {
    value: () => ({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
    }),
  });
  document.body.appendChild(container);
  return container;
}

function makePositionBound(price: number): PriceLineLabelBounds {
  return {
    lineId: 'position-1',
    price,
    originalY: price,
    adjustedY: price,
    width: 84,
    height: 32,
    color: '#23d18b',
    label: {
      primaryText: 'position',
      textColor: '#ffffff',
    },
    lineStyle: 'solid',
    type: 'position',
    chartLabel: {
      offsetPercent: 0,
      segments: [
        {
          text: 'Long',
          backgroundColor: '#12382f',
          textColor: '#23d18b',
          borderColor: '#23d18b',
        },
      ],
      buttons: [
        {
          type: 'tp',
          icon: 'TP',
          backgroundColor: '#111111',
          iconColor: '#23d18b',
          borderColor: '#23d18b',
        },
        {
          type: 'sl',
          icon: 'SL',
          backgroundColor: '#111111',
          iconColor: '#ff7a18',
          borderColor: '#ff7a18',
        },
      ],
    },
    lineLength: 100,
    extendLeft: true,
    lineWidth: 1,
    partialEnabled: true,
    positionId: 'position-1',
    callbacks: {},
  };
}

describe('PriceLineManager TP/SL dragging', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('uses absolute coordinates for cached TP/SL drag previews', () => {
    stubCanvasContext();
    const container = createContainer();
    const stage = new Konva.Stage({ container, width: 800, height: 600 });
    const layer = new Konva.Layer();
    const onSLMovePreview = vi.fn();
    stage.add(layer);

    const manager = new PriceLineManager({
      layer,
      width: 800,
      height: 600,
      margins: { top: 0, right: 80, bottom: 0, left: 0 },
      priceToY: (price) => price,
      yToPrice: (y) => y,
      onSLMovePreview,
    });

    manager.update([makePositionBound(100)]);
    manager.update([makePositionBound(150)]);

    const lineGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('position-1');
    const draggableButtons = lineGroup?.find(
      (node: Konva.Node) =>
        node instanceof Konva.Rect && node.draggable() && node.width() === 24 && node.height() === 18,
    ) as Konva.Rect[] | undefined;
    const slHitRect = draggableButtons?.[1];

    expect(slHitRect).toBeDefined();

    slHitRect!.fire('dragstart');
    slHitRect!.y(slHitRect!.y() + 10);
    slHitRect!.fire('dragmove');

    expect(onSLMovePreview).toHaveBeenCalledWith('position-1', 160, 100, expect.any(Number), expect.any(Number));

    manager.dispose();
    stage.destroy();
  });
});
