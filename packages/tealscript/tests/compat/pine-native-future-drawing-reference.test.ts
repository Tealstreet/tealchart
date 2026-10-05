import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Native v3 drawing-01 through drawing-11: RE10020 on the last chart bar, after earlier OUTCOME values.
// Captures: oracle-probes/v3/captures/v3/evidence/drawing-*-attempt1-error.png.
const nativeProbes = [
  [
    'drawing-01-line-new-future-index-501.pine',
    '//@version=6\nindicator("V3-DRAWING-01", max_bars_back=256)\nl = line.new(bar_index + 501, close, bar_index, close)\nplot(1, "OUTCOME")\n',
  ],
  [
    'drawing-02-line-set-x1-future-index-501.pine',
    '//@version=6\nindicator("V3-DRAWING-02", max_bars_back=256)\nl=line.new(bar_index,close,bar_index+1,close)\nline.set_x1(l,bar_index+501)\nplot(1, "OUTCOME")\n',
  ],
  [
    'drawing-03-line-set-xy1-future-index-501.pine',
    '//@version=6\nindicator("V3-DRAWING-03", max_bars_back=256)\nl=line.new(bar_index,close,bar_index+1,close)\nline.set_xy1(l,bar_index+501,close)\nplot(1, "OUTCOME")\n',
  ],
  [
    'drawing-04-line-set-x2-future-index-501.pine',
    '//@version=6\nindicator("V3-DRAWING-04", max_bars_back=256)\nl=line.new(bar_index,close,bar_index+1,close)\nline.set_x2(l,bar_index+501)\nplot(1, "OUTCOME")\n',
  ],
  [
    'drawing-05-box-set-left-future-index-501.pine',
    '//@version=6\nindicator("V3-DRAWING-05", max_bars_back=256)\nb=box.new(bar_index,high,bar_index+2,low)\nbox.set_left(b,bar_index+501)\nplot(1, "OUTCOME")\n',
  ],
  [
    'drawing-06-box-set-right-future-index-501.pine',
    '//@version=6\nindicator("V3-DRAWING-06", max_bars_back=256)\nb=box.new(bar_index,high,bar_index+2,low)\nbox.set_right(b,bar_index+501)\nplot(1, "OUTCOME")\n',
  ],
  [
    'drawing-07-label-new-future-index-501.pine',
    '//@version=6\nindicator("V3-DRAWING-07", max_bars_back=256)\nlabel.new(bar_index+501,close)\nplot(1, "OUTCOME")\n',
  ],
  [
    'drawing-08-label-set-x-future-index-501.pine',
    '//@version=6\nindicator("V3-DRAWING-08", max_bars_back=256)\nl=label.new(bar_index,close)\nlabel.set_x(l,bar_index+501)\nplot(1, "OUTCOME")\n',
  ],
  [
    'drawing-09-label-set-xy-future-index-501.pine',
    '//@version=6\nindicator("V3-DRAWING-09", max_bars_back=256)\nl=label.new(bar_index,close)\nlabel.set_xy(l,bar_index+501,close)\nplot(1, "OUTCOME")\n',
  ],
  [
    'drawing-10-line-set-xy2-future-index-501.pine',
    '//@version=6\nindicator("V3-DRAWING-10", max_bars_back=256)\nl=line.new(bar_index,close,bar_index+1,close)\nline.set_xy2(l,bar_index+501,close)\nplot(1, "OUTCOME")\n',
  ],
  [
    'drawing-11-box-new-future-index-501.pine',
    '//@version=6\nindicator("V3-DRAWING-11", max_bars_back=256)\nbox.new(bar_index,high,bar_index+501,low)\nplot(1, "OUTCOME")\n',
  ],
] as const;

describe('native future drawing refusals', () => {
  for (const [name, source] of nativeProbes) {
    it(`${name} raises the captured error at the last chart boundary`, () => {
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toHaveLength(1);
      expect(getPlot(result, 'OUTCOME').values).toEqual([1, 1]);
      expect(result.errors[0]!.message).toBe(
        'Error on bar 2: Objects positioned using xloc.bar_index cannot be drawn further than 500 bars into the future.',
      );
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
    });
  }
});
