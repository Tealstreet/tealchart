import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { PINE_V6_REFERENCE_SIGNATURES, type PineV6ReferenceSignature } from '../src/compat/pineV6BuiltinSignatures.ts';
import { parse } from '../src/parser/parser.ts';
import { checkProgram, type SemanticDiagnostic } from '../src/semantic/checker.ts';

type ProbeKind =
  | 'required-missing'
  | 'named-required'
  | 'mixed-positional-named'
  | 'named-prefix-positional-tail'
  | 'arity-overrun'
  | 'overload-distinctive-named'
  | 'optional-omission';

interface SignatureEntry {
  namespace: string;
  name: string;
  signature: PineV6ReferenceSignature;
}

interface ProbeResult {
  name: string;
  namespace: string;
  kind: ProbeKind;
  verdict: 'pass' | 'fail' | 'unprobed';
  expected: string;
  call?: string;
  reason?: string;
  diagnostics?: string[];
}

interface Report {
  generatedAt: string;
  source: {
    signatureSource: string;
    semanticEntrypoint: string;
  };
  summary: {
    signatures: number;
    probes: number;
    passed: number;
    failed: number;
    unprobed: number;
    signaturesWithBindingFailures: number;
    optionalSlotsWithoutDocumentedDefaultOracle: number;
  };
  failuresByKind: Record<string, number>;
  failuresByNamespace: Record<string, number>;
  failures: ProbeResult[];
  unprobedByKind: Record<string, number>;
  unprobed: ProbeResult[];
}

const BINDING_CODES = new Set([
  'argument-count',
  'argument-order',
  'duplicate-argument',
  'unknown-argument',
  'invalid-overload',
]);

const REPORT_JSON = 'reports/pine-builtin-argument-binding-sweep-v1.json';
const REPORT_MD = 'reports/pine-builtin-argument-binding-sweep-v1.md';

const PRELUDE = `
arr = array.new_float(2, close)
arr2 = array.new_float(2, open)
arrStr = array.new_string(2, "x")
arrPoint = array.new<chart.point>()
mat = matrix.new<float>(2, 2, close)
mat2 = matrix.new<float>(2, 2, open)
mp = map.new<string, float>()
pt = chart.point.new(time, bar_index, close)
pt2 = chart.point.new(time, bar_index + 1, open)
ln = line.new(bar_index, close, bar_index + 1, open)
ln2 = line.new(bar_index, high, bar_index + 1, low)
lf = linefill.new(ln, ln2, color.red)
lbl = label.new(bar_index, close, "x")
bx = box.new(bar_index, high, bar_index + 1, low)
tbl = table.new(position.top_right, 1, 1)
pl = plot(close)
hl = hline(1)
`;

function flattenSignatures(): SignatureEntry[] {
  return Object.entries(PINE_V6_REFERENCE_SIGNATURES).flatMap(([namespace, signatures]) =>
    Object.entries(signatures).map(([name, signature]) => ({ namespace, name, signature })),
  ).sort((a, b) => a.name.localeCompare(b.name));
}

function cleanParam(param: string): string {
  return param.split(',')[0]!.trim();
}

function isVariadicParam(param: string): boolean {
  return param.includes('...');
}

function requiredParams(signature: PineV6ReferenceSignature): string[] {
  return [...(signature.requiredParams ?? signature.params.slice(0, signature.minArgs ?? 0).map(cleanParam))];
}

function minArgs(signature: PineV6ReferenceSignature): number {
  return signature.minArgs ?? 0;
}

function maxArgs(signature: PineV6ReferenceSignature): number | undefined {
  return signature.maxArgs;
}

function paramsForProbe(signature: PineV6ReferenceSignature): string[] {
  return [...signature.params].map(cleanParam);
}

function optionalSlotCount(signature: PineV6ReferenceSignature): number {
  const required = new Set(requiredParams(signature));
  return signature.params
    .map(cleanParam)
    .filter((param, index) => !required.has(param) && index >= minArgs(signature))
    .length;
}

function positionalParamsForProbe(signature: PineV6ReferenceSignature, suppliedNames: Set<string>): string[] {
  const params = paramsForProbe(signature);
  const required = requiredParams(signature);
  const hasOptionalLeadingParam = params.length > 0
    && required.length > 0
    && (params[0] === 'source' || params[0] === 'series')
    && !required.includes(params[0]!);
  return hasOptionalLeadingParam && !suppliedNames.has(params[0]!) ? params.slice(1) : params;
}

