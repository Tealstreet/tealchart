import { describe, expect, it } from 'vitest';

import { parse } from './parser';

// Native v5 oracle-probes/v5/corpus-compile-third-v5-fullwidth-comment-layout-v1.pine.
// Source SHA5446685a; RUNS evidence: oracle-probes/v5/captures/v5/outcomes-v5.json.
describe('captured v5 comment-only full-width layout', () => {
  it('admits the exact capture and retains following source locations', () => {
    const source =
      '//@version=5\nindicator("corpus-compile-third-v5-fullwidth-comment-layout-v1")\n    　　// Full-width spaces before a comment, matching the corpus construct.\nplot(close, "TARGET")\n';
    const program = parse(source);
    expect(program.body.at(-1)?.type).toBe('ExpressionStatement');
    expect(program.body.at(-1)?.loc?.start).toEqual({ line: 4, column: 1, offset: source.indexOf('plot(close') });
  });

  it('preserves comment-like text inside string literals', () => {
    const source = '//@version=6\nindicator("Literal control")\nvalue = """first\n　// literal\nlast"""\n';
    expect(JSON.stringify(parse(source))).toContain('　// literal');
  });
});
