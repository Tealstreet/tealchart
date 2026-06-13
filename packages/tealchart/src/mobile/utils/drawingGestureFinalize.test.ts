import { describe, expect, it } from 'vitest';

import { getDrawingPanFinalizeAction } from './drawingGestureFinalize';

describe('mobile drawing gesture finalization', () => {
  it('commits successful drawing pan finalization', () => {
    expect(getDrawingPanFinalizeAction(true)).toBe('end');
  });

  it('cancels failed or native-cancelled drawing pan finalization', () => {
    expect(getDrawingPanFinalizeAction(false)).toBe('cancel');
  });
});
