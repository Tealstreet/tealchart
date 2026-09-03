import { describe, expect, it } from 'vitest';

import {
  parseTealscriptWebViewBridgeMessage,
  stringifyTealscriptWebViewBridgeMessage,
} from './tealscriptWebViewBridgeCodec';

describe('tealscript WebView bridge codec', () => {
  it('round-trips non-JSON Pine values without coercing them to null or zero', () => {
    const message = {
      values: [Number.NaN, undefined, Infinity, -Infinity, -0, 1],
      drawing: {
        points: [
          { x: 1, y: Number.NaN },
          { x: 2, y: -0 },
        ],
      },
      libraryPrograms: new Map<string, unknown>([
        ['lib', { exports: [undefined, Number.NaN] }],
      ]),
      series: new Float64Array([Number.NaN, -0, Infinity]),
    };

    const encoded = stringifyTealscriptWebViewBridgeMessage(message);
    expect(encoded).not.toContain(':null');

    const decoded = parseTealscriptWebViewBridgeMessage(encoded) as typeof message;
    expect(Number.isNaN(decoded.values[0] as number)).toBe(true);
    expect(decoded.values[1]).toBeUndefined();
    expect(decoded.values[2]).toBe(Infinity);
    expect(decoded.values[3]).toBe(-Infinity);
    expect(Object.is(decoded.values[4], -0)).toBe(true);
    expect(Number.isNaN(decoded.drawing.points[0].y)).toBe(true);
    expect(Object.is(decoded.drawing.points[1].y, -0)).toBe(true);
    expect(decoded.libraryPrograms).toBeInstanceOf(Map);
    expect(Number.isNaN((decoded.libraryPrograms.get('lib') as { exports: unknown[] }).exports[1] as number)).toBe(true);
    expect(decoded.series).toBeInstanceOf(Float64Array);
    expect(Number.isNaN(decoded.series[0])).toBe(true);
    expect(Object.is(decoded.series[1], -0)).toBe(true);
  });

  it('round-trips negative zero without losing its sign bit', () => {
    const encoded = stringifyTealscriptWebViewBridgeMessage({
      zero: -0,
      nested: { values: [-0] },
    });

    const decoded = parseTealscriptWebViewBridgeMessage(encoded) as {
      zero: number;
      nested: { values: number[] };
    };
    expect(Object.is(decoded.zero, -0)).toBe(true);
    expect(Object.is(decoded.nested.values[0], -0)).toBe(true);
  });

  it('round-trips typed arrays without degrading them to plain arrays', () => {
    const message = {
      float32: new Float32Array([Number.NaN, -0, Infinity]),
      int16: new Int16Array([-1, 0, 1]),
      uint8: new Uint8Array([0, 1, 255]),
    };

    const decoded = parseTealscriptWebViewBridgeMessage(
      stringifyTealscriptWebViewBridgeMessage(message),
    ) as typeof message;
    expect(decoded.float32).toBeInstanceOf(Float32Array);
    expect(Number.isNaN(decoded.float32[0])).toBe(true);
    expect(Object.is(decoded.float32[1], -0)).toBe(true);
    expect(decoded.float32[2]).toBe(Infinity);
    expect(decoded.int16).toBeInstanceOf(Int16Array);
    expect(Array.from(decoded.int16)).toEqual([-1, 0, 1]);
    expect(decoded.uint8).toBeInstanceOf(Uint8Array);
    expect(Array.from(decoded.uint8)).toEqual([0, 1, 255]);
  });
});
