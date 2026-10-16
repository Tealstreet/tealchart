import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import { Skia } from '@shopify/react-native-skia';

import { parse } from '../../../../tealscript/src/parser';
import { executeCompiled, tryCompile } from '../../../../tealscript/src/runtime/codegen/execute';
import { testBars, testFrame } from '../../test/nativePlotPaintHarness';
import { NativeIndicatorPlotLayerImpl } from './NativeIndicatorPlotLayer';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));

// The companion web suite SHA-binds each exact source, native PNG, numeric CSV
// and DERIVED region map. Here the actual native layer must emit the same order;
// these synthetic host bars are geometry setup, never native numeric evidence.
const oracleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../tealscript/oracle-probes/v93/captures/v93');
function plotTitles(node: any): string[] {
  if (Array.isArray(node)) return node.flatMap(plotTitles);
  if (!node?.props) return [];
  const plot = node.props.plot ?? node.props.fill;
  return plot ? [plot.title] : plotTitles(node.props.children);
}
describe('v93 native layer ordering from unchanged captured sources', () => {
  for (const version of [5, 6]) for (const mode of ['false', 'true', 'groups']) {
    it(`encodes the witnessed plot/fill/hline precedence: ${mode} v${version}`, () => {
      const source = readFileSync(resolve(oracleRoot, `v93-zorder-${mode}-v${version}/attempt-v1/executed-v1.pine`), 'utf8');
      const compiled = tryCompile(parse(source));
      expect(compiled.success).toBe(true);
      const result = executeCompiled(compiled, testBars)!;
      expect(result.errors).toEqual([]);
      const plots = result.plots.map(plot => ({ ...plot, scriptId: 's' }));
      const node = NativeIndicatorPlotLayerImpl({ bars: testBars, visibleBars: testBars,
        frame: testFrame, totalBarCount: testBars.length, plots,
        indicatorPaneInfo: { s: { overlay: false, paneId: 'study', explicitPlotZOrder: result.declaration.explicitPlotZOrder } },
        textFont: Skia.Font(null, 12), sharedViewport: { startTime: { value: 0 }, endTime: { value: 4000 },
          priceMin: { value: 0 }, priceMax: { value: 100 } },
      });
      const titles = plotTitles(node);
      const index = (title: string) => {
        expect(titles).toContain(title);
        return titles.indexOf(title);
      };
      const group = mode === 'groups';
      const fill = index(group ? 'RED_FILL' : 'RED_BAND');
      const plot = index(group ? 'BLUE_PLOT' : 'BLUE_SEVEN');
      const hline = index(group ? 'GREEN_HLINE' : 'GREEN_SEVEN');
      if (mode === 'true') {
        expect(fill).toBeGreaterThan(plot);
        expect(fill).toBeGreaterThan(hline);
      } else {
        expect(hline).toBeGreaterThan(plot);
        expect(plot).toBeGreaterThan(fill);
      }
      if (group) expect(fill).toBeGreaterThan(index(result.plots.find(plot => plot.type === 'bgcolor')!.title));
    });
  }
});
