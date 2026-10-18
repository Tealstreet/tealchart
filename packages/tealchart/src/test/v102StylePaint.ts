import type { StyleEntry } from '../../../tealscript/tests/fixtures/v102Style';
import { executeStyle } from '../../../tealscript/tests/fixtures/v102Style';
import { traceEntry } from './v102Paint';

export interface StylePaint { kind: 'fill' | 'stroke'; color: string; width: number; dash: number[]; points: { x: number; y: number }[] }
export function traceStyle(entry: StyleEntry, channel: 'web' | 'native') {
  const { paints: recorded, result, bars } = traceEntry(executeStyle(entry), channel, true);
  const paints: StylePaint[] = recorded.map(({ kind, color, width, points, dash }) => ({ kind, color, width, dash, points }));
  return { paints, result, bars };
}