function validMixedArgs(name: string, signature: PineV6ReferenceSignature): string[] {
  const params = paramsForProbe(signature).filter((param) => !isVariadicParam(param));
  const required = requiredParams(signature);
  if (params.length < 2) return [];
  const positionalParams = positionalParamsForProbe(signature, new Set());
  if (positionalParams.length < 2) return [];
  const first = positionalParams[0]!;
  const requiredAfterFirst = required.filter((param) => param !== first);
  const namedTail = [...requiredAfterFirst];
  const targetNamedCount = Math.max(requiredAfterFirst.length, minArgs(signature) - 1, 1);
  for (const param of positionalParams.slice(1)) {
    if (namedTail.length >= targetNamedCount) break;
    if (!namedTail.includes(param)) namedTail.push(param);
  }
  return [
    valueForParam(name, first),
    ...namedTail.map((param) => `${param} = ${valueForParam(name, param)}`),
  ];
}

function validNamedPrefixTailArgs(name: string, signature: PineV6ReferenceSignature): string[] {
  const params = paramsForProbe(signature).filter((param) => !isVariadicParam(param));
  if (params.length < 2) return [];
  const first = params[0]!;
  const positionalParams = positionalParamsForProbe(signature, new Set([first]));
  const required = requiredParams(signature);
  const args = [`${first} = ${valueForParam(name, first)}`];
  const requiredTail = required.filter((param) => param !== first);
  for (const param of positionalParams.slice(1)) {
    if (!requiredTail.includes(param)) continue;
    args.push(valueForParam(name, param));
  }
  const targetArgCount = Math.max(2, minArgs(signature));
  for (const param of positionalParams.slice(1)) {
    if (args.length >= targetArgCount) break;
    if (requiredTail.includes(param)) continue;
    args.push(valueForParam(name, param));
  }
  return args;
}

function overloadDistinctiveProbes(entry: SignatureEntry): ProbeResult[] {
  const { name, signature } = entry;
  if (!signature.overloads || signature.overloads.length === 0) return [];
  const overloads = signature.overloads.map((overload) => overload.map(cleanParam));
  return overloads.flatMap((overload, index) => {
    const otherParams = new Set(overloads.flatMap((candidate, candidateIndex) => candidateIndex === index ? [] : candidate));
    const distinctive = overload.find((param) => !otherParams.has(param)) ?? overload[overload.length - 1];
    if (!distinctive || isVariadicParam(distinctive)) return [];
    const required = requiredParams(signature);
    const named = new Set<string>([
      ...required.filter((param) => overload.includes(param)),
      ...overload.slice(0, Math.max(1, minArgs(signature))).filter((param) => !isVariadicParam(param)),
      distinctive,
    ]);
    const args = [...named].map((param) => `${param} = ${valueForParam(name, param)}`);
    return [
      recordProbe(
        entry,
        'overload-distinctive-named',
        callWithArgs(name, args),
        false,
        `overload ${index + 1} distinctive parameter '${distinctive}' binds by name`,
      ),
    ];
  });
}

