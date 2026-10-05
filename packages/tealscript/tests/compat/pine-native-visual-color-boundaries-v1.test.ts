import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const bars = compatibilityBars.slice(0, 8);
const channels = ['R', 'G', 'B', 'T'];

function colors(body: string) {
  const result = runCompatScript(`//@version=6
indicator("Native color boundary witness")
${body}
plot(color.r(c), "R")
plot(color.g(c), "G")
plot(color.b(c), "B")
plot(color.t(c), "T")`, { bars });
  expect(result.errors).toEqual([]);
  return channels.map((title) => getPlot(result, title).values);
}

// Native v7 color constructor CSVs: dynamic argument changes at bar3.
// Source/capture hashes and exact tuples: visual-singles-be-b00b-v1/NATIVE-COLOR-TUPLES-v1.json.
describe('captured native dynamic color constructor boundaries', () => {
  it.each([
    { name: 'negative', value: '-1', transparency: 0 },
    { name: 'over', value: '101', transparency: 100 },
    { name: 'missing', value: 'na', transparency: 100 },
  ])('color.new dynamic $name transparency preserves native channels', ({ value, transparency }) => {
    const vectors = colors(`t = bar_index % 8 == 3 ? ${value} : 50
c = color.new(color.red, t)`);
    expect(vectors[0]).toEqual(Array(8).fill(242));
    expect(vectors[1]).toEqual(Array(8).fill(54));
    expect(vectors[2]).toEqual(Array(8).fill(69));
    expect(vectors[3]).toEqual([50, 50, 50, transparency, 50, 50, 50, 50]);
  });

  it.each([
    { name: 'red negative', value: -1, call: 'x, 128, 192', control: [100, 128, 192], native: [255, 255, 255] },
    { name: 'red over', value: 256, call: 'x, 128, 192', control: [100, 128, 192], native: [0, 129, 192] },
    { name: 'green negative', value: -1, call: '64, x, 192', control: [64, 100, 192], native: [64, 255, 255] },
    { name: 'green over', value: 256, call: '64, x, 192', control: [64, 100, 192], native: [64, 0, 193] },
    { name: 'blue negative', value: -1, call: '64, 128, x', control: [64, 128, 100], native: [64, 128, 255] },
    { name: 'blue over', value: 256, call: '64, 128, x', control: [64, 128, 100], native: [64, 128, 0] },
  ])('color.rgb dynamic $name retains native packing and finite controls', ({ value, call, control, native }) => {
    const vectors = colors(`x = bar_index % 8 == 3 ? ${value} : 100
c = color.rgb(${call})`);
    for (let channel = 0; channel < 3; channel++) {
      expect(vectors[channel]).toEqual(Array.from({ length: 8 }, (_, bar) => bar === 3 ? native[channel] : control[channel]));
    }
    expect(vectors[3]).toEqual(Array(8).fill(0));
  });

  it('equal gradient bounds retain native transparent-zero channels for finite and missing values', () => {
    const vectors = colors(`x = bar_index % 4 == 0 ? -1.0 : bar_index % 4 == 1 ? 0.0 : bar_index % 4 == 2 ? 1.0 : na
c = color.from_gradient(x, 0, 0, color.red, color.blue)`);
    for (const vector of vectors.slice(0, 3)) expect(vector).toEqual(Array(8).fill(0));
    expect(vectors[3]).toEqual(Array(8).fill(100));
  });

  it('nondegenerate gradient endpoints retain their existing finite channels', () => {
    const vectors = colors(`x = bar_index % 3 == 0 ? -1.0 : bar_index % 3 == 1 ? 0.0 : 1.0
c = color.from_gradient(x, 0, 1, color.red, color.blue)`);
    expect(vectors[0]).toEqual([242, 242, 41, 242, 242, 41, 242, 242]);
    expect(vectors[1]).toEqual([54, 54, 98, 54, 54, 98, 54, 54]);
    expect(vectors[2]).toEqual([69, 69, 255, 69, 69, 255, 69, 69]);
    expect(vectors[3]).toEqual(Array(8).fill(0));
  });
});
