import type { UserDrawingState } from './drawings';
import type { Bar, DatafeedConfiguration, IBasicDataFeed, LibrarySymbolInfo, PeriodParams, ResolutionString } from './types';
import type { SkiaTealchartHandle } from './SkiaTealchart';

import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPicture } from '@shopify/react-native-skia';
import { SkiaTealchart } from './SkiaTealchart';
import { clearChartStoreCache } from './state/chartState';

function createBars(): Bar[] {
  return Array.from({ length: 5 }, (_, index) => ({
    time: 1_000_000 + index * 60_000,
    open: 50 + index,
    high: 55 + index,
    low: 45 + index,
    close: 52 + index,
    volume: 100 + index,
  }));
}

function createDatafeed(): IBasicDataFeed {
  return {
    onReady(callback: (config: DatafeedConfiguration) => void) {
      callback({ supported_resolutions: ['60' as ResolutionString] });
    },
    resolveSymbol(symbolName: string, onResolve: (symbolInfo: LibrarySymbolInfo) => void) {
      onResolve({
        name: symbolName,
        full_name: symbolName,
        description: symbolName,
        type: 'crypto',
        session: '24x7',
        exchange: 'BINANCE',
        minmov: 1,
        pricescale: 100,
        has_intraday: true,
        supported_resolutions: ['60' as ResolutionString],
      });
    },
    getBars(
      _symbolInfo: LibrarySymbolInfo,
      _resolution: ResolutionString,
      _periodParams: PeriodParams,
      onResult: (bars: Bar[], meta: { noData?: boolean }) => void,
    ) {
      onResult(createBars(), { noData: false });
    },
    subscribeBars() {},
    unsubscribeBars() {},
  };
}

const initialDrawingState: UserDrawingState = {
  version: 1,
  activeTool: 'select',
  stayInDrawingMode: true,
  selection: { drawingId: 'selected' },
  draft: null,
  textEdit: null,
  drawings: [
    {
      id: 'selected',
      kind: 'horizontalLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
      price: 50,
    },
    {
      id: 'target',
      kind: 'horizontalLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 2,
      updatedAt: 2,
      style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' },
      price: 55,
    },
  ],
};

describe('SkiaTealchart drawing properties', () => {
  afterEach(() => {
    cleanup();
    clearChartStoreCache();
  });

  it('opens the built-in properties sheet through the handle and dispatches controls to the pinned drawing', async () => {
    const ref = createRef<SkiaTealchartHandle>();
    const onStateChange = vi.fn();

    render(
      <SkiaTealchart
        ref={ref}
        datafeed={createDatafeed()}
        symbol="BTCUSDT"
        interval="60"
        width={320}
        height={240}
        userDrawingState={initialDrawingState}
        onUserDrawingStateChange={onStateChange}
      />,
    );

    let intent;
    await act(async () => {
      intent = ref.current?.openUserDrawingProperties('target');
    });

    expect(intent).toMatchObject({ drawingId: 'target' });
    const sheet = await screen.findByLabelText('Drawing properties');
    expect(sheet).not.toBeNull();
    expect(screen.getByText('horizontalLine properties')).not.toBeNull();

    await act(async () => {
      fireEvent.click(within(sheet).getByLabelText('Blue line color'));
    });

    expect(onStateChange).toHaveBeenCalled();
    const nextState = onStateChange.mock.calls.at(-1)?.[0] as UserDrawingState;
    expect(nextState.drawings.find((drawing) => drawing.id === 'target')?.style.lineColor).toBe('#38bdf8');
    expect(nextState.drawings.find((drawing) => drawing.id === 'selected')?.style.lineColor).toBe('#f5c542');
    expect(nextState.selection).toEqual({ drawingId: 'selected' });
    expect(createPicture).toHaveBeenCalled();
  });

  it('exposes stay-in-drawing-mode through the mobile imperative handle', async () => {
    const ref = createRef<SkiaTealchartHandle>();
    const onStateChange = vi.fn();
    const onCommand = vi.fn();

    render(
      <SkiaTealchart
        ref={ref}
        datafeed={createDatafeed()}
        symbol="BTCUSDT"
        interval="60"
        width={320}
        height={240}
        userDrawingState={{ ...initialDrawingState, stayInDrawingMode: true }}
        onUserDrawingStateChange={onStateChange}
        onUserDrawingCommand={onCommand}
      />,
    );

    expect(ref.current?.isUserDrawingStayInDrawingMode()).toBe(true);

    await act(async () => {
      expect(ref.current?.setUserDrawingStayInDrawingMode(false)).toBe(true);
    });

    expect(ref.current?.isUserDrawingStayInDrawingMode()).toBe(false);
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ stayInDrawingMode: false }));
    expect(onCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: expect.objectContaining({ type: 'setStayInDrawingMode', stayInDrawingMode: false }),
        source: 'api',
      }),
    );

    await act(async () => {
      expect(ref.current?.setUserDrawingStayInDrawingMode(false)).toBe(false);
    });
  });

  it('passes pressure segment dash phases into Skia dash effects', () => {
    const pressureState: UserDrawingState = {
      version: 1,
      activeTool: 'select',
      stayInDrawingMode: true,
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [
        {
          id: 'pressure-path',
          kind: 'path',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#f5c542', lineWidth: 8, lineStyle: 'dashed' },
          points: [
            { time: 1_000_000, price: 52, pressure: 0 },
            { time: 1_060_000, price: 53, pressure: 0 },
            { time: 1_120_000, price: 54, pressure: 1 },
          ],
        },
      ],
    };

    const { container } = render(
      <SkiaTealchart
        datafeed={createDatafeed()}
        symbol="BTCUSDT"
        interval="60"
        width={320}
        height={240}
        userDrawingState={pressureState}
      />,
    );

    const pressureDashPhases = [...container.querySelectorAll('[data-skia="DashPathEffect"][data-phase]')].map((node) =>
      Number(node.getAttribute('data-phase')),
    );

    expect(pressureDashPhases).toContain(0);
    expect(pressureDashPhases.some((phase) => phase > 0)).toBe(true);
  });
});
