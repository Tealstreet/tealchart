import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const diagnostics = (body: string) =>
  checkProgram(
    parse(`//@version=6
indicator("Float range")
${body}
plot(close)`),
  ).diagnostics;

describe('input review float range contracts', () => {
  for (const [index, name] of ['minval', 'maxval', 'step'].entries()) {
    it.each(['"bad"', 'true', 'color.red'])(`${name} rejects nonnumeric %s`, (value) => {
      expect(diagnostics(`v=input.float(3, ${name}=${value})`)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining(name) }),
        ]),
      );
    });
    it.each(['input.float(1)', 'close', 'syminfo.mintick'])(`${name} rejects nonconst %s`, (value) => {
      expect(
        diagnostics(`limit=${value}
v=input.float(3, ${name}=limit)`),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining(name) }),
        ]),
      );
    });
    it(`${name} accepts const int/float in named and positional slots`, () => {
      for (const value of ['1', '1.5']) {
        const safe = name === 'maxval' ? '8' : value;
        expect(
          diagnostics(`const float limit=${safe}
v=input.float(3, ${name}=limit)`),
        ).toEqual([]);
        const args = ['3', '"Range"', '0', '10', '1'];
        args[index + 2] = safe;
        expect(diagnostics(`v=input.float(${args.join(',')})`)).toEqual([]);
      }
    });
  }
});
