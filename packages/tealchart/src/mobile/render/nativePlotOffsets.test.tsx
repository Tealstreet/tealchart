import { describe, expect, it, vi } from 'vitest';

import { nativePlotHarness, testBars, testPlot } from '../../test/nativePlotPaintHarness';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));
describe('native offset source windows', () => {
  it('retains shifted source bars outside the raw visible slice', () => {
    const paths = nativePlotHarness([testPlot({ offset: 2 })], false, testBars.slice(2)).paths();
    expect(paths[0].path.moveTo).toHaveBeenCalledWith(200, 180);
  });
});
