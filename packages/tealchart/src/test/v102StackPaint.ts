import type { StackEntry } from '../../../tealscript/tests/fixtures/v102Stack';
import { executeStack } from '../../../tealscript/tests/fixtures/v102Stack';
import { traceEntry } from './v102Paint';

export interface StackPaint { kind: 'fill' | 'stroke'; color: string; width: number; y?: number }
export function traceStack(entry: StackEntry, channel: 'web' | 'native' | 'plots') {
  const { paints: recorded, result } = traceEntry(executeStack(entry), channel);
  const paints: StackPaint[] = recorded.map(({ kind, color, width, points }) => ({ kind, color, width, y: points[0]?.y }));
  return { paints, result };
}