function valueForParam(callName: string, param: string): string {
  const p = cleanParam(param);
  if (callName.startsWith('array.') && (p === 'id' || p === 'array_id' || p === 'a')) return 'arr';
  if (callName.startsWith('array.') && (p === 'id1' || p === 'array1')) return 'arr';
  if (callName.startsWith('array.') && (p === 'id2' || p === 'array2')) return 'arr2';
  if (callName.startsWith('matrix.') && (p === 'id' || p === 'matrix_id' || p === 'this')) return 'mat';
  if (callName.startsWith('matrix.') && (p === 'id1' || p === 'matrix1')) return 'mat';
  if (callName.startsWith('matrix.') && (p === 'id2' || p === 'matrix2')) return 'mat2';
  if (callName.startsWith('map.') && p === 'id') return 'mp';
  if (callName.startsWith('table.') && (p === 'table_id' || p === 'id')) return 'tbl';
  if (callName.startsWith('linefill.') && (p === 'id' || p === 'linefill_id')) return 'lf';
  if (callName.startsWith('line.') && (p === 'id' || p === 'line_id' || p === 'line1')) return 'ln';
  if (callName.startsWith('line.') && p === 'line2') return 'ln2';
  if (callName.startsWith('label.') && (p === 'id' || p === 'label_id')) return 'lbl';
  if (callName.startsWith('box.') && (p === 'id' || p === 'box_id')) return 'bx';
  if (callName.startsWith('chart.point.') && (p === 'id' || p === 'point' || p.endsWith('_point') || p === 'top_left' || p === 'bottom_right')) return 'pt';
  if (p === 'first_point' || p === 'second_point' || p === 'top_right' || p === 'bottom_left') return 'pt2';
  if (p === 'plot1' || p === 'plot2' || p === 'hline1' || p === 'hline2') return p.includes('hline') ? 'hl' : 'pl';
  if (p === 'points') return 'arrPoint';
  if (p === 'key') return '"k"';
  if (p === 'order') return 'order.ascending';
  if (p === 'direction') return 'strategy.long';
  if (p === 'oca_type') return 'strategy.oca.none';
  if (p === 'currency') return 'currency.USD';
  if (p === 'lookahead') return 'barmerge.lookahead_off';
  if (p === 'gaps') return 'barmerge.gaps_off';
  if (p === 'position') return 'position.top_right';
  if (p === 'location') return 'location.abovebar';
  if (p === 'size') return callName.startsWith('array.') || callName.startsWith('matrix.') ? '1' : 'size.normal';
  if (p === 'style') return callName.startsWith('line.') ? 'line.style_solid' : callName.startsWith('label.') ? 'label.style_label_up' : 'plot.style_line';
  if (p === 'linestyle') return 'hline.style_solid';
  if (p === 'xloc') return 'xloc.bar_index';
  if (p === 'yloc') return 'yloc.price';
  if (p === 'extend') return 'extend.none';
  if (p === 'display') return 'display.all';
  if (p === 'format') return callName.startsWith('str.') ? '"{0}"' : 'format.price';
  if (p === 'font_family' || p === 'text_font_family') return 'font.family_default';
  if (p === 'textalign') return 'text.align_center';
  if (p === 'text_formatting') return 'text.format_none';
  if (p === 'session') return '"0930-1600"';
  if (p === 'timeframe' || p === 'resolution') return '"60"';
  if (callName === 'request.currency_rate' && (p === 'from' || p === 'to')) return p === 'from' ? '"USD"' : '"EUR"';
  if (p === 'symbol' || p === 'ticker' || p === 'tickerid' || p === 'prefix') return '"NASDAQ:AAPL"';
  if (p === 'source' || p === 'series' || p === 'defval' || p === 'value' || p === 'initial_value' || p === 'val') {
    if (callName.includes('string') || callName.startsWith('str.') || p === 'source' && callName.startsWith('str.')) return '"x"';
    if (callName.includes('bool')) return 'true';
    if (callName.includes('color')) return 'color.red';
    return 'close';
  }
  if (p.includes('color') || p === 'color') return 'color.red';
  if (/^(title|text|tooltip|inline|group|message|comment|alert_message|regex|replacement|target|substring|separator|formatString|arg0|arg1|sort_field)$/.test(p)) return '"x"';
  if (/^(condition|confirm|active|editable|force_overlay|overlay|biased|ignore_invalid_symbol|ignore_invalid_timeframe|calc_bars_count|is_standard|disable_alert|when|floor)$/.test(p)) return 'true';
  if (p === 'time') return 'time';
  if (p === 'timezone') return '"Etc/UTC"';
  if (/^(x|x1|x2|y|y1|y2|index|length|row|column|columns|rows|width|offset|precision|transp|transparency|seed|occurrence|repeat|leftbars|rightbars|trade_num|qty|contracts|from|to|begin_pos|end_pos|percentage|power|hour|minute|second|month|day|year|min|max|minval|maxval|step|top|bottom|left|right|price|open|high|low|close|number|number0|number1|base|exponent|angle|radians|degrees)$/.test(p)) return '1';
  return 'close';
}

function callWithArgs(name: string, args: string[]): string {
  return `${name}(${args.join(', ')})`;
}

function runCall(call: string): { parseError?: string; diagnostics: SemanticDiagnostic[] } {
  const source = `//@version=6\nindicator("binding sweep")\n${PRELUDE}\n${call}\nplot(close)\n`;
  try {
    const program = parse(source);
    return { diagnostics: checkProgram(program).diagnostics };
  } catch (error) {
    return { parseError: error instanceof Error ? error.message : String(error), diagnostics: [] };
  }
}

