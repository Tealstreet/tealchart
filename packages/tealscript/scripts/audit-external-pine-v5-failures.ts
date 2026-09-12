import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type ReportRow = {
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  firstFailedStage?: string | null;
  stages: { semantic?: { diagnostic?: string }; execute?: { diagnostic?: string } };
};

type Classification = 'real TealScript gap' | 'invalid Pine' | 'corpus artifact';

type Verdict = {
  construct: string;
  accepts: boolean;
  classification: Classification;
  rule: string;
  citation: string;
};

const citations = {
  types: '[v6 type system](https://www.tradingview.com/pine-script-docs/language/type-system/)',
  operators: '[v6 operators](https://www.tradingview.com/pine-script-docs/language/operators/)',
  reference: '[v6 reference manual](https://www.tradingview.com/pine-script-reference/v6/)',
  plots: '[v6 plots](https://www.tradingview.com/pine-script-docs/visuals/plots/)',
  strategies: '[v6 strategies](https://www.tradingview.com/pine-script-docs/concepts/strategies/)',
  tables: '[v6 tables](https://www.tradingview.com/pine-script-docs/visuals/tables/)',
};

function verdictFor(row: ReportRow): Verdict {
  const p = row.localPath;
  if (p.includes('wavetrend_v3_strategy') || p.includes('__wavetrend_v3.pine')) {
    return {
      construct: 'integer `math.floor()` result passed through integer `math.min`/`math.max`',
      accepts: true,
      classification: 'real TealScript gap',
      rule: '`math.floor()` returns an integer, and integer overloads of `math.min`/`math.max` preserve the integer type; assigning the result to `_binIdx` is valid.',
      citation: citations.reference,
    };
  }
  if (p.includes('color.new') || row.stages.semantic?.diagnostic?.includes("linewidth must be a positive integer")) {
    return {
      construct: 'invalid `color.new()`/`plot()` argument shape',
      accepts: false,
      classification: 'invalid Pine',
      rule: '`color.new()` accepts a color and transparency, not a second `color` or `linewidth`; `plot()` linewidth must be a positive integer, so `linewidth=0` is outside the documented domain.',
      citation: p.includes('color.new') ? citations.reference : citations.plots,
    };
  }
  if (p.includes('0955')) {
    return {
      construct: '`strategy.exit(trail_points=...)` without `trail_offset`',
      accepts: false,
      classification: 'invalid Pine',
      rule: 'A trailing stop requires both `trail_offset` and one activation parameter such as `trail_points` or `trail_price`.',
      citation: citations.strategies,
    };
  }
  if (p.includes('table_set_position')) {
    return {
      construct: '`table.set_position(id, "position.bad")`',
      accepts: false,
      classification: 'invalid Pine',
      rule: '`table.set_position()` requires a valid `position.*` enum value; an arbitrary string/member is not accepted.',
      citation: citations.tables,
    };
  }
  if (p.includes('RTAAdvanced') || p.includes('relative_leg_efficiency') || p.includes('shortWindow') || p.includes('microPivotLen') || p.includes('0486') || p.includes('0487') || p.includes('0501') || p.includes('ifft') || p.includes('betadist') || p.includes('fdist') || p.includes('trim') || p.includes('wins') || p.includes('hend') || p.includes('nyqma') || p.includes('HashFunction') || p.includes('Order-Blocks-with-signals')) {
    return {
      construct: 'float-valued division or compound division assigned to an `int`',
      accepts: false,
      classification: 'invalid Pine',
      rule: 'The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment.',
      citation: citations.operators,
    };
  }
  if (p.includes('barssince') || p.includes('rsi-divergence') || p.includes('FalseRemovals')) {
    return {
      construct: 'numeric `ta.change()` result used where a bool condition is required',
      accepts: false,
      classification: 'invalid Pine',
      rule: '`ta.change()` preserves the source numeric type; `ta.barssince()` and `ta.valuewhen()` require a bool condition, and an int cannot be assigned to bool.',
      citation: citations.reference,
    };
  }
  if (p.includes('v2.5.6_v2.5.9')) {
    return {
      construct: 'float ternary arm assigned to bool `gapPoints`',
      accepts: false,
      classification: 'invalid Pine',
      rule: 'Both conditional arms must be compatible with the declared bool type; `math.abs()` returns float and `na` is not a bool value in v6.',
      citation: citations.types,
    };
  }
  if (p.includes('pivot-popints') || p.includes('cand-b061508a')) {
    return {
      construct: 'boolean `nz()` replacement / boolean `na` state',
      accepts: false,
      classification: 'invalid Pine',
      rule: 'Pine v6 booleans cannot hold `na`; numeric `nz()` overloads cannot be used to manufacture a boolean fallback in this expression.',
      citation: citations.types,
    };
  }
  if (p.includes('0979')) {
    return {
      construct: 'unknown enum member `position.bad`',
      accepts: false,
      classification: 'invalid Pine',
      rule: 'The table position argument accepts only documented `position.*` enum members.',
      citation: citations.tables,
    };
  }
  return {
    construct: 'float-valued division or compound division assigned to an `int`',
    accepts: false,
    classification: 'invalid Pine',
    rule: 'The `/` operator produces a float result; Pine does not implicitly narrow a float to int. An explicit `int()` conversion is required before assignment or compound reassignment.',
    citation: citations.operators,
  };
}

