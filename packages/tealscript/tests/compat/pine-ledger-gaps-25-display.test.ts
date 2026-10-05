import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('ledger gaps 25 display constants', () => {
  it('rank 965: status_line adds to a data-window mask and subtracts from all', () => {
    const source = `//@version=6
indicator("Ledger 25 display masks")
plot(close, "Combined", display=display.data_window + display.status_line)
plot(close, "Removed", display=display.all - display.status_line)
plot(display.status_line, "Status")
plot(display.data_window, "Window")
plot(display.all, "All")
`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars: [compatibilityBars[0]!] });
    expect(result.errors).toEqual([]);
    const status = getPlot(result, 'Status').values[0] as number;
    const window = getPlot(result, 'Window').values[0] as number;
    const all = getPlot(result, 'All').values[0] as number;
    expect(status).toBeGreaterThan(0);
    expect((status & window) === 0).toBe(true);
    expect((all & status) === status).toBe(true);
    expect(getPlot(result, 'Combined').display).toBe(status + window);
    expect(getPlot(result, 'Removed').display).toBe(all - status);
    // Mask relations follow the reference; this does not prove Style tab behavior.
  });
});
