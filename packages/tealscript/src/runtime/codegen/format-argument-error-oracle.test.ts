import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = [4, 6].map((close, i) => ({ time: i * 60000, open: close, high: close + 1, low: close - 1, close, volume: 1 }));
const run = (body: string) => executeScript(parse(`//@version=6\nindicator("format errors")\n${body}`), bars);

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json fun_str.format and fun_log.info/warning/error.
// Native oracle-probes/v3/captures/v3/evidence/{scalar-01-str-format,scalar-02-log-info,
// scalar-03-log-warning,scalar-04-log-error}-unbalanced-left-brace-attempt1-error.png.
describe('documented formatting brace errors', () => {
  for (const name of ['str.format', 'log.info', 'log.warning', 'log.error']) {
    it.each(['ab {0', "ab {0'}' de", 'ab }{0}{ de', "''{''{0}"])(`${name} rejects unbalanced unquoted left braces: %s`, template => {
      const result = run(`${name}(${JSON.stringify(template)}, close)\nplot(1)`);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('unbalanced');
      expect(result.errors[0].code).not.toBe('RE10001');
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
    });
  }

  it('leaves a lone right brace legal in str.format', () => {
    const result = run('plot(str.format("ab }{0} de", 4) == "ab }4 de" ? 1 : 0)');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([1, 1]);
  });

  it('treats quoted braces and placeholders literally, and paired apostrophes as one apostrophe', () => {
    const result = run(`plot(str.format("'{' '{0}' ''{0}", 4) == "{ {0} '4" ? 1 : 0)`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([1, 1]);
  });

  it.each(['log.info', 'log.warning', 'log.error'])('%s rejects a lone unquoted right brace in a formatting pattern', name => {
    const result = run(`${name}("ab } de", close)\nplot(1)`);
    expect(result.errors).toHaveLength(1);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
  });

  it('validates when the formatting call executes', () => {
    const result = run('if bar_index == 1\n    log.info("ab {0", close)\nplot(1)');
    expect(result.errors).toHaveLength(1);
    expect(result.plots[0].values[0]).toBe(1);
    const skipped = run('if bar_index < 0\n    str.format("ab {0", close)\nplot(1)');
    expect(skipped.errors).toEqual([]);
  });
});
