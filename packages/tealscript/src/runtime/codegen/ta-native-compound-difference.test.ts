import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

// Native mfi-flat-flows-v2.csv: rolling_difference_up/down, bars0-78/0-7.
// packages/tealscript/oracle-probes/v2/captures/v2/mfi-flat-flows-v2.csv
// Inputs are captured clean_up_flow/down_flow, independently all strictAGREE.
// This isolates the compound assignment from Change and Sum builtin behavior.
const fixtures = [
  {
    side: 'up',
    target: 77,
    source: [
      4028404.8528179997, 2605458.5665808003, 0.0, 0.0, 0.0, 2450689.80676, 2534715.2645509, 1491543.8644573,
      2996524.0113207, 612967.5879943, 1419244.6175600002, 1383225.3207236999, 1052590.7016677, 0.0, 0.0,
      1549075.9867731, 0.0, 5363530.8426462, 0.0, 0.0, 586080.7602, 0.0, 0.0, 0.0, 1244075.82782, 1289869.8266299998,
      694495.0354263999, 0.0, 0.0, 0.0, 2133796.64832, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1869168.9560010002,
      724366.5642871001, 1575176.1694605, 0.0, 721857.5073884999, 725750.6929665, 0.0, 0.0, 0.0, 0.0, 0.0,
      1647572.39434, 2425801.1149926004, 0.0, 0.0, 1524032.7499796003, 0.0, 534750.16164, 0.0, 0.0, 776208.0094002, 0.0,
      0.0, 0.0, 2856115.8887087, 1638934.76552, 1429911.894222, 0.0, 891865.9600055001, 1051483.8795999999, 0.0, 0.0,
      0.0, 0.0, 4558666.5314552, 0.0, 1529737.0993080002, 0.0, 1456194.81148, 0.0, 0.0, 0.0,
    ],
    expected: -4.656612873077393e-10,
    control: 6633863.4193988,
  },
  {
    side: 'down',
    target: 6,
    source: [4028404.8528179997, 0.0, 2574173.855126, 7318464.070060001, 2356939.7449312, 0.0, 0.0, 0.0],
    expected: 1.3969838619232178e-9,
    control: 4028404.8528179997,
  },
];
describe('Native compound rolling difference', () => {
  it.each(fixtures)('$side matches the native zero-flow carry', (fixture) => {
    const bars = fixture.source.map((source, index) => ({
      time: index * 120000,
      open: 1,
      high: 1,
      low: 1,
      close: source ?? NaN,
      volume: 1,
    }));
    const result = executeScript(
      parse(`//@version=6
indicator("Native compound difference")
f(s) =>
    var float older = na
    var float newest = na
    var float total = 0.0
    var int count = 0
    if not na(s)
        removed = count >= 2 ? older : 0.0
        total += s - removed
        older := newest
        newest := s
        count += 1
    count >= 2 ? total : na
plot(f(close), "value")`),
      bars,
    );
    expect(result.errors).toEqual([]);
    const values = result.plots[0].values;
    expect(values).toHaveLength(fixture.source.length);
    expect(values[1]).toBeCloseTo(fixture.control, 8);
    expect(values[fixture.target]).toBe(fixture.expected);
  });
});
