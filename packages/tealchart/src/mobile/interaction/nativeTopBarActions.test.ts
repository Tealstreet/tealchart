import { describe, expect, it, vi } from 'vitest';

import { commitNativeTopBarAction } from './nativeTopBarActions';

describe('native top-bar actions', () => {
  it('dispatches symbol clicks when a handler is available', () => {
    const onSymbolClick = vi.fn();
    const handlers = {
      currentInterval: '15' as const,
      setInterval: vi.fn(),
      onSymbolClick,
      redoUserDrawingCommand: vi.fn(() => true),
    };

    expect(commitNativeTopBarAction({ type: 'symbol' }, handlers)).toBe(true);

    expect(onSymbolClick).toHaveBeenCalledOnce();
    expect(handlers.redoUserDrawingCommand).not.toHaveBeenCalled();
  });

  it('changes timeframe only when the zone has a new interval', () => {
    const setInterval = vi.fn();

    expect(commitNativeTopBarAction({ type: 'timeframe' }, { currentInterval: '15', setInterval })).toBe(false);
    expect(
      commitNativeTopBarAction({ type: 'timeframe', interval: '15' }, { currentInterval: '15', setInterval }),
    ).toBe(false);
    expect(
      commitNativeTopBarAction({ type: 'timeframe', interval: '30' }, { currentInterval: '15', setInterval }),
    ).toBe(true);

    expect(setInterval).toHaveBeenCalledOnce();
    expect(setInterval).toHaveBeenCalledWith('30');
  });

  it('dispatches available indicators and drawing commands', () => {
    const onIndicatorsClick = vi.fn();
    const undoUserDrawingCommand = vi.fn(() => true);
    const redoUserDrawingCommand = vi.fn(() => true);
    const handlers = {
      currentInterval: '15' as const,
      setInterval: vi.fn(),
      onIndicatorsClick,
      undoUserDrawingCommand,
      redoUserDrawingCommand,
    };

    expect(commitNativeTopBarAction({ type: 'indicators' }, handlers)).toBe(true);
    expect(commitNativeTopBarAction({ type: 'undo' }, handlers)).toBe(true);
    expect(commitNativeTopBarAction({ type: 'redo' }, handlers)).toBe(true);

    expect(onIndicatorsClick).toHaveBeenCalledOnce();
    expect(undoUserDrawingCommand).toHaveBeenCalledOnce();
    expect(redoUserDrawingCommand).toHaveBeenCalledOnce();
  });

  it('reports unavailable optional commands as unhandled', () => {
    const handlers = {
      currentInterval: '15' as const,
      setInterval: vi.fn(),
      undoUserDrawingCommand: vi.fn(() => false),
      redoUserDrawingCommand: vi.fn(() => false),
    };

    expect(commitNativeTopBarAction({ type: 'indicators' }, handlers)).toBe(false);
    expect(commitNativeTopBarAction({ type: 'symbol' }, handlers)).toBe(false);
    expect(commitNativeTopBarAction({ type: 'undo' }, handlers)).toBe(false);
    expect(commitNativeTopBarAction({ type: 'redo' }, handlers)).toBe(false);
  });
});
