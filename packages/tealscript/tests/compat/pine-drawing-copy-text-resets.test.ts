import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const cases = [
  {
    family: 'label',
    constructor:
      'label.new(2,13,"seed",tooltip="seed tip",text_font_family=font.family_monospace,text_formatting=text.format_bold)',
    coordinates: { x: 2, y: 13 },
  },
  {
    family: 'box',
    constructor:
      'box.new(2,13,5,-7,text="seed",text_font_family=font.family_monospace,text_formatting=text.format_bold)',
    coordinates: { left: 2, top: 13, right: 5, bottom: -7 },
  },
] as const;
// v6 reference: label/box.copy clones fields; their text/font/format setters
// accept empty text, the default font, and text.format_none.
describe('Drawing copies snapshot cleared and reset text appearance', () => {
  for (const item of cases)
    for (const method of [false, true]) {
      it(`${item.family}, method=${method}: keeps old and reset snapshots independently`, () => {
        const call = (id: string, name: string, args = '') =>
          method ? `${id}.${name}(${args})` : `${item.family}.${name}(${id}${args ? `,${args}` : ''})`;
        const tooltip = (id: string, value: string) =>
          item.family === 'label' ? call(id, 'set_tooltip', JSON.stringify(value)) : '';
        const encode = (id: string) =>
          `na(${id})?-1:${call(id, 'get_text')}==""?0:${call(id, 'get_text')}=="seed"?10:${call(id, 'get_text')}=="source edit"?20:${call(id, 'get_text')}=="old edit"?30:${call(id, 'get_text')}=="reset edit"?40:99`;
        const script = `//@version=6
indicator("Copy text resets")
var source=${item.constructor}
var older=${call('source', 'copy')}
var ${item.family} reset=na
if bar_index==1
    ${call('source', 'set_text', 'text=""')}
    ${tooltip('source', '')}
    ${call('source', 'set_text_font_family', 'font.family_default')}
    ${call('source', 'set_text_formatting', 'text.format_none')}
    reset:=${call('source', 'copy')}
if bar_index==2
    ${call('source', 'set_text', '"source edit"')}
    ${tooltip('source', 'source tip')}
    ${call('source', 'set_text_font_family', 'font.family_monospace')}
    ${call('source', 'set_text_formatting', 'text.format_bold')}
    ${call('older', 'set_text', '"old edit"')}
    ${tooltip('older', 'old tip')}
    ${call('reset', 'set_text', '"reset edit"')}
    ${tooltip('reset', 'reset tip')}
    ${call('reset', 'set_text_font_family', 'font.family_monospace')}
    ${call('reset', 'set_text_formatting', 'text.format_italic')}
plot(${encode('source')},"source")
plot(${encode('older')},"older")
plot(${encode('reset')},"reset")
plot(array.size(${item.family}.all),"count")`;
        for (const count of [1, 2, 3]) {
          const result = runCompatScript(script, { bars: compatibilityBars.slice(0, count) });
          expect(result.errors).toEqual([]);
          expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
          expect(getPlot(result, 'source').values).toEqual([10, 0, 20].slice(0, count));
          expect(getPlot(result, 'older').values).toEqual([10, 10, 30].slice(0, count));
          expect(getPlot(result, 'reset').values).toEqual([-1, 0, 40].slice(0, count));
          expect(getPlot(result, 'count').values).toEqual([2, 3, 3].slice(0, count));
          const drawings = result.drawings.filter((d) => d.type === item.family);
          expect(drawings).toHaveLength(count === 1 ? 2 : 3);
          expect(new Set(drawings.map((d) => d.id)).size).toBe(drawings.length);
          const texts =
            count === 1 ? ['seed', 'seed'] : count === 2 ? ['', 'seed', ''] : ['source edit', 'old edit', 'reset edit'];
          const fonts = count === 2 ? ['default', 'monospace', 'default'] : ['monospace', 'monospace', 'monospace'];
          const formats =
            count === 2 ? ['none', 'bold', 'none'] : count === 3 ? ['bold', 'bold', 'italic'] : ['bold', 'bold'];
          const tips =
            count === 1
              ? ['seed tip', 'seed tip']
              : count === 2
                ? ['', 'seed tip', '']
                : ['source tip', 'old tip', 'reset tip'];
          drawings.forEach((drawing, i) =>
            expect(drawing).toMatchObject({
              ...item.coordinates,
              text: texts[i],
              textFontFamily: fonts[i],
              textFormatting: formats[i],
              ...(item.family === 'label' ? { tooltip: tips[i] } : {}),
            }),
          );
        }
      });
    }
});