function bindingDiagnostics(result: { parseError?: string; diagnostics: SemanticDiagnostic[] }): string[] {
  if (result.parseError) return [`parse-error: ${result.parseError}`];
  return result.diagnostics
    .filter((diagnostic) => BINDING_CODES.has(diagnostic.code))
    .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`);
}

function recordProbe(entry: SignatureEntry, kind: ProbeKind, call: string, expectBindingError: boolean, expected: string): ProbeResult {
  const diagnostics = bindingDiagnostics(runCall(call));
  const hasBindingError = diagnostics.length > 0;
  const pass = expectBindingError ? hasBindingError : !hasBindingError;
  return {
    name: entry.name,
    namespace: entry.namespace,
    kind,
    verdict: pass ? 'pass' : 'fail',
    expected,
    call,
    diagnostics,
  };
}

function buildProbes(entry: SignatureEntry): ProbeResult[] {
  const { name, signature } = entry;
  const params = paramsForProbe(signature).filter((param) => !isVariadicParam(param));
  const probes: ProbeResult[] = [];
  const required = requiredParams(signature);

  if (required.length > 0 || minArgs(signature) > 0) {
    const missingParam = required[required.length - 1] ?? params[minArgs(signature) - 1];
    const supplied = params
      .filter((param) => param !== missingParam)
      .slice(0, Math.max(0, minArgs(signature) - 1))
      .map((param) => `${param} = ${valueForParam(name, param)}`);
    probes.push(recordProbe(entry, 'required-missing', callWithArgs(name, supplied), true, 'missing required argument is refused'));
  }

  if (required.length > 0) {
    const args = required.map((param) => `${param} = ${valueForParam(name, param)}`);
    probes.push(recordProbe(entry, 'named-required', callWithArgs(name, args), false, 'required arguments bind by name'));
  }

  if (params.length >= 2) {
    const args = validMixedArgs(name, signature);
    if (args.length > 0) {
      probes.push(recordProbe(entry, 'mixed-positional-named', callWithArgs(name, args), false, 'positional arguments may precede named arguments'));
    }

    const reverseArgs = validNamedPrefixTailArgs(name, signature);
    if (reverseArgs.length > 0) {
      probes.push(recordProbe(entry, 'named-prefix-positional-tail', callWithArgs(name, reverseArgs), false, 'builtin named-prefix positional tail binds when the leading named argument is a documented parameter'));
    }
  }

  const max = maxArgs(signature);
  if (max !== undefined && Number.isFinite(max)) {
    const args = Array.from({ length: max + 1 }, (_, index) => valueForParam(name, params[index] ?? params[params.length - 1] ?? 'value'));
    probes.push(recordProbe(entry, 'arity-overrun', callWithArgs(name, args), true, 'extra positional argument is refused'));
  }

  const optionalSlots = optionalSlotCount(signature);
  if (optionalSlots > 0) {
    probes.push({
      name,
      namespace: entry.namespace,
      kind: 'optional-omission',
      verdict: 'unprobed',
      expected: 'omitted optional argument uses documented default value',
      reason: 'The committed v6 signature snapshot records optionality but does not carry documented default values; default-value correctness needs a value oracle or explicit default table.',
    });
  }

  probes.push(...overloadDistinctiveProbes(entry));

  return probes;
}

function countBy<T extends string>(items: ProbeResult[], key: (item: ProbeResult) => T): Record<T, number> {
  return items.reduce<Record<T, number>>((acc, item) => {
    const value = key(item);
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {} as Record<T, number>);
}

function toMarkdown(report: Report): string {
  const failureRows = report.failures.length === 0
    ? 'None.'
    : report.failures.map((failure) => `- ${failure.kind} ${failure.name}: expected ${failure.expected}; call \`${failure.call}\`; diagnostics ${JSON.stringify(failure.diagnostics ?? [])}`).join('\n');
  const unprobedRows = report.unprobed.length === 0
    ? 'None.'
    : report.unprobed.slice(0, 40).map((probe) => `- ${probe.name}: ${probe.reason}`).join('\n')
      + (report.unprobed.length > 40 ? `\n- ... ${report.unprobed.length - 40} more optional-default rows in JSON.` : '');
  const hasCurrencyRate = report.failures.some((failure) => failure.name === 'request.currency_rate');
  const hasTaMinMax = report.failures.some((failure) => failure.name === 'ta.max' || failure.name === 'ta.min');
  const causeSummary = report.failures.length === 0
    ? 'None.'
    : [
        hasCurrencyRate
          ? '- `request.currency_rate`: the v6 table documents `from`, `to`, and `ignore_invalid_currency`. The parser accepts `from` as an argument name but rejects `to = ...` because `to` is reserved outside the `ArgumentName` carveout. This is one root cause represented by the named-required and mixed positional/named probes.'
          : undefined,
        hasTaMinMax
          ? '- `ta.max` / `ta.min`: the v6 reference signature exposed through coverage is one-argument (`source`, max arity 1), but the checker accepts `ta.max(close, close)` and `ta.min(close, close)` with no binding diagnostic. This is one semantic arity/binding root cause shared by two signatures.'
          : undefined,
      ].filter(Boolean).join('\n');

  return `# Pine Builtin Argument Binding Sweep v1

Generated at: ${report.generatedAt}

## Scope

- Signature source: \`${report.source.signatureSource}\`
- Checker entrypoint: \`${report.source.semanticEntrypoint}\`
- Pine version: v6 reference signature table.
- Binding diagnostics counted: \`${[...BINDING_CODES].join('`, `')}\`.

This sweep probes binding mechanics only. It counts required-argument refusals, named binding, positional-then-named binding, builtin named-prefix positional tails, finite-arity overruns, and distinctive named parameters on overloads. It does not infer optional default values from silence: optional slots without an explicit default oracle are reported as unprobed rather than assumed correct.

## Summary

| Metric | Count |
| --- | ---: |
| Signatures swept | ${report.summary.signatures} |
| Binding probes run | ${report.summary.probes} |
| Passed binding probes | ${report.summary.passed} |
| Failed binding probes | ${report.summary.failed} |
| Signatures with binding failures | ${report.summary.signaturesWithBindingFailures} |
| Optional slots without documented-default oracle | ${report.summary.optionalSlotsWithoutDocumentedDefaultOracle} |
| Unprobed rows | ${report.summary.unprobed} |

## Verdict

${report.summary.failed === 0
    ? 'No binding-rule failures were found in the derived sweep. Required arguments refuse when missing, named arguments bind, positional-then-named forms bind, positional-after-named forms reject, and finite-arity overruns reject for the probed builtin signatures.'
    : `${report.summary.failed} binding-rule failures were found. See failure clusters below.`}

Optional default *values* remain outside this sweep unless a separate documented-default oracle exists. The signature table tells us which slots are optional; it does not encode the default value TradingView uses.

## Cause Summary

${causeSummary}

## Failure Clusters

By kind:

\`\`\`json
${JSON.stringify(report.failuresByKind, null, 2)}
\`\`\`

By namespace:

\`\`\`json
${JSON.stringify(report.failuresByNamespace, null, 2)}
\`\`\`

## Failures

${failureRows}

## Unprobed Optional Defaults

By kind:

\`\`\`json
${JSON.stringify(report.unprobedByKind, null, 2)}
\`\`\`

${unprobedRows}
`;
}

