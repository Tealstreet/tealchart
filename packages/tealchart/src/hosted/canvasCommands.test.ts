import { describe, expect, it, vi } from 'vitest';

import { HostedCanvasRecorder, replayHostedCanvasCommands, validateHostedCanvasCommands } from './canvasCommands';

function context() {
  const ctx = {
    canvas: { ownerDocument: document },
    font: '10px sans-serif',
    fillStyle: '#000',
    globalAlpha: 1,
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

describe('hosted Canvas2D transport', () => {
  it('records gradient handles, text metrics, and balanced state and replays them without painting in the parent', () => {
    const metrics = context();
    const recorder = new HostedCanvasRecorder(metrics);
    const ctx = recorder.context;
    ctx.save();
    ctx.font = '12px Arial';
    expect(ctx.measureText('hello').width).toBe(40);
    const gradient = ctx.createLinearGradient(0, 0, 30, 0);
    gradient.addColorStop(0, '#000');
    gradient.addColorStop(1, '#fff');
    ctx.fillStyle = gradient;
    ctx.fillRect(2, 3, 30, 10);
    ctx.fillText('hello', 2, 8);
    ctx.restore();
    expect(metrics.fillRect).not.toHaveBeenCalled();
    expect(validateHostedCanvasCommands(recorder.commands)).toBe(true);
    const target = context();
    expect(replayHostedCanvasCommands(target, recorder.commands)).toBe(true);
    expect(target.fillRect).toHaveBeenCalledWith(2, 3, 30, 10);
    expect(target.fillText).toHaveBeenCalledWith('hello', 2, 8);
    expect(target.createLinearGradient).toHaveBeenCalledWith(0, 0, 30, 0);
    expect(target.save).toHaveBeenCalledTimes(2);
    expect(target.restore).toHaveBeenCalledTimes(2);
  });

  it.each([
    [{ op: 'call', name: 'eval', args: ['alert(1)'] }],
    [{ op: 'call', name: 'constructor', args: [] }],
    [{ op: 'call', name: '__proto__', args: [] }],
    [{ op: 'set', name: '__proto__', args: ['bad'] }],
    [{ op: 'call', name: 'fillRect', args: [0, NaN, 10, 10] }],
    [{ op: 'call', name: 'moveTo', args: [true, 2] }],
    [{ op: 'call', name: 'arc', args: [0, 0, -1, 0, 2] }],
    [{ op: 'call', name: 'roundRect', args: [0, 0, 20, 20, -1] }],
    [{ op: 'call', name: 'roundRect', args: [0, 0, 20, 20, [1, -1]] }],
    [{ op: 'call', name: 'roundRect', args: [0, 0, 20, 20, []] }],
    [{ op: 'call', name: 'roundRect', args: [0, 0, 20, 20, [1, 2, 3, 4, 5]] }],
    [{ op: 'gradient', id: 1, name: 'createRadialGradient', args: [0, 0, -1, 10, 10, 2] }],
    [{ op: 'gradient', id: 1, name: 'createRadialGradient', args: [0, 0, 1, 10, 10, -2] }],
    [{ op: 'call', name: 'restore', args: [] }],
    [{ op: 'call', name: 'save', args: [] }],
    [{ op: 'set', name: 'fillStyle', args: [{ gradient: 7 }] }],
    [{ op: 'image', id: 1, args: [0, 0] }],
  ])('rejects malformed commands before invoking any canvas method (%j)', (command) => {
    const target = context();
    expect(replayHostedCanvasCommands(target, [command] as never)).toBe(false);
    expect(target.save).not.toHaveBeenCalled();
    expect(target.fillRect).not.toHaveBeenCalled();
  });

  it('accepts nonnegative roundRect and radial-gradient radii including zero', () => {
    for (const radii of [0, 3, [0], [1, 2], [1, 2, 3], [1, 2, 3, 4]]) {
      expect(validateHostedCanvasCommands([{ op: 'call', name: 'roundRect', args: [0, 0, 20, 20, radii] }])).toBe(true);
    }
    expect(
      validateHostedCanvasCommands([
        { op: 'gradient', id: 1, name: 'createRadialGradient', args: [0, 0, 0, 10, 10, 2] },
      ]),
    ).toBe(true);
  });

  it('does not consume the bounded command budget for repeated unchanged drawing state', () => {
    const recorder = new HostedCanvasRecorder(context());
    const ctx = recorder.context;
    for (let index = 0; index < 30_000; index++) {
      ctx.fillStyle = '#f00';
      ctx.lineWidth = 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '12px Arial';
      ctx.fillRect(index % 100, Math.floor(index / 100), 1, 1);
    }
    expect(recorder.error).toBeUndefined();
    expect(recorder.commands.length).toBeLessThan(30_020);
    expect(validateHostedCanvasCommands(recorder.commands)).toBe(true);
  });

  it('deduplicates only current state and records changes again after native save/restore', () => {
    const recorder = new HostedCanvasRecorder(context());
    const ctx = recorder.context;
    ctx.fillStyle = '#f00';
    ctx.save();
    ctx.fillStyle = '#0f0';
    ctx.fillStyle = '#0f0';
    ctx.restore();
    ctx.fillStyle = '#0f0';
    ctx.fillRect(0, 0, 1, 1);
    const styles = recorder.commands.filter((command) => command.op === 'set' && command.name === 'fillStyle');
    expect(styles.map((command) => command.args[0])).toEqual(['#000', '#f00', '#0f0', '#0f0']);
    expect(validateHostedCanvasCommands(recorder.commands)).toBe(true);
  });

  it('restores caller state after an actual canvas draw throws', () => {
    const ctx = context();
    vi.mocked(ctx.fillRect).mockImplementation(() => {
      throw new Error('draw failure');
    });
    expect(() =>
      replayHostedCanvasCommands(ctx, [
        { op: 'call', name: 'save', args: [] },
        { op: 'call', name: 'fillRect', args: [0, 0, 1, 1] },
        { op: 'call', name: 'restore', args: [] },
      ]),
    ).toThrow('draw failure');
    expect(ctx.restore).toHaveBeenCalledTimes(2);
  });

  it('validates image size, binary length, gradient references and command limits', () => {
    expect(validateHostedCanvasCommands([], [{ id: 1, width: 2, height: 2, pixels: new Uint8ClampedArray(3) }])).toBe(
      false,
    );
    expect(
      validateHostedCanvasCommands(Array.from({ length: 100001 }, () => ({ op: 'call', name: 'beginPath', args: [] }))),
    ).toBe(false);
    expect(
      validateHostedCanvasCommands([
        { op: 'gradient', id: 1, name: 'createLinearGradient', args: [0, 0, 5, 5] },
        { op: 'gradient-stop', id: 1, args: [2, '#fff'] },
      ]),
    ).toBe(false);
  });

  it('reconstructs allowlisted image pixels before replaying drawImage', () => {
    const pixels = new Uint8ClampedArray([10, 20, 30, 255]);
    const putImageData = vi.fn();
    const image = {
      width: 0,
      height: 0,
      getContext: () => ({
        createImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData,
      }),
    };
    const target = context();
    const drawImage = vi.fn();
    Object.assign(target, {
      canvas: { ownerDocument: { createElement: () => image } },
      drawImage,
    });
    expect(
      replayHostedCanvasCommands(
        target,
        [{ op: 'image', id: 7, args: [2, 3] }],
        [{ id: 7, width: 1, height: 1, pixels }],
      ),
    ).toBe(true);
    expect(putImageData).toHaveBeenCalledWith({ data: pixels }, 0, 0);
    expect(drawImage).toHaveBeenCalledWith(image, 2, 3);
  });
});
