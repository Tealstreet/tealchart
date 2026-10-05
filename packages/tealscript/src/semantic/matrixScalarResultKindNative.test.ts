import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { executeScript } from '../runtime/compiledOnly';
import { checkProgram } from './checker';

const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
const bodyErrors = (body: string) => errors(`//@version=6\nindicator("Matrix result kinds")\n${body}`);
const capturedFloatTarget = "//@version=6\nindicator(\"Collection24 sum fractional probe v1\", overlay=false)\nleft = matrix.new<int>(1, 1, 1)\nmatrix<float> result = matrix.sum(left, 0.5)\nplot(matrix.get(result, 0, 0), \"OUTCOME\")\n";
const capturedIntTarget = "//@version=6\nindicator(\"Collection24 sum fractional probe v1\", overlay=false)\nleft = matrix.new<int>(1, 1, 1)\nmatrix<int> result = matrix.sum(left, 0.5)\nplot(matrix.get(result, 0, 0), \"OUTCOME\")\n";

// Native v7 collection24 matrix-sum float/int return captures settle metadata.
// The accepted integer-matrix result still exports the fractional value 1.5.
describe('native matrix scalar result kinds', () => {
  it('refuses the captured float target with the integer result kind', () => {
    expect(errors(capturedFloatTarget)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'type-mismatch', message: 'Cannot assign matrix<int> value to matrix<float> variable result' }),
    ]));
  });
  it('accepts and executes the captured integer target without rounding values', () => {
    expect(errors(capturedIntTarget)).toEqual([]);
    const bars = [0, 1, 2].map((i) => ({ time: 1700000000000 + i * 60000, open: 1, high: 2, low: 0, close: 1, volume: 1 }));
    const result = executeScript(parse(capturedIntTarget), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([1.5, 1.5, 1.5]);
  });

  for (const operation of ['sum', 'diff', 'mult']) {
    const calls = [`matrix.${operation}(left,0.5)`, `matrix.${operation}(id2=0.5,id1=left)`, `matrix.${operation}(id=left,id2=0.5)`, `left.${operation}(id2=0.5)`];
    for (const kind of ['int', 'float']) {
      it.each(calls)(`${operation} preserves matrix<${kind}> for scalar through %s`, (call) => {
        const setup = `left=matrix.new<${kind}>(1,1,${kind === 'int' ? '1' : '1.0'})\n`;
        expect(bodyErrors(setup + `matrix<${kind}> result=${call}\nplot(matrix.get(result,0,0))`)).toEqual([]);
        const wrongKind = kind === 'int' ? 'float' : 'int';
        expect(bodyErrors(setup + `matrix<${wrongKind}> result=${call}\nplot(1)`).some((d) => d.code === 'type-mismatch')).toBe(true);
      });
    }
  }
  it.each(['sum', 'diff', 'mult', 'kron'])('%s keeps mixed matrix operand promotion', (operation) => {
    expect(bodyErrors(`left=matrix.new<int>(1,1,1)\nright=matrix.new<float>(1,1,0.5)\nmatrix<float> result=matrix.${operation}(id2=right,id1=left)\nplot(matrix.get(result,0,0))`)).toEqual([]);
  });
  it('keeps vector multiplication promotion and array shape', () => {
    expect(bodyErrors('left=matrix.new<int>(1,1,1)\nright=array.from(0.5)\narray<float> result=matrix.mult(left,right)\nplot(result.get(0))')).toEqual([]);
  });
  it('keeps selected custom sum return metadata', () => {
    expect(bodyErrors('method sum(matrix<int> self, float value) =>\n    matrix.new<float>(1,1,value)\nleft=matrix.new<int>(1,1,1)\nmatrix<float> result=left.sum(0.5)\nplot(result.get(0,0))')).toEqual([]);
  });
});
