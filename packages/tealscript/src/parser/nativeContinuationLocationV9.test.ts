import { describe, expect, it } from 'vitest';

import { parse } from './parser';

// Exact native CE10156 markers: oracle-probes/v9/captures/v9/evidence/*-attempt1-error.txt.
describe('native continuation error locations', () => {
  it.each([
    [
      'corpus-v7-99-continuation-v1.pine',
      17,
      29,
      '//@version=6\nindicator("V9 corpus v7 99 continuation")\nsecret = input.string("oracle")\ncatalyst_score = 1.0\nconfidence = 1.0\ncatalyst_window_active = "inactive"\nevent_risk_score = 0.0\npead_score = 0.0\nsue_dir = 0\nbars_to_earn = 1\nbars_to_div = 1\ngolden_cross = false\ndeath_cross = false\ndonch_break_up = false\ndonch_break_down = false\nmake_payload(sig, kind) =>\n    \'{"secret":"\' + secret +\n    \'","symbol":"\' + syminfo.ticker +\n    \'","pillar":"catalyst\' +\n    \'","score":\'      + str.tostring(catalyst_score, "#.####") +\n    \',"confidence":\'  + str.tostring(confidence,     "#.####") +\n    \',"signal":"\'     + sig +\n    \'","price":\'      + str.tostring(close,          "#.####") +\n    \',"timeframe":"\'  + timeframe.period +\n    \'","timestamp":\'  + str.tostring(time) +\n    \',"details":{\' +\n        \'"kind":"\'                       + kind +\n        \'","catalyst_window_active":"\'   + catalyst_window_active +\n        \'","event_risk_score":\'          + str.tostring(event_risk_score, "#.###") +\n        \',"pead_score":\'                 + str.tostring(pead_score,       "#.###") +\n        \',"sue_dir":\'                    + str.tostring(sue_dir) +\n        \',"bars_to_earnings":\'           + (na(bars_to_earn) ? "null" : str.tostring(bars_to_earn)) +\n        \',"bars_to_dividend":\'           + (na(bars_to_div)  ? "null" : str.tostring(bars_to_div)) +\n        \',"golden_cross":\'               + (golden_cross     ? "true" : "false") +\n        \',"death_cross":\'                + (death_cross      ? "true" : "false") +\n        \',"donch_break_up":\'             + (donch_break_up   ? "true" : "false") +\n        \',"donch_break_down":\'           + (donch_break_down ? "true" : "false") +\n    "}}"\noutputValue = make_payload("CONTROL", "EVENT")\nplot(str.length(outputValue), "OUTCOME")\n',
    ],
    [
      'corpus-v7-392-continuation-v1.pine',
      7,
      79,
      '//@version=6\nindicator("V9 corpus v7 392 continuation")\nwtd_pct = close > open ? 0.06 : -0.06\ngrayBg = color.gray\nvar color observedBg = na\nif barstate.islast\n    wtdBg = not na(wtd_pct) and wtd_pct > 0.05  ? color.new(color.green, 40) :\n            not na(wtd_pct) and wtd_pct < -0.05 ? color.new(color.red,   40) : grayBg\n    observedBg := wtdBg\nbgcolor(observedBg)\nplot(1, "OUTCOME")\n',
    ],
    [
      'bare-4-continuation-v6-probe-v1.pine',
      3,
      22,
      '//@version=6\nindicator("V9 bare 4 continuation")\nvalue = open + high +\n    low + close\nplot(value, "OUTCOME")\n',
    ],
    [
      'bare-8-continuation-v6-probe-v1.pine',
      3,
      22,
      '//@version=6\nindicator("V9 bare 8 continuation")\nvalue = open + high +\n        low + close\nplot(value, "OUTCOME")\n',
    ],
  ] as const)('%s reports the captured line ending', (_filename, line, column, source) => {
    let error: unknown;
    try {
      parse(source);
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({
      name: 'TealscriptParseError',
      message: 'Syntax error at input "end of line without line continuation"',
      found: '\n',
      location: { start: { line, column } },
    });
  });
});
