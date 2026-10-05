import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const prefix = '//@version=6\nindicator("plot hline type")\n';
const checked = (body: string) => checkProgram(parse(prefix + body));
const errors = (body: string) => checked(body).diagnostics.filter((entry) => entry.severity === 'error');
// Authority: type-system/#plot-and-hline, ranks 385/386; inferred IDs, no type keywords.
describe('worklist plot and hline inferred ID domains', () => {
  it.each(['plot', 'hline'])('infers series %s references and accepts their same-kind fill pair', (kind) => {
    const result = checked(`a = ${kind}(1)\nb = ${kind}(2)\nalias = a\nfill(alias, b, color.red)`);
    expect(result.diagnostics.filter((entry) => entry.severity === 'error')).toEqual([]);
    for (const name of ['a', 'b', 'alias']) expect(result.symbols.find((symbol) => symbol.name === name)?.type).toMatchObject({ kind, qualifier: 'series' });
  });
  it.each([['plot', 'variable'], ['hline', 'variable'], ['plot', 'parameter'], ['hline', 'parameter']])('rejects %s as an explicit %s type keyword', (kind, position) => {
    const body = position === 'variable' ? `${kind} value = ${kind}(1)` : `consume(${kind} value) => 1\nplot(consume(${kind}(1)))`;
    expect(errors(body).some((entry) => entry.code === 'invalid-type-annotation')).toBe(true);
  });
  it.each(['p, h', 'h, p'])('rejects mixed fill handle kinds %s', (args) => {
    expect(errors(`p = plot(1)\nh = hline(2)\nfill(${args}, color.red)`).some((entry) => entry.code === 'type-mismatch')).toBe(true);
  });
});
