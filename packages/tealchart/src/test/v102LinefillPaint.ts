import type { LinefillEntry } from '../../../tealscript/tests/fixtures/v102Linefill';
import { executeLinefill } from '../../../tealscript/tests/fixtures/v102Linefill';
import { traceEntry } from './v102Paint';

export interface LinefillPaint { kind: 'fill' | 'stroke'; color: string; width: number; points: { x: number; y: number }[] }
export function traceLinefill(entry: LinefillEntry, channel: 'web' | 'native') {
  const { paints: recorded, result, bars } = traceEntry(executeLinefill(entry), channel);
  const paints: LinefillPaint[] = recorded.map(({ kind, color, width, points }) => ({ kind, color, width, points }));
  return { paints, result, bars };
}
