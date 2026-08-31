// @vitest-environment jsdom

import type { PriceLineLabelBounds } from '../types';

import Konva from 'konva';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PriceLineManager } from './PriceLineManager';

interface PriceLineManagerProbe {
  cachedLineGroups: Map<string, Konva.Group>;
  needsFullRebuild?: boolean;
  dispose: () => void;
}

interface CachedLineContentRefsProbe {
  priceAxisRect?: Konva.Rect;
  buttonIcons?: Array<Konva.Shape[] | undefined>;
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

function makeOrderBound(price: number): PriceLineLabelBounds {
  return {
    lineId: 'order-1',
    price,
    originalY: price,
    adjustedY: price,
    width: 84,
    height: 32,
    color: '#2196F3',
    label: {
      primaryText: 'order',
      textColor: '#ffffff',
    },
    lineStyle: 'dotted',
    type: 'order',
    chartLabel: {
      offsetPercent: 0,
      segments: [
        {
          text: 'Buy Limit',
          backgroundColor: '#2196F3',
          textColor: '#ffffff',
          borderColor: '#2196F3',
        },
      ],
      buttons: [],
    },
    lineLength: 50,
    extendLeft: false,
    lineWidth: 1,
    callbacks: {},
  };
}

describe('PriceLineManager TP/SL dragging', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('renders dotted order lines with visible sparse dashes', () => {
    stubCanvasContext();
    const container = createContainer();
    const stage = new Konva.Stage({ container, width: 800, height: 600 });
    const layer = new Konva.Layer();
    stage.add(layer);

    const manager = new PriceLineManager({
      layer,
      width: 800,
      height: 600,
      margins: { top: 0, right: 80, bottom: 0, left: 0 },
      priceToY: (price) => price,
      yToPrice: (y) => y,
    });

    manager.update([makeOrderBound(100)]);

    const lineGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('order-1');
    const dashedLines = lineGroup?.find(
      (node: Konva.Node) => node instanceof Konva.Line && node.dash().length > 0,
    ) as Konva.Line[] | undefined;

    expect(dashedLines?.length).toBeGreaterThan(0);
    for (const line of dashedLines ?? []) {
      expect(line.dash()).toEqual([1, 5]);
    }

    manager.dispose();
    stage.destroy();
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

  it('bridges the bracket gap with a line so TP/SL joins the label', () => {
    stubCanvasContext();
    const container = createContainer();
    const stage = new Konva.Stage({ container, width: 800, height: 600 });
    const layer = new Konva.Layer();
    stage.add(layer);

    const manager = new PriceLineManager({
      layer,
      width: 800,
      height: 600,
      margins: { top: 0, right: 80, bottom: 0, left: 0 },
      priceToY: (price) => price,
      yToPrice: (y) => y,
    });

    manager.update([makePositionBound(100)]);

    const lineGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('position-1');
    const connector = lineGroup?.find(
      (node: Konva.Node) => node instanceof Konva.Line && node.points().length === 4 && node.points()[1] === 100,
    ) as Konva.Line[] | undefined;
    const gapLine = connector?.find((line) => line.points()[2]! - line.points()[0]! === 6);

    expect(gapLine).toBeDefined();
    expect(gapLine!.points()[3]).toBe(100);
    expect(gapLine!.stroke()).toBe('#23d18b');

    manager.dispose();
    stage.destroy();
  });

  it('does not draw vertical connector artifacts when an axis tag is de-overlapped', () => {
    stubCanvasContext();
    const container = createContainer();
    const stage = new Konva.Stage({ container, width: 800, height: 600 });
    const layer = new Konva.Layer();
    stage.add(layer);

    const manager = new PriceLineManager({
      layer,
      width: 800,
      height: 600,
      margins: { top: 0, right: 80, bottom: 0, left: 0 },
      priceToY: (price) => price,
      yToPrice: (y) => y,
    });
    const bound = makeOrderBound(100);
    bound.adjustedY = 130;

    manager.update([bound]);

    const lineGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('order-1');
    const verticalLines = lineGroup?.find((node: Konva.Node) => {
      if (!(node instanceof Konva.Line)) return false;
      const points = node.points();
      return points.length === 4 && points[0] === points[2] && points[1] !== points[3];
    }) as Konva.Line[] | undefined;

    expect(verticalLines).toHaveLength(0);

    manager.dispose();
    stage.destroy();
  });

  it('updates cached axis tag positions immediately when only de-overlap changes', () => {
    stubCanvasContext();
    const container = createContainer();
    const stage = new Konva.Stage({ container, width: 800, height: 600 });
    const layer = new Konva.Layer();
    stage.add(layer);

    const manager = new PriceLineManager({
      layer,
      width: 800,
      height: 600,
      margins: { top: 0, right: 80, bottom: 0, left: 0 },
      priceToY: (price) => price,
      yToPrice: (y) => y,
    });
    const initialBound = makeOrderBound(100);

    manager.update([initialBound]);
    const lineGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('order-1');
    const refs = lineGroup?.getAttr('contentRefs') as CachedLineContentRefsProbe | undefined;

    expect(refs?.priceAxisRect?.y()).toBe(100 - initialBound.height / 2);

    const shiftedBound = { ...initialBound, adjustedY: 130 };
    manager.update([shiftedBound]);

    expect((manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('order-1')).toBe(lineGroup);
    expect(refs?.priceAxisRect?.y()).toBe(130 - shiftedBound.height / 2);

    manager.dispose();
    stage.destroy();
  });

  it('renders action button icons as centered vector strokes', () => {
    stubCanvasContext();
    const container = createContainer();
    const stage = new Konva.Stage({ container, width: 800, height: 600 });
    const layer = new Konva.Layer();
    stage.add(layer);

    const manager = new PriceLineManager({
      layer,
      width: 800,
      height: 600,
      margins: { top: 0, right: 80, bottom: 0, left: 0 },
      priceToY: (price) => price,
      yToPrice: (y) => y,
    });
    const bound = makePositionBound(100);
    bound.chartLabel!.buttons = [
      {
        type: 'reverse',
        icon: '↩',
        backgroundColor: '#2196F3',
        iconColor: '#ffffff',
        borderColor: '#2196F3',
      },
      {
        type: 'close',
        icon: '×',
        backgroundColor: '#2196F3',
        iconColor: '#ffffff',
        borderColor: '#2196F3',
      },
      ...bound.chartLabel!.buttons!,
    ];

    manager.update([bound]);

    const lineGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('position-1');
    const refs = lineGroup?.getAttr('contentRefs') as CachedLineContentRefsProbe | undefined;
    const reverseIcons = refs?.buttonIcons?.[0];
    const closeIcons = refs?.buttonIcons?.[1];

    expect(reverseIcons).toHaveLength(2);
    expect(closeIcons).toHaveLength(2);
    for (const icon of closeIcons ?? []) {
      const points = (icon as Konva.Line).points();
      expect((points[1]! + points[3]!) / 2).toBe(100);
    }
    expect((reverseIcons?.[0] as Konva.Arrow).points()[1]).toBe(97);
    expect((reverseIcons?.[1] as Konva.Arrow).points()[1]).toBe(103);

    manager.dispose();
    stage.destroy();
  });
});

describe('PriceLineManager order dragging', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  function draggableOrderBound(actionState: PriceLineLabelBounds['actionState']): PriceLineLabelBounds {
    return { ...makeOrderBound(100), draggable: true, actionState };
  }

  function dragHandle(manager: PriceLineManager): Konva.Rect {
    const group = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('order-1');
    const handles = (group?.find((node: Konva.Node) => node instanceof Konva.Rect && node.draggable()) ??
      []) as Konva.Rect[];
    return handles[0];
  }

  function withManager(
    run: (manager: PriceLineManager) => void,
    options: Partial<ConstructorParameters<typeof PriceLineManager>[0]> = {},
  ): void {
    stubCanvasContext();
    const container = createContainer();
    const stage = new Konva.Stage({ container, width: 800, height: 600 });
    const layer = new Konva.Layer();
    stage.add(layer);
    const manager = new PriceLineManager({
      layer,
      width: 800,
      height: 600,
      margins: { top: 0, right: 80, bottom: 0, left: 0 },
      priceToY: (price) => price,
      yToPrice: (y) => y,
      ...options,
    });

    run(manager);

    manager.dispose();
    stage.destroy();
  }

  // The bug this covers: an amend the venue never echoed back in the shape the
  // action expected left the line pending, and pending refused every later drag
  // until the action timed out thirty seconds on.
  it('still lets the user drag a line that is only waiting for the venue to echo', () => {
    withManager((manager) => {
      manager.update([
        draggableOrderBound({
          kind: 'orderMove',
          isPending: true,
          isAwaitingCallback: false,
          isAwaitingConfirmation: true,
        }),
      ]);

      dragHandle(manager).fire('dragstart');

      expect(manager.isDragging()).toBe(true);
    });
  });

  it('refuses a drag while the round trip is still in the air', () => {
    withManager((manager) => {
      manager.update([
        draggableOrderBound({
          kind: 'orderMove',
          isPending: true,
          isAwaitingCallback: true,
          isAwaitingConfirmation: false,
        }),
      ]);

      dragHandle(manager).fire('dragstart');

      expect(manager.isDragging()).toBe(false);
    });
  });

  it('rebuilds after a moved order drag instead of reusing the translated drag group', () => {
    const onOrderMove = vi.fn();

    withManager(
      (manager) => {
        manager.update([draggableOrderBound(undefined)]);

        const handle = dragHandle(manager);
        const firstGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('order-1');
        expect(firstGroup).toBeDefined();

        handle.fire('dragstart');
        handle.y(handle.y() + 24);
        handle.fire('dragmove');
        handle.fire('dragend');

        expect(onOrderMove).toHaveBeenCalledWith('order-1', 124);
        expect((manager as unknown as PriceLineManagerProbe).needsFullRebuild).toBe(true);

        manager.update([{ ...draggableOrderBound(undefined), price: 124, originalY: 124, adjustedY: 124 }]);

        const rebuiltGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('order-1');
        expect(rebuiltGroup).toBeDefined();
        expect(rebuiltGroup).not.toBe(firstGroup);
        expect(rebuiltGroup?.y()).toBe(0);
        expect(rebuiltGroup?.getAttr('lineY')).toBe(124);
      },
      { onOrderMove },
    );
  });

  // Nothing may rebuild the layer while a line is being dragged, so the tag
  // would otherwise sit at the price the drag started from until it was dropped.
  it('writes the dragged price into its own axis tag, and never lets the tag narrow', () => {
    const formatPrice = (price: number) => price.toFixed(2);
    const grown = new Map<string, number>();
    const growPriceAxisTagWidth = vi.fn((bound: PriceLineLabelBounds, text: string) => {
      const width = text.length * 7 + 8;
      const next = Math.max(grown.get(bound.lineId) ?? 0, width);
      grown.set(bound.lineId, next);
      return next;
    });

    withManager(
      (manager) => {
        manager.update([draggableOrderBound(undefined)]);

        const group = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('order-1');
        const refs = group?.getAttr('contentRefs') as
          | { priceAxisRect?: Konva.Rect; priceAxisPrimaryText?: Konva.Text }
          | undefined;
        const handle = dragHandle(manager);
        const stage = handle.getStage();
        const getPointerPosition = vi.spyOn(stage!, 'getPointerPosition');

        getPointerPosition.mockReturnValue({ x: 120, y: 100 });
        handle.fire('dragstart');

        getPointerPosition.mockReturnValue({ x: 120, y: 123_456_789 });
        handle.fire('dragmove');

        expect(refs?.priceAxisPrimaryText?.text()).toBe('123456789.00');
        const widestTag = refs?.priceAxisRect?.width() ?? 0;
        expect(widestTag).toBe('123456789.00'.length * 7 + 8);

        getPointerPosition.mockReturnValue({ x: 120, y: 9 });
        handle.fire('dragmove');

        expect(refs?.priceAxisPrimaryText?.text()).toBe('9.00');
        expect(refs?.priceAxisRect?.width()).toBe(widestTag);

        handle.fire('dragend');
      },
      { formatPrice, growPriceAxisTagWidth },
    );
  });

  it('uses stage pointer deltas for order drags so parent translation cannot offset the price', () => {
    const onOrderMove = vi.fn();

    withManager(
      (manager) => {
        manager.update([draggableOrderBound(undefined)]);

        const handle = dragHandle(manager);
        const stage = handle.getStage();
        const getPointerPosition = vi.spyOn(stage!, 'getPointerPosition');
        getPointerPosition.mockReturnValue({ x: 120, y: 100 });

        handle.fire('dragstart');
        getPointerPosition.mockReturnValue({ x: 120, y: 124 });
        handle.fire('dragmove');
        handle.fire('dragend');

        expect(onOrderMove).toHaveBeenCalledWith('order-1', 124);
      },
      { onOrderMove },
    );
  });

  it('keeps a selected trade line above overlapping trade lines', () => {
    withManager((manager) => {
      manager.update([
        { ...draggableOrderBound(undefined), lineId: 'order-1' },
        { ...draggableOrderBound(undefined), lineId: 'order-2' },
      ]);

      const firstGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('order-1');
      const secondGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('order-2');

      expect(firstGroup).toBeDefined();
      expect(secondGroup).toBeDefined();
      manager.selectLine('order-1');

      expect(firstGroup!.getZIndex()).toBeGreaterThan(secondGroup!.getZIndex());
    });
  });

  it('keeps the active dragged trade line above overlapping trade lines', () => {
    withManager((manager) => {
      manager.update([
        { ...draggableOrderBound(undefined), lineId: 'order-1' },
        { ...draggableOrderBound(undefined), lineId: 'order-2' },
      ]);

      const firstGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('order-1');
      const secondGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('order-2');
      const handle = dragHandle(manager);

      expect(firstGroup).toBeDefined();
      expect(secondGroup).toBeDefined();
      handle.fire('dragstart');

      expect(firstGroup!.getZIndex()).toBeGreaterThan(secondGroup!.getZIndex());
    });
  });

  it('hovers the nearest overlapping trade line instead of the topmost hit rect', () => {
    withManager((manager) => {
      manager.update([
        { ...draggableOrderBound(undefined), lineId: 'top-order', price: 100, originalY: 100, adjustedY: 100 },
        { ...draggableOrderBound(undefined), lineId: 'middle-order', price: 112, originalY: 112, adjustedY: 112 },
        { ...draggableOrderBound(undefined), lineId: 'bottom-order', price: 124, originalY: 124, adjustedY: 124 },
      ]);

      const topGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('top-order');
      const middleGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('middle-order');
      const bottomGroup = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('bottom-order');

      expect(topGroup).toBeDefined();
      expect(middleGroup).toBeDefined();
      expect(bottomGroup).toBeDefined();

      expect(manager.updateHoverAt(300, 113)).toBe('passive');

      expect(middleGroup!.getZIndex()).toBeGreaterThan(topGroup!.getZIndex());
      expect(middleGroup!.getZIndex()).toBeGreaterThan(bottomGroup!.getZIndex());
    });
  });
});

describe('PriceLineManager TP/SL gating while an action is unconfirmed', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  // The TP button is one hit rect serving two gestures, and they do not share a
  // rule: a drag supersedes an action the venue has already answered, a click
  // would submit that same action a second time.
  it('lets the button be dragged but not clicked while awaiting confirmation', () => {
    stubCanvasContext();
    const container = createContainer();
    const stage = new Konva.Stage({ container, width: 800, height: 600 });
    const layer = new Konva.Layer();
    stage.add(layer);
    const onTPClick = vi.fn();
    const manager = new PriceLineManager({
      layer,
      width: 800,
      height: 600,
      margins: { top: 0, right: 80, bottom: 0, left: 0 },
      priceToY: (price) => price,
      yToPrice: (y) => y,
      onTPClick,
    });

    manager.update([
      {
        ...makePositionBound(100),
        actionState: {
          kind: 'positionTpMove',
          isPending: true,
          isAwaitingCallback: false,
          isAwaitingConfirmation: true,
        },
      },
    ]);

    const group = (manager as unknown as PriceLineManagerProbe).cachedLineGroups.get('position-1');
    const buttons = (group?.find((node: Konva.Node) => node instanceof Konva.Rect && node.draggable()) ??
      []) as Konva.Rect[];
    expect(buttons.length).toBeGreaterThan(0);

    buttons[0].fire('dragstart');
    expect(manager.isDragging()).toBe(true);

    buttons[0].fire('dragend');
    expect(onTPClick).not.toHaveBeenCalled();

    manager.dispose();
    stage.destroy();
  });
});
