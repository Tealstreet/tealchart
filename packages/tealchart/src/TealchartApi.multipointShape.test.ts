import { describe, expect, it } from 'vitest';

import { TealchartApi } from './TealchartApi';

// The web app draws its fill markers with createMultipointShape, not
// createExecutionShape. Before this existed, tealchart charts called an
// undefined method inside an async handler: unhandled rejection, no arrows, no
// visible error. Anything running against both engines must find the same
// method here.
const makeApi = () => new TealchartApi('BTCUSDT', '1');

const iconOptions = (over: Record<string, unknown> = {}) => ({
  shape: 'icon',
  text: '',
  overrides: { size: 22, icon: 0xf0d8, color: 'rgba(0,128,1,0.8)' },
  ...over,
});

describe('TealchartApi.createMultipointShape', () => {
  it('creates an icon shape and returns an id', async () => {
    const api = makeApi();
    const id = await api.createMultipointShape([{ time: 1000, price: 100 }], iconOptions() as any);

    expect(typeof id).toBe('string');
  });

  it('plants the caret ON the price, with no arrow spacing', async () => {
    const api = makeApi();
    await api.createMultipointShape([{ time: 1000, price: 100 }], iconOptions() as any);

    const [line] = (api as any)._collectExecutionLineRenderData?.() ?? [
      (api as any)._executionLines.values().next().value._getRenderData(),
    ];
    expect(line.markerShape).toBe('caret');
    expect(line.arrowSpacing).toBe(0);
    expect(line.price).toBe(100);
    expect(line.time).toBe(1000);
  });

  it('maps the caret code points to a direction', async () => {
    const api = makeApi();
    await api.createMultipointShape([{ time: 1, price: 1 }], iconOptions({ overrides: { icon: 0xf0d8 } }) as any);
    await api.createMultipointShape([{ time: 2, price: 2 }], iconOptions({ overrides: { icon: 0xf0d7 } }) as any);

    const directions = [...(api as any)._executionLines.values()].map((a: any) => a._getRenderData().direction);
    expect(directions).toEqual(['buy', 'sell']);
  });

  it('carries the size and colour overrides through', async () => {
    const api = makeApi();
    await api.createMultipointShape(
      [{ time: 1, price: 1 }],
      iconOptions({ overrides: { size: 8, icon: 0xf0d8, color: '#abcdef' } }) as any,
    );

    const data = (api as any)._executionLines.values().next().value._getRenderData();
    expect(data.arrowHeight).toBe(8);
    expect(data.arrowColor).toBe('#abcdef');
  });

  // Rejecting by name beats handing back a handle to a drawing never made.
  it('rejects a shape it does not draw', async () => {
    const api = makeApi();
    await expect(
      api.createMultipointShape([{ time: 1, price: 1 }], iconOptions({ shape: 'flag' }) as any),
    ).rejects.toThrow(/supports shape 'icon'/);
  });

  it('rejects a call with no usable point', async () => {
    const api = makeApi();
    await expect(api.createMultipointShape([], iconOptions() as any)).rejects.toThrow(/requires one point/);
  });

  it('removeEntity deletes the shape it created', async () => {
    const api = makeApi();
    const id = await api.createMultipointShape([{ time: 1, price: 1 }], iconOptions() as any);
    expect((api as any)._executionLines.size).toBe(1);

    api.removeEntity(id);
    expect((api as any)._executionLines.size).toBe(0);
  });

  it('removeEntity on an unknown id is a no-op', async () => {
    const api = makeApi();
    await api.createMultipointShape([{ time: 1, price: 1 }], iconOptions() as any);

    api.removeEntity('nope' as any);
    expect((api as any)._executionLines.size).toBe(1);
  });
});