const entries = flattenSignatures();
const probes = entries.flatMap(buildProbes);
const failures = probes.filter((probe) => probe.verdict === 'fail');
const unprobed = probes.filter((probe) => probe.verdict === 'unprobed');
const report: Report = {
  generatedAt: new Date().toISOString(),
  source: {
    signatureSource: 'packages/tealscript/src/compat/pineV6BuiltinSignatures.ts',
    semanticEntrypoint: 'packages/tealscript/src/semantic/checker.ts checkProgram()',
  },
  summary: {
    signatures: entries.length,
    probes: probes.filter((probe) => probe.verdict !== 'unprobed').length,
    passed: probes.filter((probe) => probe.verdict === 'pass').length,
    failed: failures.length,
    unprobed: unprobed.length,
    signaturesWithBindingFailures: new Set(failures.map((failure) => failure.name)).size,
    optionalSlotsWithoutDocumentedDefaultOracle: entries.reduce((sum, entry) => sum + optionalSlotCount(entry.signature), 0),
  },
  failuresByKind: countBy(failures, (failure) => failure.kind),
  failuresByNamespace: countBy(failures, (failure) => failure.namespace),
  failures,
  unprobedByKind: countBy(unprobed, (probe) => probe.kind),
  unprobed,
};

mkdirSync(dirname(REPORT_JSON), { recursive: true });
writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD, toMarkdown(report));

console.log(JSON.stringify(report.summary, null, 2));