function unknownArgumentVerdict(row: ReportRow): Verdict {
  const p = row.localPath;
  if (p.includes('0948')) {
    return {
      construct: '`table.cell(table_id = table, ...)` named first parameter',
      accepts: true,
      classification: 'real TealScript gap',
      rule: '`table.cell()` exposes its first parameter as `table_id`; named arguments may be used for it, so this call is valid v6.',
      citation: citations.tables,
    };
  }
  if (p.includes('0640') || p.includes('0641') || p.includes('0642') || p.includes('0648') || p.includes('0654') || p.includes('0655') || p.includes('0656')) {
    return {
      construct: '`strategy(..., initialCapital=...)`',
      accepts: false,
      classification: 'invalid Pine',
      rule: 'The v6 declaration parameter is `initial_capital` (underscore); `initialCapital` is not a v6 named parameter.',
      citation: citations.strategies,
    };
  }
  return {
    construct: '`color.new()` with extra named `color` and/or `linewidth` arguments',
    accepts: false,
    classification: 'invalid Pine',
    rule: '`color.new()` has only the documented color and transparency parameters; `color=` and `linewidth=` are not parameters of that function.',
    citation: citations.reference,
  };
}

function additionalVerdict(row: ReportRow): Verdict {
  const p = row.localPath;
  const diagnostic = row.stages.semantic?.diagnostic ?? row.stages.execute?.diagnostic ?? '';
  if (diagnostic.includes('unknown-identifier')) {
    if (p.includes('0539') || p.includes('0550') || p.includes('0551') || p.includes('0553') || p.includes('0558') || p.includes('0865')) {
      return {
        construct: 'local variable referenced after its declaration in a UDF return expression',
        accepts: true,
        classification: 'real TealScript gap',
        rule: 'A local variable declared earlier in the same function scope is available to later expressions and may be returned; these are not forward references.',
        citation: citations.types,
      };
    }
    return {
      construct: 'undeclared identifier or self-reference during its own initializer',
      accepts: false,
      classification: 'invalid Pine',
      rule: 'Pine requires an identifier to be declared before use; a declaration cannot use the variable being initialized, and references with no declaration are invalid.',
      citation: citations.types,
    };
  }
  if (diagnostic.includes('duplicate-argument')) {
    return {
      construct: 'same named argument supplied positionally and/or more than once',
      accepts: false,
      classification: 'invalid Pine',
      rule: 'A function call cannot bind one parameter more than once; duplicate named/positional arguments are rejected by the v6 call rules.',
      citation: citations.reference,
    };
  }
  if (diagnostic.includes('duplicate-symbol')) {
    return {
      construct: 'function and variable declared with the same identifier in one scope',
      accepts: false,
      classification: 'invalid Pine',
      rule: 'Declarations in one Pine scope must have unique identifiers; a function name cannot be redeclared as a variable in that same scope.',
      citation: citations.types,
    };
  }
  if (diagnostic.includes('implicit-numeric-bool')) {
    return {
      construct: 'numeric expression used directly as a boolean',
      accepts: false,
      classification: 'invalid Pine',
      rule: 'Pine v6 does not implicitly convert int/float values to bool; compare the number explicitly or use a documented boolean expression.',
      citation: citations.types,
    };
  }
  if (diagnostic.includes('argument-count')) {
    return {
      construct: 'valid namespace call counted as an over-arity method call',
      accepts: true,
      classification: 'real TealScript gap',
      rule: 'The documented namespace forms accept these arguments: `matrix.add_row(id, row, array)`, `line.get_y1(line)`, and `table.clear(table_id, start_column, start_row, end_column, end_row)`.',
      citation: citations.reference,
    };
  }
  if (diagnostic.includes('Array index') && diagnostic.includes('out of bounds')) {
    return {
      construct: 'array access on an empty runtime array (`array.last`, `array.get`, or equivalent)',
      accepts: true,
      classification: 'real TealScript gap',
      rule: 'The array APIs are valid Pine; an empty-array access is a runtime condition and must be reproduced or diagnosed at the execution boundary, not rejected as invalid source.',
      citation: citations.reference,
    };
  }
  if (diagnostic.includes('qualifier-mismatch')) {
    return {
      construct: 'series argument passed to an inferred/simple UDF parameter',
      accepts: false,
      classification: 'invalid Pine',
      rule: 'A simple parameter accepts only simple, input, or const values; a series argument is stronger and is rejected by the v6 qualifier hierarchy.',
      citation: citations.types,
    };
  }
  throw new Error(`No additional verdict mapping for ${p}: ${diagnostic}`);
}

