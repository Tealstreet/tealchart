import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { compile } from '../../src/runtime/codegen/compile';

const tuple = (size: number) => `[${Array.from({ length: size }, (_, index) => `close + ${index}`).join(',')}]`;
const request = (size: number, prefix: string, symbol: string, expression: string) =>
  `[${Array.from({ length: size }, (_, index) => `${prefix}${index}`).join(',')}] = request.security("${symbol}", "1", ${expression})\nplot(${Array.from({ length: size }, (_, index) => `${prefix}${index}`).join('+')})`;
const result = (body: string) => compile(parse(`//@version=6\nindicator("UDF request tuple limit")\n${body}`));
const authority = 'https://www.tradingview.com/pine-script-docs/writing/limitations/#tuple-element-limit';

describe('worklist1752 request tuples returned by UDFs', () => {
  it('admits127 elements from a UDF', () => {
    expect(result(`values() => ${tuple(127)}\n${request(127, 'a', 'ALT', 'values()')}`).success, authority).toBe(true);
  });
  it('refuses128 elements from one UDF request', () => {
    const compiled = result(`values() => ${tuple(128)}\n${request(128, 'a', 'ALT', 'values()')}`);
    expect(compiled.success, authority).toBe(false);
    expect(compiled.unsupported.join(' ')).toMatch(/127.*tuple|tuple.*127/i);
  });
  it('admits64 plus63 elements from separate UDF returns', () => {
    expect(
      result(
        `left() => ${tuple(64)}\nright() => ${tuple(63)}\n${request(64, 'a', 'ALT', 'left()')}\n${request(63, 'b', 'OTHER', 'right()')}`,
      ).success,
      authority,
    ).toBe(true);
  });
  it('preserves the exact native-admitted shared64-return UDF source', () => {
    const source =
      '//@version=6\nindicator("UDF tuple128 discriminator")\nvalues()=>[close+0,close+1,close+2,close+3,close+4,close+5,close+6,close+7,close+8,close+9,close+10,close+11,close+12,close+13,close+14,close+15,close+16,close+17,close+18,close+19,close+20,close+21,close+22,close+23,close+24,close+25,close+26,close+27,close+28,close+29,close+30,close+31,close+32,close+33,close+34,close+35,close+36,close+37,close+38,close+39,close+40,close+41,close+42,close+43,close+44,close+45,close+46,close+47,close+48,close+49,close+50,close+51,close+52,close+53,close+54,close+55,close+56,close+57,close+58,close+59,close+60,close+61,close+62,close+63]\n[a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,a15,a16,a17,a18,a19,a20,a21,a22,a23,a24,a25,a26,a27,a28,a29,a30,a31,a32,a33,a34,a35,a36,a37,a38,a39,a40,a41,a42,a43,a44,a45,a46,a47,a48,a49,a50,a51,a52,a53,a54,a55,a56,a57,a58,a59,a60,a61,a62,a63]=request.security(syminfo.tickerid,"1",values())\nplot(a0+a1+a2+a3+a4+a5+a6+a7+a8+a9+a10+a11+a12+a13+a14+a15+a16+a17+a18+a19+a20+a21+a22+a23+a24+a25+a26+a27+a28+a29+a30+a31+a32+a33+a34+a35+a36+a37+a38+a39+a40+a41+a42+a43+a44+a45+a46+a47+a48+a49+a50+a51+a52+a53+a54+a55+a56+a57+a58+a59+a60+a61+a62+a63,"a sum")\n[b0,b1,b2,b3,b4,b5,b6,b7,b8,b9,b10,b11,b12,b13,b14,b15,b16,b17,b18,b19,b20,b21,b22,b23,b24,b25,b26,b27,b28,b29,b30,b31,b32,b33,b34,b35,b36,b37,b38,b39,b40,b41,b42,b43,b44,b45,b46,b47,b48,b49,b50,b51,b52,b53,b54,b55,b56,b57,b58,b59,b60,b61,b62,b63]=request.security(syminfo.tickerid,"2",values())\nplot(b0+b1+b2+b3+b4+b5+b6+b7+b8+b9+b10+b11+b12+b13+b14+b15+b16+b17+b18+b19+b20+b21+b22+b23+b24+b25+b26+b27+b28+b29+b30+b31+b32+b33+b34+b35+b36+b37+b38+b39+b40+b41+b42+b43+b44+b45+b46+b47+b48+b49+b50+b51+b52+b53+b54+b55+b56+b57+b58+b59+b60+b61+b62+b63,"b sum")\n';
    expect(createHash('sha256').update(source).digest('hex')).toBe(
      '7d0f86049693210a22628f71ee8a248c4287d982fb16499c2334306778eb74ea',
    );
    expect(compile(parse(source)).success).toBe(true);
  });
  it('admits a128-field UDT request as the documented workaround', () => {
    const fields = Array.from({ length: 128 }, (_, index) => `    float f${index}`).join('\n');
    const args = Array.from({ length: 128 }, (_, index) => `close + ${index}`).join(',');
    expect(
      result(
        `type Payload\n${fields}\npayload = request.security("ALT", "1", Payload.new(${args}))\nplot(payload.f0 + payload.f127)`,
      ).success,
      authority,
    ).toBe(true);
  });
});
