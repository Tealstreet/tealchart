import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';

// Native v20 4b2a3a89d6; matrix.eigenvalues Implicit QL reference.
const stressSource =
  '//@version=6\nindicator("silent-p1-eigen-real-convergence-stress-v20-v1", precision=16)\nint n = input.int(16, "Matrix dimension", minval=2, maxval=32)\nfloat scale = input.float(1.0, "Matrix scale")\nvar matrix<float> m = matrix.new<float>(n, n, 0.0)\nif barstate.isfirst\n    for i = 0 to n - 1\n        matrix.set(m, i, i, scale * (math.abs(2 * i - n + 1) + 1.0))\n        if i < n - 1\n            matrix.set(m, i, i + 1, scale)\n            matrix.set(m, i + 1, i, scale)\narray<float> eigen = matrix.eigenvalues(m)\nint missing = 0\nfloat total = 0.0\nfor i = 0 to array.size(eigen) - 1\n    float value = array.get(eigen, i)\n    if na(value)\n        missing += 1\n    total += value\nplot(bar_index, title="CHART_INDEX", display=display.data_window)\nplot(time, title="CHART_TIME_MS", display=display.data_window)\nplot(n, title="MATRIX_DIMENSION", display=display.data_window)\nplot(scale, title="MATRIX_SCALE", display=display.data_window)\nplot(array.size(eigen), title="EIGEN_COUNT", display=display.data_window)\nplot(missing, title="EIGEN_NA_COUNT", display=display.data_window)\nplot(total, title="EIGEN_SUM")\nplot(array.get(eigen, 0), title="FIRST_EIGEN")\nplot(array.get(eigen, n - 1), title="LAST_EIGEN")\nif barstate.islastconfirmedhistory\n    log.info("EIGEN_VALUES={0}", str.tostring(eigen))\n';
const bars = [
  { time: 1789948800000.0, open: 81178.01, high: 81228.01, low: 81178.01, close: 81198.23, volume: 1 },
  { time: 1789948860000.0, open: 81198.22, high: 81350.0, low: 81184.0, close: 81342.01, volume: 1 },
];