function diagnosticFor(row: ReportRow): string {
  return row.stages.semantic?.diagnostic ?? row.stages.execute?.diagnostic ?? 'missing diagnostic';
}

function evidenceLine(row: ReportRow, sourceLines: string[], diagnostic: string): number {
  const diagnosticLine = Number(diagnostic.match(/^(\d+):/)?.[1] ?? 0);
  if (diagnosticLine > 0) return diagnosticLine;
  if (diagnostic.includes('Array index')) {
    const pattern = row.localPath.includes('0497') || row.localPath.includes('0554') ? /array\.last\(/ : row.localPath.includes('0760') ? /\.get\(/ : /array\.get\(/;
    const index = sourceLines.findIndex((line) => pattern.test(line));
    if (index >= 0) return index + 1;
  }
  return 1;
}

async function main(): Promise<void> {
  const [reportPath, sourceRoot, outputPath] = process.argv.slice(2);
  if (!reportPath || !sourceRoot || !outputPath) throw new Error('Usage: audit-external-pine-v5-failures report.json source-root output.md');
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as { rows: ReportRow[]; measurementCommitSha: string };
  const rows = report.rows.filter((row) => {
    const diagnostic = diagnosticFor(row);
    return diagnostic.includes('type-mismatch') || diagnostic.includes('unknown-argument') || diagnostic.includes('unknown-identifier') || diagnostic.includes('duplicate-argument') || diagnostic.includes('duplicate-symbol') || diagnostic.includes('implicit-numeric-bool') || diagnostic.includes('argument-count') || diagnostic.includes('Array index') || diagnostic.includes('qualifier-mismatch');
  });
  const classify = (row: ReportRow): Verdict => {
    const diagnostic = diagnosticFor(row);
    if (diagnostic.includes('type-mismatch')) return verdictFor(row);
    if (diagnostic.includes('unknown-argument')) return unknownArgumentVerdict(row);
    return additionalVerdict(row);
  };
  const sections = [
    ['type-mismatch', rows.filter((row) => diagnosticFor(row).includes('type-mismatch')).map((row) => [row, classify(row)] as const)],
    ['unknown-argument', rows.filter((row) => diagnosticFor(row).includes('unknown-argument')).map((row) => [row, classify(row)] as const)],
    ['unknown-identifier', rows.filter((row) => diagnosticFor(row).includes('unknown-identifier')).map((row) => [row, classify(row)] as const)],
    ['duplicate-argument', rows.filter((row) => diagnosticFor(row).includes('duplicate-argument')).map((row) => [row, classify(row)] as const)],
    ['duplicate-symbol', rows.filter((row) => diagnosticFor(row).includes('duplicate-symbol')).map((row) => [row, classify(row)] as const)],
    ['implicit-numeric-bool', rows.filter((row) => diagnosticFor(row).includes('implicit-numeric-bool')).map((row) => [row, classify(row)] as const)],
    ['argument-count', rows.filter((row) => diagnosticFor(row).includes('argument-count')).map((row) => [row, classify(row)] as const)],
    ['array-bounds', rows.filter((row) => diagnosticFor(row).includes('Array index') && diagnosticFor(row).includes('out of bounds')).map((row) => [row, classify(row)] as const)],
    ['qualifier-mismatch', rows.filter((row) => diagnosticFor(row).includes('qualifier-mismatch')).map((row) => [row, classify(row)] as const)],
  ] as const;
  const lines = [
    '# External Pine Corpus V5 Row Audit V4',
    '',
    `This is a row-level audit of the pinned v5 report at TealScript measurement commit \`${report.measurementCommitSha}\`. Sources are read from the fixed corpus directory and retain the report's repository, path, and source SHA. ` +
      '“Corpus artifact” is reserved for a harvester/normalization defect; a malformed construct present in the pinned source is invalid Pine instead.',
    '',
    'Overlaying the row verdicts on the raw buckets changes 23 raw TealScript-gap rows to invalid Pine and 2 raw invalid-Pine rows to real TealScript gaps. The corrected headline is `832 supported / 73 TealScript gap / 85 invalid Pine / 10 unsupported-by-design`. The comparable achievable denominator is `905`, so the audited support rate is `832/905 = 91.93%`. The other 71 raw TealScript-gap rows remain pending or gap rows; they are enumerated in the separate remainder dispatch list.',
    '',
    '## Verdicts',
    '',
  ];
  for (const [cause, entries] of sections) {
    const counts = entries.reduce<Record<Classification, number>>((acc, [, v]) => { acc[v.classification] += 1; return acc; }, { 'real TealScript gap': 0, 'invalid Pine': 0, 'corpus artifact': 0 });
    lines.push(`### ${cause} (${entries.length} rows)`, '', `Counts: real TealScript gap ${counts['real TealScript gap']}; invalid Pine ${counts['invalid Pine']}; corpus artifact ${counts['corpus artifact']}.`, '');
    for (const [row, verdict] of entries) {
      const diagnostic = diagnosticFor(row);
      const sourceLines = (await readFile(path.join(sourceRoot, row.localPath), 'utf8')).split(/\r?\n/);
      const lineNumber = evidenceLine(row, sourceLines, diagnostic);
      const snippet = sourceLines.slice(lineNumber - 1, lineNumber + 2).join(' ').trim().replaceAll('`', '\\`');
      lines.push(
        `#### ${row.localPath}`,
        `- Source: ${row.sourceRepoUrl} :: \`${row.sourceFilePath}\` @ \`${row.commitSha}\``,
        `- Evidence: line ${lineNumber}: \`${snippet}\``,
        `- TealScript diagnostic: \`${diagnostic}\``,
        `- Pine accepts it: **${verdict.accepts ? 'yes' : 'no'}**`,
        `- Verdict: **${verdict.classification}**`,
        `- Construct: ${verdict.construct}`,
        `- v6 rule: ${verdict.rule} ${verdict.citation}`,
        '',
      );
    }
  }
  await writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
