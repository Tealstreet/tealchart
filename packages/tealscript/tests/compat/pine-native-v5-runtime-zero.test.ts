import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Native v5 capture hashes bind each source to its observed na()/nz() outputs.
// RAW alone cannot distinguish missing values from serialized Infinity.
const cases = [
  {
    name: 'ledger47-zero-div-v5-compound-zero-v1.pine',
    source:
      '//@version=5\nindicator("ledger47-zero-div-v5-compound-zero-v1", overlay=false)\nvalue = close\nvalue /= close - close\nplot(time, title="INPUT_TIME")\nplot(close, title="NUMERATOR_CLOSE")\nplot(value, title="RAW")\nplot(na(value) ? 1 : 0, title="IS_NA")\nplot(nz(value, 42.0), title="NZ_42")\n',
    sourceSHA256: 'c5de25080e3ee41186414b4fa5e41be518045cf184b3ad9c5b32e3c378007728',
    captureSHA256: '9cc91992689be0cf42578de2b03f6c708d4654acd0854aef0cd3e0ce57bc5e0e',
    missing: true,
  },
  {
    name: 'ledger47-zero-div-v5-dynamic-negative-zero-v1.pine',
    source:
      '//@version=5\nindicator("ledger47-zero-div-v5-dynamic-negative-zero-v1", overlay=false)\ndenominator = -(close - close)\nvalue = close / denominator\nplot(time, title="INPUT_TIME")\nplot(close, title="NUMERATOR_CLOSE")\nplot(value, title="RAW")\nplot(na(value) ? 1 : 0, title="IS_NA")\nplot(nz(value, 42.0), title="NZ_42")\n',
    sourceSHA256: 'a805da2449743d9bf19e3d0c5e9d110cd5d8c3bceb651e1b5440da9ac46055cf',
    captureSHA256: '58bab83787bf95a0ee0c95f6681243cf7715065dbfcd85c60795368f68c2eb32',
    missing: true,
  },
  {
    name: 'ledger47-zero-div-v5-dynamic-positive-zero-v1.pine',
    source:
      '//@version=5\nindicator("ledger47-zero-div-v5-dynamic-positive-zero-v1", overlay=false)\ndenominator = close - close\nvalue = close / denominator\nplot(time, title="INPUT_TIME")\nplot(close, title="NUMERATOR_CLOSE")\nplot(value, title="RAW")\nplot(na(value) ? 1 : 0, title="IS_NA")\nplot(nz(value, 42.0), title="NZ_42")\n',
    sourceSHA256: '4b3330d4f5920fa44d2ccf4f3fdb2e4b640d1e68487863f5cfbc6b1e827b3972',
    captureSHA256: '00401c3a4a51cdd18cdbc2549c80ec757fa36e85fdd17a7f4fe76f519da0768c',
    missing: true,
  },
  {
    name: 'ledger47-zero-div-v5-finite-control-v1.pine',
    source:
      '//@version=5\nindicator("ledger47-zero-div-v5-finite-control-v1", overlay=false)\nvalue = close / 2.0\nplot(time, title="INPUT_TIME")\nplot(close, title="NUMERATOR_CLOSE")\nplot(value, title="RAW")\nplot(na(value) ? 1 : 0, title="IS_NA")\nplot(nz(value, 42.0), title="NZ_42")\n',
    sourceSHA256: '9771856344ebcf270c9f5542f7466c2d6e6f9002487eb590295555e6f0c5d59d',
    captureSHA256: '1d9caeb6732b41ba68e1352d34d7a86d3047161ebc3e5c5e99ca829979b9c7eb',
    missing: false,
  },
  {
    name: 'ledger47-zero-div-v5-missing-numerator-control-v1.pine',
    source:
      '//@version=5\nindicator("ledger47-zero-div-v5-missing-numerator-control-v1", overlay=false)\nfloat numerator = na\nvalue = numerator / 2.0\nplot(time, title="INPUT_TIME")\nplot(close, title="NUMERATOR_CLOSE")\nplot(value, title="RAW")\nplot(na(value) ? 1 : 0, title="IS_NA")\nplot(nz(value, 42.0), title="NZ_42")\n',
    sourceSHA256: '3a06ad2800003911fda5f13807c3225f0df7d34b3190eb9528c4b8cea212a3e6',
    captureSHA256: 'ddd66e8b59dd4d022669cd705b553d070259fe1b5c2ec627b9126e6de03142e5',
    missing: true,
  },
  {
    name: 'ledger47-zero-div-v5-udf-zero-v1.pine',
    source:
      '//@version=5\nindicator("ledger47-zero-div-v5-udf-zero-v1", overlay=false)\ndivide(float x, float y) => x / y\nvalue = divide(close, close - close)\nplot(time, title="INPUT_TIME")\nplot(close, title="NUMERATOR_CLOSE")\nplot(value, title="RAW")\nplot(na(value) ? 1 : 0, title="IS_NA")\nplot(nz(value, 42.0), title="NZ_42")\n',
    sourceSHA256: 'ec2f93dbf2de2548fcc274ca69c86aea341e3a14a264725e3ebdbfc38392893c',
    captureSHA256: 'b02ac26c87a09d0ceefb054e84bf77fc1b6392f8e059d800fcb844dbc87781b1',
    missing: true,
  },
] as const;

describe('native v5 runtime zero denominators', () => {
  for (const probe of cases) {
    it(probe.name, () => {
      const bars = [10, 20, 30].map((close, index) => ({
        time: 1788134400000 + index * 120000,
        open: close,
        high: close + 1,
        low: close - 1,
        close,
        volume: 1,
      }));
      const result = runCompatScript(probe.source, { bars });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'IS_NA').values).toEqual(probe.missing ? [1, 1, 1] : [0, 0, 0]);
      expect(getPlot(result, 'NZ_42').values).toEqual(probe.missing ? [42, 42, 42] : [5, 10, 15]);
      expect(getPlot(result, 'RAW').values).toEqual(probe.missing ? [null, null, null] : [5, 10, 15]);
    });
  }
});