describe('v20 native eigenvalue cells', () => {
  it.each([
    { dimension: 16, expected: [144.00000000000003, 16.450870974313027, 0.6801849878457795] },
    { dimension: 32, expected: [543.9999999999999, 32.450870974312075, 0.6801849878457565] },
  ])('matches unit-scale stress dimension $dimension bit-exact', ({ dimension, expected }) => {
    expect(createHash('sha256').update(stressSource).digest('hex')).toBe(
      '9c3a70364b2e1bf2af850ebfbcfaf20dd38fb3dd492026af59cd8fe1a8d7ad23',
    );
    const execution = executeCompiledScript(
      parse(stressSource),
      bars,
      new Map<string, number>([
        ['input_Matrix dimension', dimension],
        ['input_Matrix scale', 1],
      ]),
    );
    expect(execution.status).toBe('success');
    if (execution.status !== 'success') throw new Error(execution.status);
    expect(execution.result.errors).toEqual([]);
    for (const [index, title] of ['EIGEN_SUM', 'FIRST_EIGEN', 'LAST_EIGEN'].entries()) {
      expect(execution.result.plots.find((plot) => plot.title === title)?.values).toEqual([
        expected[index],
        expected[index],
      ]);
    }
  });
  it('preserves captured tiny eigenvalues before scaling', () => {
    const source =
      '//@version=6\nindicator("silent-s6-tiny-eigenvalues-v20-v1", precision=16)\nvar matrix<float> m = matrix.new<float>(2, 2, 0.0)\nif barstate.isfirst\n    matrix.set(m, 0, 0, 0.000000000001)\n    matrix.set(m, 1, 1, 0.000000000002)\narray<float> eigen = matrix.eigenvalues(m)\nplot(bar_index, title="CHART_INDEX", display=display.data_window)\nplot(time, title="CHART_TIME_MS", display=display.data_window)\nplot(array.get(eigen, 0), title="EIGEN_0")\nplot(array.get(eigen, 0) * 1e12, title="EIGEN_0_SCALED_1E12")\nplot(na(array.get(eigen, 0)) ? 1 : 0, title="EIGEN_0_NA", display=display.data_window)\nplot(array.get(eigen, 1), title="EIGEN_1")\nplot(array.get(eigen, 1) * 1e12, title="EIGEN_1_SCALED_1E12")\nplot(na(array.get(eigen, 1)) ? 1 : 0, title="EIGEN_1_NA", display=display.data_window)\n';
    expect(createHash('sha256').update(source).digest('hex')).toBe(
      '49fbaefd1f52e677dc14c3a697b9f89fc94c0b2efc6dbc872c3a15a9d510013a',
    );
    const execution = executeCompiledScript(parse(source), bars);
    expect(execution.status).toBe('success');
    if (execution.status !== 'success') throw new Error(execution.status);
    expect(execution.result.errors).toEqual([]);
    const expected = {
      EIGEN_0: [2e-12, 2e-12],
      EIGEN_0_SCALED_1E12: [2.0, 2.0],
      EIGEN_0_NA: [0.0, 0.0],
      EIGEN_1: [1e-12, 1e-12],
      EIGEN_1_SCALED_1E12: [1.0, 1.0],
      EIGEN_1_NA: [0.0, 0.0],
    };
    for (const [title, values] of Object.entries(expected)) {
      expect(execution.result.plots.find((plot) => plot.title === title)?.values).toEqual(values);
    }
  });
  it('preserves the captured tiny-scale QL sum and first value', () => {
    const execution = executeCompiledScript(
      parse(stressSource),
      bars,
      new Map<string, number>([
        ['input_Matrix dimension', 32],
        ['input_Matrix scale', 1e-12],
      ]),
    );
    expect(execution.status).toBe('success');
    if (execution.status !== 'success') throw new Error(execution.status);
    expect(execution.result.errors).toEqual([]);
    for (const [title, expected] of [
      ['EIGEN_SUM', 5.44e-10],
      ['FIRST_EIGEN', 3.2450870974312075e-11],
    ] as const) {
      expect(execution.result.plots.find((plot) => plot.title === title)?.values).toEqual([expected, expected]);
    }
  });
  it('publishes the captured complex block real components', () => {
    const source =
      '//@version=6\nindicator("silent-p1-eigen-complex-v20-v1", precision=16)\nvar matrix<float> m = matrix.new<float>(3, 3, 0.0)\nif barstate.isfirst\n    matrix.set(m, 0, 1, -1.0)\n    matrix.set(m, 1, 0, 1.0)\n    matrix.set(m, 2, 2, 1.0)\narray<float> eigen = matrix.eigenvalues(m)\nplot(bar_index, title="CHART_INDEX", display=display.data_window)\nplot(time, title="CHART_TIME_MS", display=display.data_window)\nplot(array.get(eigen, 0), title="EIGEN_0")\nplot(na(array.get(eigen, 0)) ? 1 : 0, title="EIGEN_0_NA", display=display.data_window)\nplot(array.get(eigen, 1), title="EIGEN_1")\nplot(na(array.get(eigen, 1)) ? 1 : 0, title="EIGEN_1_NA", display=display.data_window)\nplot(array.get(eigen, 2), title="EIGEN_2")\nplot(na(array.get(eigen, 2)) ? 1 : 0, title="EIGEN_2_NA", display=display.data_window)\n';
    expect(createHash('sha256').update(source).digest('hex')).toBe(
      '87a7d3c167783e244685a46b19a6ab7a948d99ecb8b45e702f07de46adea066d',
    );
    const execution = executeCompiledScript(parse(source), bars);
    expect(execution.status).toBe('success');
    if (execution.status !== 'success') throw new Error(execution.status);
    expect(execution.result.errors).toEqual([]);
    const expected = {
      EIGEN_0: [0.0, 0.0],
      EIGEN_0_NA: [0.0, 0.0],
      EIGEN_1: [0.0, 0.0],
      EIGEN_1_NA: [0.0, 0.0],
      EIGEN_2: [1.0, 1.0],
      EIGEN_2_NA: [0.0, 0.0],
    };
    for (const [title, values] of Object.entries(expected)) {
      expect(execution.result.plots.find((plot) => plot.title === title)?.values).toEqual(values);
    }
  });
});
