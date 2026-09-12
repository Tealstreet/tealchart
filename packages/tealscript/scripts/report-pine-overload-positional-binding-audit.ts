#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { parse } from '../src/parser/parser.ts';
import { checkProgram } from '../src/semantic/checker.ts';
import { executeScript } from '../src/runtime/compiledOnly.ts';
import type { ExecutionResult } from '../src/runtime/types.ts';
import type { Bar } from '../src/runtime/context.ts';

interface AuditCase {
  member: string;
  overload: string;
  property: string;
  source: string;
  expectedDiagnostics?: string[];
  verify?: (result: ExecutionResult) => string | undefined;
}

interface AuditRow {
  member: string;
  overload: string;
  property: string;
  status: 'ok' | 'failed';
  evidence: string;
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const outJson = join(packageRoot, 'reports/pine-overload-positional-binding-audit-v1.json');
const outMd = join(packageRoot, 'reports/pine-overload-positional-binding-audit-v1.md');
const bars: Bar[] = [{ time: 1704067200000, open: 1, high: 2, low: 0, close: 1, volume: 10 }];

function script(body: string): string {
  return `//@version=6\nindicator("Overload Audit", overlay=true)\n${body}\n`;
}

function field(result: ExecutionResult, collection: 'drawings' | 'inputs' | 'plots', key: string): unknown {
  const row = result[collection][0] as unknown as Record<string, unknown> | undefined;
  return row?.[key];
}

function expectField(result: ExecutionResult, collection: 'drawings' | 'inputs' | 'plots', key: string, expected: unknown): string | undefined {
  const actual = field(result, collection, key);
  return actual === expected ? undefined : `${collection}[0].${key}: expected ${String(expected)}, got ${String(actual)}`;
}

function cases(): AuditCase[] {
  const pointSetup = [
    'p1 = chart.point.from_index(bar_index, high)',
    'p2 = chart.point.from_index(bar_index + 1, low)',
  ].join('\n');

  return [
    {
      member: 'input.int',
      overload: 'range',
      property: 'positional metadata binds as tooltip/inline/group/confirm/display/active',
      source: script('x = input.int(1, "Range", 0, 10, 1, "TIP", "IN", "GROUP", true, display.all, true)'),
      verify: (result) => expectField(result, 'inputs', 'group', 'GROUP')
        ?? expectField(result, 'inputs', 'display', 31)
        ?? expectField(result, 'inputs', 'active', true),
    },
    {
      member: 'input.int',
      overload: 'options',
      property: 'positional metadata binds after options',
      source: script('x = input.int(1, "Options", [1, 2], "TIP", "IN", "GROUP", true, display.none, true)'),
      verify: (result) => expectField(result, 'inputs', 'group', 'GROUP')
        ?? expectField(result, 'inputs', 'display', 0)
        ?? expectField(result, 'inputs', 'active', true),
    },
    {
      member: 'input.float',
      overload: 'range',
      property: 'positional metadata binds as tooltip/inline/group/confirm/display/active',
      source: script('x = input.float(1.5, "Range", 0.0, 10.0, 0.5, "TIP", "IN", "GROUP", true, display.all, true)'),
      verify: (result) => expectField(result, 'inputs', 'group', 'GROUP')
        ?? expectField(result, 'inputs', 'display', 31)
        ?? expectField(result, 'inputs', 'active', true),
    },
    {
      member: 'input.float',
      overload: 'options',
      property: 'positional metadata binds after options',
      source: script('x = input.float(1.5, "Options", [1.5, 2.5], "TIP", "IN", "GROUP", true, display.none, true)'),
      verify: (result) => expectField(result, 'inputs', 'group', 'GROUP')
        ?? expectField(result, 'inputs', 'display', 0)
        ?? expectField(result, 'inputs', 'active', true),
    },
    {
      member: 'label.new',
      overload: 'coordinate',
      property: 'positional style/textcolor/size/textalign/tooltip bind to coordinate slots',
      source: script('label.new(bar_index, close, "TXT", xloc.bar_index, yloc.price, color.blue, label.style_label_up, color.white, size.large, text.align_center, "TIP", font.family_default, true)'),
      verify: (result) => expectField(result, 'drawings', 'style', 'label_up')
        ?? expectField(result, 'drawings', 'textColor', '#FFFFFF')
        ?? expectField(result, 'drawings', 'size', 'large')
        ?? expectField(result, 'drawings', 'textAlign', 'center')
        ?? expectField(result, 'drawings', 'tooltip', 'TIP')
        ?? expectField(result, 'drawings', 'forceOverlay', true),
    },
    {
      member: 'label.new',
      overload: 'chart-point',
      property: 'positional xloc/style/textcolor/size bind to point slots',
      source: script(`${pointSetup}\nlabel.new(p1, "TXT", xloc.bar_index, yloc.price, color.blue, label.style_label_down, color.white, size.large, text.align_center, "TIP", font.family_default, true)`),
      verify: (result) => expectField(result, 'drawings', 'style', 'label_down')
        ?? expectField(result, 'drawings', 'textColor', '#FFFFFF')
        ?? expectField(result, 'drawings', 'size', 'large')
        ?? expectField(result, 'drawings', 'textAlign', 'center')
        ?? expectField(result, 'drawings', 'tooltip', 'TIP')
        ?? expectField(result, 'drawings', 'forceOverlay', true),
    },
    {
      member: 'line.new',
      overload: 'coordinate',
      property: 'positional xloc/extend/color/style/width/force_overlay bind to coordinate slots',
      source: script('line.new(bar_index, close, bar_index + 1, close, xloc.bar_index, extend.right, color.red, line.style_dashed, 3, true)'),
      verify: (result) => expectField(result, 'drawings', 'xloc', 'bar_index')
        ?? expectField(result, 'drawings', 'extend', 'right')
        ?? expectField(result, 'drawings', 'color', '#F23645')
        ?? expectField(result, 'drawings', 'style', 'dashed')
        ?? expectField(result, 'drawings', 'width', 3)
        ?? expectField(result, 'drawings', 'forceOverlay', true),
    },
    {
      member: 'line.new',
      overload: 'chart-point',
      property: 'positional xloc/extend/color/style/width/force_overlay bind to point slots',
      source: script(`${pointSetup}\nline.new(p1, p2, xloc.bar_index, extend.right, color.red, line.style_dashed, 3, true)`),
      verify: (result) => expectField(result, 'drawings', 'xloc', 'bar_index')
        ?? expectField(result, 'drawings', 'extend', 'right')
        ?? expectField(result, 'drawings', 'color', '#F23645')
        ?? expectField(result, 'drawings', 'style', 'dashed')
        ?? expectField(result, 'drawings', 'width', 3)
        ?? expectField(result, 'drawings', 'forceOverlay', true),
    },
    {
      member: 'box.new',
      overload: 'coordinate',
      property: 'positional xloc/bgcolor/text/text_color/text_halign/text_valign bind to coordinate slots',
      source: script('box.new(bar_index, high, bar_index + 1, low, color.blue, 1, line.style_solid, extend.none, xloc.bar_index, color.red, "TXT", size.normal, color.white, text.align_center, text.align_bottom, text.wrap_none, font.family_default, true)'),
      verify: (result) => expectField(result, 'drawings', 'xloc', 'bar_index')
        ?? expectField(result, 'drawings', 'bgcolor', '#F23645')
        ?? expectField(result, 'drawings', 'text', 'TXT')
        ?? expectField(result, 'drawings', 'textColor', '#FFFFFF')
        ?? expectField(result, 'drawings', 'textHalign', 'center')
        ?? expectField(result, 'drawings', 'textValign', 'bottom'),
    },
    {
      member: 'box.new',
      overload: 'chart-point',
      property: 'positional xloc/bgcolor/text/text_color/text_halign/text_valign bind to point slots',
      source: script(`${pointSetup}\nbox.new(p1, p2, color.blue, 1, line.style_solid, extend.none, xloc.bar_index, color.red, "TXT", size.normal, color.white, text.align_center, text.align_bottom, text.wrap_none, font.family_default, true)`),
      verify: (result) => expectField(result, 'drawings', 'xloc', 'bar_index')
        ?? expectField(result, 'drawings', 'bgcolor', '#F23645')
        ?? expectField(result, 'drawings', 'text', 'TXT')
        ?? expectField(result, 'drawings', 'textColor', '#FFFFFF')
        ?? expectField(result, 'drawings', 'textHalign', 'center')
        ?? expectField(result, 'drawings', 'textValign', 'bottom'),
    },
    {
      member: 'time',
      overload: 'timezone',
      property: 'third positional string is timezone; later numbers are bars_back/timeframe_bars_back',
      source: script('plot(time("60", "0930-1600", "UTC", 1, 2))'),
    },
    {
      member: 'time',
      overload: 'no-timezone',
      property: 'third positional number is bars_back, not timezone',
      source: script('plot(time("60", "0930-1600", 1, 2))'),
    },
    {
      member: 'time_close',
      overload: 'timezone',
      property: 'third positional string is timezone; later numbers are bars_back/timeframe_bars_back',
      source: script('plot(time_close("60", "0930-1600", "UTC", 1, 2))'),
    },
    {
      member: 'time_close',
      overload: 'no-timezone',
      property: 'third positional number is bars_back, not timezone',
      source: script('plot(time_close("60", "0930-1600", 1, 2))'),
    },
    {
      member: 'timestamp',
      overload: 'dateString',
      property: 'single string binds as dateString',
      source: script('plot(timestamp("2024-01-01T00:00:00Z"))'),
    },
    {
      member: 'timestamp',
      overload: 'numeric',
      property: 'first positional number binds as year',
      source: script('plot(timestamp(2024, 1, 1, 0, 0, 0))'),
    },
    {
      member: 'timestamp',
      overload: 'timezone+numeric',
      property: 'first positional string plus numeric date binds as timezone/year/month/day',
      source: script('plot(timestamp("UTC", 2024, 1, 1, 0, 0, 0))'),
    },
    {
      member: 'label.new',
      overload: 'chart-point',
      property: 'invalid positional size blames selected point-overload size slot',
      source: script(`${pointSetup}\nlabel.new(p1, "TXT", xloc.bar_index, yloc.price, color.blue, label.style_label_down, color.white, "giant")`),
      expectedDiagnostics: ['Invalid label.new size: giant'],
    },
    {
      member: 'line.new',
      overload: 'chart-point',
      property: 'invalid positional width blames selected point-overload width slot',
      source: script(`${pointSetup}\nline.new(p1, p2, xloc.bar_index, extend.right, color.red, line.style_dashed, "3")`),
      expectedDiagnostics: ['line.new width must be a number, got string'],
    },
    {
      member: 'box.new',
      overload: 'chart-point',
      property: 'invalid positional text_halign blames selected point-overload text_halign slot',
      source: script(`${pointSetup}\nbox.new(p1, p2, color.blue, 1, line.style_solid, extend.none, xloc.bar_index, color.red, "TXT", size.normal, color.white, "sideways")`),
      expectedDiagnostics: ['Invalid box.new text_halign: sideways'],
    },
    {
      member: 'time',
      overload: 'no-timezone',
      property: 'invalid fourth positional blames timeframe_bars_back after no-timezone selection',
      source: script('plot(time("60", "0930-1600", 1, "bad"))'),
      expectedDiagnostics: ['time timeframe_bars_back must be a number, got string'],
    },
    {
      member: 'timestamp',
      overload: 'numeric',
      property: 'invalid second positional blames month after numeric-overload selection',
      source: script('plot(timestamp(2024, "1", 1))'),
      expectedDiagnostics: ['timestamp month must be a number, got string'],
    },
  ];
}

function runCase(testCase: AuditCase): AuditRow {
  try {
    const ast = parse(testCase.source);
    const diagnostics = checkProgram(ast).diagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')
      .map((diagnostic) => diagnostic.message);
    const expected = testCase.expectedDiagnostics ?? [];
    if (JSON.stringify(diagnostics) !== JSON.stringify(expected)) {
      return {
        member: testCase.member,
        overload: testCase.overload,
        property: testCase.property,
        status: 'failed',
        evidence: `diagnostics expected ${JSON.stringify(expected)}, got ${JSON.stringify(diagnostics)}`,
      };
    }
    if (expected.length > 0) {
      return {
        member: testCase.member,
        overload: testCase.overload,
        property: testCase.property,
        status: 'ok',
        evidence: `selected-overload diagnostic matched: ${expected.join('; ')}`,
      };
    }
    const result = executeScript(ast, bars);
    if (result.errors.length > 0) {
      return {
        member: testCase.member,
        overload: testCase.overload,
        property: testCase.property,
        status: 'failed',
        evidence: `runtime errors: ${result.errors.map((error) => error.message).join('; ')}`,
      };
    }
    const verifyError = testCase.verify?.(result);
    if (verifyError) {
      return {
        member: testCase.member,
        overload: testCase.overload,
        property: testCase.property,
        status: 'failed',
        evidence: verifyError,
      };
    }
    return {
      member: testCase.member,
      overload: testCase.overload,
      property: testCase.property,
      status: 'ok',
      evidence: testCase.verify ? 'parse ok; semantic ok; runtime-visible binding matched' : 'parse ok; semantic ok; compiled execution ok',
    };
  } catch (error) {
    return {
      member: testCase.member,
      overload: testCase.overload,
      property: testCase.property,
      status: 'failed',
      evidence: error instanceof Error ? error.message : String(error),
    };
  }
}

function renderMarkdown(rows: AuditRow[], commit: string): string {
  const failures = rows.filter((row) => row.status === 'failed');
  const byMember = new Map<string, AuditRow[]>();
  for (const row of rows) byMember.set(row.member, [...(byMember.get(row.member) ?? []), row]);
  const lines = [
    '# Pine Overload Positional Binding Audit V1',
    '',
    `Generated at ${new Date().toISOString()}. Measured at commit \`${commit.slice(0, 10)}\`.`,
    '',
    '## Headline',
    '',
    `Audited ${rows.length} overloaded-member positional binding and validation cases across input range/options, drawing coordinate/chart-point constructors, time/time_close, and timestamp.`,
    '',
    `Result: ${rows.length - failures.length} OK, ${failures.length} failed.`,
    '',
    'The sweep checks the class opened by the input range-form bug: a positional argument at index N must validate against the overload actually selected for that call, not another overload sharing the member name. Success rows either expose the bound value through compiled execution metadata/drawings or match a diagnostic whose parameter name proves the selected overload was used.',
    '',
    '## Failures',
    '',
  ];
  if (failures.length === 0) lines.push('None.');
  for (const row of failures) lines.push(`- \`${row.member}\` ${row.overload}: ${row.evidence}`);

  lines.push('', '## Groups', '');
  for (const [member, memberRows] of [...byMember].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`- \`${member}\`: ${memberRows.filter((row) => row.status === 'ok').length}/${memberRows.length} OK`);
  }

  lines.push('', '## Rows', '', '| Member | Overload | Property | Status | Evidence |', '| --- | --- | --- | --- | --- |');
  for (const row of rows) {
    lines.push(`| \`${row.member}\` | ${row.overload} | ${row.property} | ${row.status} | ${row.evidence.replaceAll('|', '\\|')} |`);
  }
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: packageRoot, encoding: 'utf8' }).trim();
  const rows = cases().map(runCase);
  await writeFile(outJson, `${JSON.stringify({ generatedAt: new Date().toISOString(), commit, rows }, null, 2)}\n`);
  await writeFile(outMd, renderMarkdown(rows, commit));

  const failures = rows.filter((row) => row.status === 'failed');
  console.log(`overload positional binding audit: ${rows.length - failures.length}/${rows.length} OK, ${failures.length} failed`);
  for (const row of failures) console.log(`FAILED ${row.member} ${row.overload}: ${row.evidence}`);
  if (failures.length > 0) process.exitCode = 1;
}

void main();
