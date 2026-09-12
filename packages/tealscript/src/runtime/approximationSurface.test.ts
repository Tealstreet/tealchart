import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

const PINE_APPROXIMATION_AUDIT_ROOTS = [
  'packages/tealscript/src/runtime',
  'packages/tealchart/src/TealchartRenderer.ts',
  'packages/tealchart/src/rendering',
  'packages/tealchart/src/mobile/MobileIndicatorManager.ts',
  'packages/tealchart/src/mobile/render',
  'packages/tealchart/src/tealscript',
] as const;

const SEEDED_PINE_APPROXIMATION_FILE_PATTERNS: readonly RegExp[] = [
  /packages\/tealscript\/src\/runtime\/(?:arrays|maps|matrices)\.ts$/,
  /packages\/tealscript\/src\/runtime\/builtins\/drawings\.ts$/,
  /packages\/tealscript\/src\/runtime\/context\.ts$/,
  /packages\/tealscript\/src\/runtime\/codegen\/(?:execute|fallbackInventory|runtime|ta-classes)\.ts$/,
  /packages\/tealchart\/src\/TealchartRenderer\.ts$/,
  /packages\/tealchart\/src\/mobile\/MobileIndicatorManager\.ts$/,
  /packages\/tealchart\/src\/mobile\/render\/NativeIndicatorPlotLayer\.tsx$/,
  /packages\/tealchart\/src\/rendering\/(?:TealScriptDrawingCoordinates|TealScriptDrawingRenderer|indicatorOutputAxisLabels|pineVisualNormalizationRegister)\.ts$/,
];

const PINE_APPROXIMATION_SCOPE_EXCLUSIONS = [
  {
    file: 'packages/tealchart/src/mobile/render/NativeIndicatorOutputAxisLabelLayer.tsx',
    reason: 'renders precomputed indicator axis-label models; clamps here are native label layout, while Pine plot precision/color semantics are audited in indicatorOutputAxisLabels.ts.',
  },
  {
    file: 'packages/tealchart/src/mobile/render/NativeIndicatorPaneAxisLayer.tsx',
    reason: 'native pane-axis tick/label layout only; it does not interpret Pine plot, drawing, or runtime values.',
  },
  {
    file: 'packages/tealchart/src/mobile/render/NativePriceLineLayer.tsx',
    reason: 'main-chart price-line UI rendering; not a TealScript/Pine output renderer.',
  },
  {
    file: 'packages/tealchart/src/mobile/render/NativeTradeLineLayer.tsx',
    reason: 'trading order-line UI rendering; not a TealScript/Pine output renderer.',
  },
  {
    file: 'packages/tealchart/src/tealscript/TealscriptManager.ts',
    reason: 'worker/telemetry orchestration; fallback classification here reports backend state and does not normalize Pine values.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/analyzer.ts',
    reason: 'compile-time dependency/source analysis; Pine runtime normalizations emitted from it are audited at execute/runtime helper boundaries.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/emitter.ts',
    reason: 'JavaScript code emitter; generated runtime behavior is audited in execute.ts/runtime.ts instead of string-construction branches.',
  },
  {
    file: 'packages/tealscript/src/runtime/types.ts',
    reason: 'shared TypeScript type declarations only; contains no executable Pine normalization or swallow boundary.',
  },
] as const;

interface SuspiciousSite {
  file: string;
  line: number;
  source: string;
  rule: string;
}

interface AccountedSite {
  file: string;
  source: string | RegExp;
  category:
    | 'documented-pine-normalization'
    | 'explicit-runtime-approximation'
    | 'fallback-inventory'
    | 'known-pine-runtime-error-boundary'
    | 'loud-runtime-refusal'
    | 'ordinary-chart-geometry'
    | 'trace-undetermined-visual-normalization'
    | 'visible-profiled-approximation';
  reason: string;
}

const ACCOUNTED_SITES: readonly AccountedSite[] = [
  {
    file: 'packages/tealscript/src/runtime/arrays.ts',
    source: 'const safeSize = Math.trunc(Number(size));',
    category: 'loud-runtime-refusal',
    reason: 'array.new size coercion is immediately validated and throws on invalid Pine array sizes.',
  },
  {
    file: 'packages/tealscript/src/runtime/arrays.ts',
    source: 'let normalizedIndex = Math.trunc(index);',
    category: 'loud-runtime-refusal',
    reason: 'array index normalization is followed by Pine-style bounds errors.',
  },
  {
    file: 'packages/tealscript/src/runtime/arrays.ts',
    source: 'throw new Error(`Array index ${Math.trunc(index)} is out of bounds. Array size is ${size}`);',
    category: 'known-pine-runtime-error-boundary',
    reason: 'Pine-facing array bounds errors are classified by isKnownPineRuntimeError().',
  },
  {
    file: 'packages/tealscript/src/runtime/arrays.ts',
    source: 'const normalizedFrom = Math.trunc(from);',
    category: 'loud-runtime-refusal',
    reason: 'array.slice range endpoints are validated, including from > to.',
  },
  {
    file: 'packages/tealscript/src/runtime/arrays.ts',
    source: 'const normalizedTo = Math.trunc(to);',
    category: 'loud-runtime-refusal',
    reason: 'array.slice range endpoints are validated, including from > to.',
  },
  {
    file: 'packages/tealscript/src/runtime/arrays.ts',
    source: 'const normalizedIndex = Math.trunc(Number(fieldIndex));',
    category: 'loud-runtime-refusal',
    reason: 'array.sort_field validates field indexes and throws on invalid input.',
  },
  {
    file: 'packages/tealscript/src/runtime/arrays.ts',
    source: 'const clampedPercentage = Math.min(100, Math.max(0, percentage));',
    category: 'visible-profiled-approximation',
    reason: 'percentile percentage clamping records array.*.percentage-clamp runtimeApproximations.',
  },
  {
    file: 'packages/tealscript/src/runtime/arrays.ts',
    source: /percentage-clamp|clampedPercentage/,
    category: 'visible-profiled-approximation',
    reason: 'percentile percentage clamping records array.*.percentage-clamp runtimeApproximations.',
  },
  {
    file: 'packages/tealscript/src/runtime/arrays.ts',
    source: /const rank = .*clampedPercentage/,
    category: 'visible-profiled-approximation',
    reason: 'percentile rank calculation uses the already-inventoried clamped percentage.',
  },
  {
    file: 'packages/tealscript/src/runtime/arrays.ts',
    source: 'const normalizedIndex = Math.trunc(numericIndex);',
    category: 'loud-runtime-refusal',
    reason: 'array.percent_rank index coercion is bounded before reading.',
  },
  {
    file: 'packages/tealscript/src/runtime/context.ts',
    source: 'alert.values.length = Math.min(alert.values.length, latestEvent.barIndex + 1);',
    category: 'ordinary-chart-geometry',
    reason: 'direct-alert rollback truncates internal realtime state, not a Pine value approximation.',
  },
  {
    file: 'packages/tealscript/src/runtime/context.ts',
    source: 'return brightness < 128 ? DARK_BACKGROUND_CHART_FG_COLOR : LIGHT_BACKGROUND_CHART_FG_COLOR;',
    category: 'documented-pine-normalization',
    reason: 'TradingView documents chart.fg_color as #0f0f0f on light backgrounds and #dbdbdb on dark backgrounds.',
  },
  {
    file: 'packages/tealscript/src/runtime/context.ts',
    source: 'fgColor: hasExplicitForeground ? override.fgColor! : chartForegroundForBackground(bgColor),',
    category: 'documented-pine-normalization',
    reason: 'Host-supplied chart.fgColor wins; otherwise the runtime derives the documented contrast foreground from the selected chart background.',
  },
  {
    file: 'packages/tealscript/src/runtime/maps.ts',
    source: /normalizeMapKey/,
    category: 'documented-pine-normalization',
    reason: 'map helpers normalize JavaScript carrier values into Pine scalar map-key identities before lookup/storage.',
  },
  {
    file: 'packages/tealscript/src/runtime/maps.ts',
    source: 'if (!map.entries.has(normalizeMapKey(key)) && map.entries.size >= 50_000) {',
    category: 'known-pine-runtime-error-boundary',
    reason: 'map size-limit errors are Pine-facing runtime errors classified by isKnownPineRuntimeError().',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: 'function positiveInteger(runtime: DrawingBuiltinRuntime, value: unknown, fallback: number, site?: string): number {',
    category: 'visible-profiled-approximation',
    reason: 'table.new column/row positive integer invalid-input fallback is exposed through runtimeApproximations.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: 'const parsed = Math.trunc(runtime.toNumber(value ?? fallback));',
    category: 'visible-profiled-approximation',
    reason: 'table.new column/row positive integer invalid-input fallback is exposed through runtimeApproximations.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: 'return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;',
    category: 'visible-profiled-approximation',
    reason: 'table.new column/row positive integer invalid-input fallback is exposed through runtimeApproximations.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: /positiveInteger\(runtime, orderedCallArg\(args, namedArgs, tableNewArgs, [12]\), 1, 'table\.new\.(?:columns|rows)-fallback'\)/,
    category: 'visible-profiled-approximation',
    reason: 'table.new column/row positive integer fallback call sites are exposed through runtimeApproximations.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: 'function tableBorderWidth(runtime: DrawingBuiltinRuntime, value: unknown): number {',
    category: 'trace-undetermined-visual-normalization',
    reason: 'table border width invalid-input normalization is existing Pine-facing visual normalization kept explicit in this guard.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: 'const parsed = Math.trunc(runtime.toNumber(value));',
    category: 'trace-undetermined-visual-normalization',
    reason: 'table border width invalid-input normalization is existing Pine-facing visual normalization kept explicit in this guard.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: 'return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;',
    category: 'trace-undetermined-visual-normalization',
    reason: 'table border width invalid-input normalization is existing Pine-facing visual normalization kept explicit in this guard.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: /tableBorderWidth\(runtime, (?:orderedCallArg\(args, namedArgs, tableNewArgs, [57]\)|callArg\(args, namedArgs, 1, '(?:frame|border)_width')/,
    category: 'trace-undetermined-visual-normalization',
    reason: 'table frame/border width call sites use the inventoried table border width normalization.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: /normalizeTable(?:Column|Row)/,
    category: 'loud-runtime-refusal',
    reason: 'table cell coordinate truncation is followed by Pine-style bounds errors, including negative coordinates.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: 'return Math.trunc(runtime.toNumber(value));',
    category: 'loud-runtime-refusal',
    reason: 'table cell coordinate truncation is followed by Pine-style bounds errors, including negative coordinates.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: 'startColumn: Math.min(start.column, end.column),',
    category: 'trace-undetermined-visual-normalization',
    reason: 'merged-cell endpoint reordering is existing table visual normalization kept explicit in this guard.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: 'startRow: Math.min(start.row, end.row),',
    category: 'trace-undetermined-visual-normalization',
    reason: 'merged-cell endpoint reordering is existing table visual normalization kept explicit in this guard.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: 'endColumn: Math.max(start.column, end.column),',
    category: 'trace-undetermined-visual-normalization',
    reason: 'merged-cell endpoint reordering is existing table visual normalization kept explicit in this guard.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: 'endRow: Math.max(start.row, end.row),',
    category: 'trace-undetermined-visual-normalization',
    reason: 'merged-cell endpoint reordering is existing table visual normalization kept explicit in this guard.',
  },
  {
    file: 'packages/tealscript/src/runtime/builtins/drawings.ts',
    source: /index: typeof index === 'number' && Number\.isFinite\(index\) \? Math\.trunc\(index\) : null,/,
    category: 'documented-pine-normalization',
    reason: 'chart.point index coordinates are integer bar_index positions.',
  },
  {
    file: 'packages/tealscript/src/runtime/matrices.ts',
    source: 'const normalizedPower = Math.trunc(Number(power));',
    category: 'loud-runtime-refusal',
    reason: 'matrix.pow rejects non-integer or negative powers after normalization.',
  },
  {
    file: 'packages/tealscript/src/runtime/matrices.ts',
    source: '} catch (error) {',
    category: 'visible-profiled-approximation',
    reason: 'complex eigen placeholders report matrix.eigenvalues.complex-roots through runtimeApproximations.',
  },
  {
    file: 'packages/tealscript/src/runtime/matrices.ts',
    source: 'const normalizedIndex = Math.trunc(Number(fieldIndex));',
    category: 'loud-runtime-refusal',
    reason: 'matrix.sort_field validates field indexes and throws on invalid input.',
  },
  {
    file: 'packages/tealscript/src/runtime/matrices.ts',
    source: 'const normalizedFrom = Math.trunc(Number(from));',
    category: 'loud-runtime-refusal',
    reason: 'matrix subrange endpoints are validated and throw on invalid input.',
  },
  {
    file: 'packages/tealscript/src/runtime/matrices.ts',
    source: 'const normalizedTo = Math.trunc(Number(to));',
    category: 'loud-runtime-refusal',
    reason: 'matrix subrange endpoints are validated and throw on invalid input.',
  },
  {
    file: 'packages/tealscript/src/runtime/matrices.ts',
    source: 'const normalized = Math.trunc(Number(index));',
    category: 'loud-runtime-refusal',
    reason: 'matrix index normalization is followed by Pine-style bounds errors.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: '} catch (error) {',
    category: 'known-pine-runtime-error-boundary',
    reason: 'compiled global/bar catches rethrow known Pine runtime errors and record generated-code swallows.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: /recordSwallowedRuntimeError/,
    category: 'known-pine-runtime-error-boundary',
    reason: 'generated-code swallows are machine-visible in RuntimeProfile.swallowedErrors.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: /runtimeApproximations/,
    category: 'explicit-runtime-approximation',
    reason: 'runtime approximation accumulator is the machine-visible reporting channel.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: /const alpha = Math\.round\(.*transparency.*\);/,
    category: 'visible-profiled-approximation',
    reason: 'color transparency clamps are exposed through color.* runtimeApproximations when inputs are out of range.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: /'color\.(?:new|rgb)\.[^']+-clamp'/,
    category: 'explicit-runtime-approximation',
    reason: 'color invalid-input clamps are exposed through runtimeApproximations.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: 'const column = Math.trunc(toRuntimeNumber(orderedRuntimeArg(args, named, names, 2, 0)));',
    category: 'loud-runtime-refusal',
    reason: 'table cell coordinates are passed to drawing helpers that throw classified Pine runtime errors.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: 'const offset = Math.trunc(toRuntimeNumber(plotArg(value, named, extraArgs, args, \'offset\', 0)));',
    category: 'documented-pine-normalization',
    reason: 'plot offset is an integer bar offset in Pine output placement.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: 'const normalizedOffset = Math.trunc(toRuntimeNumber(offset));',
    category: 'documented-pine-normalization',
    reason: 'time/session offset is an integer offset before bucket math.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: 'if (Number.isFinite(offset)) return timeframeMs === null ? offset : Math.max(offset, timeframeMs);',
    category: 'documented-pine-normalization',
    reason: 'timeframe offset is bounded to one timeframe unit for generated time helpers.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: 'const index = Number.isFinite(numericOffset) ? Math.trunc(numericOffset) : Number.NaN;',
    category: 'documented-pine-normalization',
    reason: 'strategy.* history offsets truncate toward zero, and non-finite offsets return Pine na rather than falling back to the current bar.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: 'const ticksPerRow = Math.trunc(toRuntimeNumber(orderedRuntimeArg(args, named, names, 0)));',
    category: 'loud-runtime-refusal',
    reason: 'volume profile ticks_per_row is validated before profile construction.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: 'const column = Math.trunc(Number(columnRaw ?? 0));',
    category: 'loud-runtime-refusal',
    reason: 'table merge coordinates flow to drawing helpers that throw classified Pine runtime errors.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: 'const ratio = range === 0 ? 0 : Math.min(1, Math.max(0, (value - bottomValue) / range));',
    category: 'documented-pine-normalization',
    reason: 'color.from_gradient endpoint clamping is documented by TradingView.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/execute.ts',
    source: 'return [h, Math.min(parsed.red, parsed.green, parsed.blue) / 255 * 100, (1 - Math.max(parsed.red, parsed.green, parsed.blue) / 255) * 100, transparency];',
    category: 'ordinary-chart-geometry',
    reason: 'RGB-to-HSV conversion math computes color properties; it does not normalize invalid Pine input.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/fallbackInventory.ts',
    source: /COMPILED_FALLBACK_INVENTORY/,
    category: 'fallback-inventory',
    reason: 'fallbackInventory is the explicit register for compiled unsupported/fallback paths.',
  },
  {
    file: 'packages/tealscript/src/runtime/codegen/ta-classes.ts',
    source: 'if (!Number.isFinite(length) || Math.trunc(length) !== length || length < 1) {',
    category: 'loud-runtime-refusal',
    reason: 'stateful TA lookback lengths reject non-finite, fractional, zero, and negative values.',
  },
  {
    file: 'packages/tealchart/src/TealchartRenderer.ts',
    source:
      /^(?:const fallbackColor = this\.getPlotBaseColor\(plot\.color, '#2196F3'\);|const color = this\.getVisiblePlotColorAt\(plot\.color, latest\.index, fallbackColor\);|const fallbackColor = Array\.isArray\(plot\.color\) \? plot\.color\.find\(Boolean\) \|\| '#2196F3' : plot\.color \|\| '#2196F3';|const bodyColor = this\.getPerBarColor\(plot\.color, i, fallbackColor\);|const fallbackColor = this\.getPlotBaseColor\(color, 'rgba\(33, 150, 243, 0\.2\)'\);|const barColor = this\.getVisiblePlotColorAt\(color, i, fallbackColor\);)$/,
    category: 'documented-pine-normalization',
    reason: 'web renderer color fallbacks are limited to static/default colors; per-bar color=na hiding is separately tested.',
  },
  {
    file: 'packages/tealchart/src/TealchartRenderer.ts',
    source: 'return color || fallback;',
    category: 'documented-pine-normalization',
    reason: 'static plot color fallback is the renderer default color path.',
  },
  {
    file: 'packages/tealchart/src/TealchartRenderer.ts',
    source: 'return index >= Math.max(0, bars.length - plot.showLast);',
    category: 'documented-pine-normalization',
    reason: 'plot.show_last hides earlier bars by Pine output display semantics.',
  },
  {
    file: 'packages/tealchart/src/TealchartRenderer.ts',
    source: /plot\.showLast/,
    category: 'documented-pine-normalization',
    reason: 'plot.show_last hides earlier bars by Pine output display semantics.',
  },
  {
    file: 'packages/tealchart/src/TealchartRenderer.ts',
    source: 'const minHeight = Number.isFinite(plot.minHeight) ? Math.max(1, plot.minHeight!) : fallbackSize;',
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.plotarrow-height-floor.',
  },
  {
    file: 'packages/tealchart/src/TealchartRenderer.ts',
    source: 'const maxHeight = Number.isFinite(plot.maxHeight)',
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.plotarrow-height-reorder.',
  },
  {
    file: 'packages/tealchart/src/TealchartRenderer.ts',
    source: '? Math.max(minHeight, plot.maxHeight!)',
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.plotarrow-height-reorder.',
  },
  {
    file: 'packages/tealchart/src/TealchartRenderer.ts',
    source: ': Math.max(minHeight, fallbackSize);',
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.plotarrow-height-reorder.',
  },
  {
    file: 'packages/tealchart/src/mobile/MobileIndicatorManager.ts',
    source: '} catch (err) {',
    category: 'ordinary-chart-geometry',
    reason: 'mobile manager catches host/worker errors and stores visible indicator error state.',
  },
  {
    file: 'packages/tealchart/src/mobile/MobileIndicatorManager.ts',
    source: 'void this._tealscriptManager.addScript(instanceId, code, inputs).catch((error: unknown) => {',
    category: 'ordinary-chart-geometry',
    reason: 'async script-add failure is surfaced through mobile indicator status.',
  },
  {
    file: 'packages/tealchart/src/mobile/MobileIndicatorManager.ts',
    source: 'return Math.max(0, seriesLength - plot.showLast);',
    category: 'documented-pine-normalization',
    reason: 'plot.show_last hides earlier bars by Pine output display semantics.',
  },
  {
    file: 'packages/tealchart/src/mobile/MobileIndicatorManager.ts',
    source: /plot\.showLast/,
    category: 'documented-pine-normalization',
    reason: 'plot.show_last hides earlier bars by Pine output display semantics.',
  },
  {
    file: 'packages/tealchart/src/mobile/render/NativeIndicatorPlotLayer.tsx',
    source:
      /^(?:function getNativeIndicatorColorAt\(color: PlotOutput\['color'\], index: number, fallback = '#2196F3'\): string \| null \{|fallback: string,|return color \|\| fallback;|function getNativeIndicatorColorSet\(color: string \| \(string \| null\)\[\] \| undefined, fallback: string\): string\[\] \{|return colors\.size > 0 \? Array\.from\(colors\) : \[fallback\];|return \[color \|\| fallback\];|fallbackColors: readonly string\[\],|if \(!Array\.isArray\(color\)\) return \[color \|\| fallbackColors\[0\] \|\| '#2196F3'\];|const colors = new Set<string>\(fallbackColors\);|const fallbackColor = getNativeIndicatorColor\(plot\.color\);|const bodyColor = getNativeIndicatorOptionalColorAt\(plot\.color, bar\.sourceIndex, fallbackColor\);|fallbackColor,|fallbackColor: string;|color: getNativeIndicatorColorAt\(plot\.color, bar\.sourceIndex, fallbackColor\),|const fallback = Array\.isArray\(plot\.textColor\)|if \(Array\.isArray\(plot\.textColor\)\) return plot\.textColor\[sourceIndex\] \|\| fallback;|return fallback;|const colors = useMemo\(\(\) => getNativeIndicatorColorSet\(plot\.color, fallbackColor\), \[fallbackColor, plot\.color\]\);|\(\) => getNativeIndicatorMarkerPoints\(\{ fallbackColor, plot, totalBarCount, visibleBars \}\),|\[fallbackColor, plot, totalBarCount, visibleBars\],|textColor=\{point\.color \?\? fallbackColor\}|const bodyColors = useMemo\(\(\) => getNativeIndicatorColorSet\(plot\.color, fallbackColor\), \[fallbackColor, plot\.color\]\);|\(\) => getNativeIndicatorColoredPlotPoints\(\{ fallbackColor, plot, totalBarCount, visibleBars \}\),)$/,
    category: 'documented-pine-normalization',
    reason: 'native renderer color fallbacks are limited to static/default colors; per-bar color=na hiding is separately tested.',
  },
  {
    file: 'packages/tealchart/src/mobile/render/NativeIndicatorPlotLayer.tsx',
    source: 'return sourceIndex >= Math.max(0, totalBarCount - plot.showLast);',
    category: 'documented-pine-normalization',
    reason: 'plot.show_last hides earlier bars by Pine output display semantics.',
  },
  {
    file: 'packages/tealchart/src/mobile/render/NativeIndicatorPlotLayer.tsx',
    source: /plot\.showLast/,
    category: 'documented-pine-normalization',
    reason: 'plot.show_last hides earlier bars by Pine output display semantics.',
  },
  {
    file: 'packages/tealchart/src/mobile/render/NativeIndicatorPlotLayer.tsx',
    source: 'const minHeight = Number.isFinite(plot.minHeight) ? Math.max(1, plot.minHeight!) : fallbackSize;',
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.plotarrow-height-floor.',
  },
  {
    file: 'packages/tealchart/src/mobile/render/NativeIndicatorPlotLayer.tsx',
    source: 'const maxHeight = Number.isFinite(plot.maxHeight)',
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.plotarrow-height-reorder.',
  },
  {
    file: 'packages/tealchart/src/mobile/render/NativeIndicatorPlotLayer.tsx',
    source: '? Math.max(minHeight, plot.maxHeight!)',
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.plotarrow-height-reorder.',
  },
  {
    file: 'packages/tealchart/src/mobile/render/NativeIndicatorPlotLayer.tsx',
    source: ': Math.max(minHeight, fallbackSize);',
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.plotarrow-height-reorder.',
  },
  {
    file: 'packages/tealchart/src/rendering/TealScriptDrawingCoordinates.ts',
    source: 'const barIndex = Number.isFinite(label.barIndex) ? Math.trunc(label.barIndex) : -1;',
    category: 'documented-pine-normalization',
    reason: 'drawing bar_index coordinates are integer bar positions.',
  },
  {
    file: 'packages/tealchart/src/rendering/TealScriptDrawingCoordinates.ts',
    source: 'const xIndex = Number.isFinite(xValue) ? Math.trunc(xValue) : barIndex;',
    category: 'documented-pine-normalization',
    reason: 'drawing xloc.bar_index coordinates are integer bar positions.',
  },
  {
    file: 'packages/tealchart/src/rendering/TealScriptDrawingCoordinates.ts',
    source: 'const clampedY = Math.max(pane.yMin, Math.min(pane.yMax, label.y));',
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.label-price-coordinate-clamp.',
  },
  {
    file: 'packages/tealchart/src/rendering/TealScriptDrawingCoordinates.ts',
    source: 'y = resolvers.valueToY(clampedY, pane);',
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.label-price-coordinate-clamp.',
  },
  {
    file: 'packages/tealchart/src/rendering/TealScriptDrawingRenderer.ts',
    source: 'bodyX = Math.min(maxX - bodyWidth, Math.max(minX, bodyX));',
    category: 'ordinary-chart-geometry',
    reason: 'label body clamped into canvas for readable layout; y price-coordinate clamp is separately registered.',
  },
  {
    file: 'packages/tealchart/src/rendering/TealScriptDrawingRenderer.ts',
    source: 'bodyY = Math.min(pane.bottom - height, Math.max(pane.top, bodyY));',
    category: 'ordinary-chart-geometry',
    reason: 'label body clamped into canvas for readable layout; y price-coordinate clamp is separately registered.',
  },
  {
    file: 'packages/tealchart/src/rendering/TealScriptDrawingRenderer.ts',
    source: '? Math.max(columnWidths[cell.column]!, explicitWidth)',
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.table-explicit-dimension-normalization.',
  },
  {
    file: 'packages/tealchart/src/rendering/TealScriptDrawingRenderer.ts',
    source: /explicitWidth|explicitHeight/,
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.table-explicit-dimension-normalization.',
  },
  {
    file: 'packages/tealchart/src/rendering/TealScriptDrawingRenderer.ts',
    source: '? Math.max(rowHeights[cell.row]!, explicitHeight)',
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.table-explicit-dimension-normalization.',
  },
  {
    file: 'packages/tealchart/src/rendering/TealScriptDrawingRenderer.ts',
    source: 'return Math.max(0, (value / 100) * Math.max(0, availableSize));',
    category: 'trace-undetermined-visual-normalization',
    reason: 'registered as tealchart.table-explicit-dimension-normalization.',
  },
  {
    file: 'packages/tealchart/src/rendering/indicatorOutputAxisLabels.ts',
    source: 'for (let index = Math.min(sourceIndex, color.length - 1); index >= 0; index -= 1) {',
    category: 'documented-pine-normalization',
    reason: 'axis labels reuse the last visible non-na color for display only.',
  },
  {
    file: 'packages/tealchart/src/rendering/indicatorOutputAxisLabels.ts',
    source: /^(?:export function getIndicatorPlotColor\(color: PlotOutput\['color'\], sourceIndex: number, fallback = '#2196F3'\): string \{|return fallback;|return color \|\| fallback;)$/,
    category: 'documented-pine-normalization',
    reason: 'axis label color fallback is display-only and does not mutate plotted output.',
  },
  {
    file: 'packages/tealchart/src/rendering/indicatorOutputAxisLabels.ts',
    source: /plot\.showLast/,
    category: 'documented-pine-normalization',
    reason: 'plot.show_last hides earlier bars by Pine output display semantics.',
  },
  {
    file: 'packages/tealchart/src/rendering/indicatorOutputAxisLabels.ts',
    source: 'const PINE_PLOT_PRECISION_MAX = 16;',
    category: 'documented-pine-normalization',
    reason: 'TradingView documents plot precision in the range 0..16.',
  },
  {
    file: 'packages/tealchart/src/rendering/indicatorOutputAxisLabels.ts',
    source: 'const firstAllowedIndex = plot.showLast !== undefined ? Math.max(0, totalBarCount - plot.showLast) : 0;',
    category: 'documented-pine-normalization',
    reason: 'plot.show_last hides earlier bars by Pine output display semantics.',
  },
  {
    file: 'packages/tealchart/src/rendering/indicatorOutputAxisLabels.ts',
    source: 'return Math.min(PINE_PLOT_PRECISION_MAX, Math.floor(precision));',
    category: 'documented-pine-normalization',
    reason: 'indicator precision is clamped to documented Pine plot precision range 0..16.',
  },
  {
    file: 'packages/tealchart/src/rendering/pineVisualNormalizationRegister.ts',
    source: /PINE_VISUAL_NORMALIZATION_REGISTER|clamp|fallback|default/,
    category: 'trace-undetermined-visual-normalization',
    reason: 'this file is the visual normalization register itself.',
  },
];

const SUSPICIOUS_RULES: readonly {
  name: string;
  file: RegExp;
  source: RegExp;
}[] = [
  {
    name: 'array index/range/domain normalization',
    file: /packages\/tealscript\/src\/runtime\/arrays\.ts$/,
    source: /Math\.trunc\((?:Number\()?[^)]*(?:size|index|from|to|fieldIndex)|percentage-clamp|clampedPercentage/,
  },
  {
    name: 'map key/size normalization',
    file: /packages\/tealscript\/src\/runtime\/maps\.ts$/,
    source: /normalizeMapKey|map\.entries\.size >= 50_000/,
  },
  {
    name: 'execution context chart/default normalization',
    file: /packages\/tealscript\/src\/runtime\/context\.ts$/,
    source: /Math\.min\(alert\.values\.length|brightness < 128|chartForegroundForBackground\(bgColor\)/,
  },
  {
    name: 'drawing builtin table/point normalization',
    file: /packages\/tealscript\/src\/runtime\/builtins\/drawings\.ts$/,
    source:
      /positiveInteger|tableBorderWidth|Math\.trunc\(runtime\.toNumber|normalizeTable(?:Column|Row)|Math\.(?:min|max)\(start\.(?:column|row), end\.(?:column|row)\)|Math\.trunc\(index\)/,
  },
  {
    name: 'matrix index/range/domain normalization',
    file: /packages\/tealscript\/src\/runtime\/matrices\.ts$/,
    source: /catch \(error\)|Math\.trunc\((?:Number\()?[^)]*(?:power|fieldIndex|from|to|index)/,
  },
  {
    name: 'compiled runtime error boundary',
    file: /packages\/tealscript\/src\/runtime\/codegen\/execute\.ts$/,
    source: /catch \(error\)|recordSwallowedRuntimeError|runtimeApproximations/,
  },
  {
    name: 'compiled color/request/table/TA normalization',
    file: /packages\/tealscript\/src\/runtime\/codegen\/execute\.ts$/,
    source:
      /Math\.(?:min|max|trunc|round)\([^;\n]*(?:transparency|bottomValue|column|ticksPerRow|offset|numericOffset)|color\.(?:new|rgb)\.[^']+-clamp/,
  },
  {
    name: 'compiled fallback inventory',
    file: /packages\/tealscript\/src\/runtime\/codegen\/fallbackInventory\.ts$/,
    source: /COMPILED_FALLBACK_INVENTORY/,
  },
  {
    name: 'runtime TA length refusal',
    file: /packages\/tealscript\/src\/runtime\/codegen\/(?:runtime|ta-classes)\.ts$/,
    source: /Math\.trunc\(Number\(length\)\)|Math\.trunc\(length\) !== length/,
  },
  {
    name: 'web plot color/display/height/precision normalization',
    file: /packages\/tealchart\/src\/TealchartRenderer\.ts$/,
    source: /fallbackColor|return color \|\| fallback|plot\.showLast|plot\.minHeight|plot\.maxHeight/,
  },
  {
    name: 'mobile plot error/color/display/height normalization',
    file: /packages\/tealchart\/src\/mobile\/(?:MobileIndicatorManager|render\/NativeIndicatorPlotLayer)\.tsx?$/,
    source: /catch \(err\)|\.catch\(\(error|fallback(?:Color|Colors| = '#2196F3'|: string|\])|return color \|\| fallback|return fallback|textColor=.*fallbackColor|plot\.showLast|plot\.minHeight|plot\.maxHeight/,
  },
  {
    name: 'drawing coordinate normalization',
    file: /packages\/tealchart\/src\/rendering\/TealScriptDrawingCoordinates\.ts$/,
    source: /Math\.trunc\((?:label\.barIndex|xValue)\)|clampedY/,
  },
  {
    name: 'drawing table dimension normalization',
    file: /packages\/tealchart\/src\/rendering\/TealScriptDrawingRenderer\.ts$/,
    source: /explicitWidth|explicitHeight|\(value \/ 100\)/,
  },
  {
    name: 'indicator output label normalization',
    file: /packages\/tealchart\/src\/rendering\/indicatorOutputAxisLabels\.ts$/,
    source: /fallback = '#2196F3'|return fallback|return color \|\| fallback|plot\.showLast|PINE_PLOT_PRECISION_MAX/,
  },
  {
    name: 'visual normalization register',
    file: /packages\/tealchart\/src\/rendering\/pineVisualNormalizationRegister\.ts$/,
    source: /PINE_VISUAL_NORMALIZATION_REGISTER|clamp|fallback|default/,
  },
];

const PINE_FACING_APPROXIMATION_LINE_SIGNAL =
  /(?:PlotOutput|DrawingOutput|RuntimeProfile|runtimeApproximations|swallowedErrors|PINE_VISUAL_NORMALIZATION_REGISTER|plotshape|plotchar|plotarrow|plotcandle|plotbar|bgcolor|barcolor|hline|request\.(?:security|economic|financial|splits|dividends|earnings)|strategy\.|ta\.|array\.|matrix\.|map\.|table\.|label\.|line\.|box\.|polyline\.).*(?:Math\.(?:min|max|trunc|floor|round)|catch\s*\(|\.catch\(|fallback|default|clamp|normalize|swallow|try\s*\{)|(?:Math\.(?:min|max|trunc|floor|round)|catch\s*\(|\.catch\(|fallback|default|clamp|normalize|swallow|try\s*\{).*(?:PlotOutput|DrawingOutput|RuntimeProfile|runtimeApproximations|swallowedErrors|PINE_VISUAL_NORMALIZATION_REGISTER|plotshape|plotchar|plotarrow|plotcandle|plotbar|bgcolor|barcolor|hline|request\.(?:security|economic|financial|splits|dividends|earnings)|strategy\.|ta\.|array\.|matrix\.|map\.|table\.|label\.|line\.|box\.|polyline\.)/i;

function toRepoRelative(file: string): string {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function walkAuditFiles(entry: string): string[] {
  const absolute = path.join(repoRoot, entry);
  const stats = statSync(absolute);
  if (stats.isFile()) return [entry];
  return readdirSync(absolute)
    .flatMap((child) => walkAuditFiles(path.posix.join(entry, child)))
    .sort();
}

function isSourceFile(file: string): boolean {
  return (
    /\.tsx?$/.test(file)
    && !/\.d\.ts$/.test(file)
    && !/\.test\.tsx?$/.test(file)
    && !file.includes('/__visual_snapshots__/')
    && !file.endsWith('/generatedTealscriptWebViewRuntimeHtml.ts')
  );
}

function isExcludedFromDerivedScope(file: string): boolean {
  return PINE_APPROXIMATION_SCOPE_EXCLUSIONS.some((entry) => entry.file === file);
}

function isSeededApproximationFile(file: string): boolean {
  return SEEDED_PINE_APPROXIMATION_FILE_PATTERNS.some((pattern) => pattern.test(file));
}

function hasPineFacingApproximationSignal(text: string): boolean {
  return text.split(/\r?\n/).some((line) => PINE_FACING_APPROXIMATION_LINE_SIGNAL.test(line));
}

function derivePineApproximationAuditFiles(): string[] {
  const files = new Set<string>();
  for (const root of PINE_APPROXIMATION_AUDIT_ROOTS) {
    for (const file of walkAuditFiles(root)) {
      if (!isSourceFile(file) || isExcludedFromDerivedScope(file)) continue;
      const text = readFileSync(path.join(repoRoot, file), 'utf8');
      if (isSeededApproximationFile(file) || hasPineFacingApproximationSignal(text)) {
        files.add(toRepoRelative(path.join(repoRoot, file)));
      }
    }
  }
  return Array.from(files).sort();
}

function hasSuspiciousRuleCoverage(file: string): boolean {
  return SUSPICIOUS_RULES.some((rule) => rule.file.test(file));
}

function detectSuspiciousSites(): SuspiciousSite[] {
  const sites: SuspiciousSite[] = [];
  for (const file of derivePineApproximationAuditFiles()) {
    const text = readFileSync(path.join(repoRoot, file), 'utf8');
    const lines = text.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const source = line.trim();
      if (!source || source.startsWith('//') || source.startsWith('*') || source.startsWith('import ')) continue;

      const rule = SUSPICIOUS_RULES.find((candidate) => candidate.file.test(file) && candidate.source.test(source));
      if (rule) {
        sites.push({ file, line: index + 1, source, rule: rule.name });
      }
    }
  }
  return sites;
}

function isAccounted(site: SuspiciousSite): boolean {
  return ACCOUNTED_SITES.some((entry) => {
    if (entry.file !== site.file) return false;
    if (typeof entry.source === 'string') return entry.source === site.source;
    return entry.source.test(site.source);
  });
}

function lineNumberAtOffset(text: string, offset: number): number {
  return text.slice(0, offset).split(/\r?\n/).length;
}

function extractCatchBlock(text: string, catchOffset: number): string {
  const openBrace = text.indexOf('{', catchOffset);
  if (openBrace < 0) return '';
  let depth = 0;
  for (let index = openBrace; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(catchOffset, index + 1);
    }
  }
  return text.slice(catchOffset);
}

function detectPineRuntimeErrorDemotionsWithoutClassifier(): string[] {
  const file = 'packages/tealscript/src/runtime/codegen/execute.ts';
  const text = readFileSync(path.join(repoRoot, file), 'utf8');
  const offenders: string[] = [];
  for (const match of text.matchAll(/catch \(error\) \{/g)) {
    const block = extractCatchBlock(text, match.index ?? 0);
    const demotesGeneratedErrors =
      block.includes('recordSwallowedRuntimeError')
      || block.includes('recordSwallowedError?.')
      || block.includes('recordSwallowedError(');
    if (!demotesGeneratedErrors) continue;
    if (block.includes('isKnownPineRuntimeError(error)')) continue;
    offenders.push(`${file}:${lineNumberAtOffset(text, match.index ?? 0)} ${block.split(/\r?\n/).slice(0, 8).join(' ')}`);
  }
  return offenders;
}

describe('Pine approximation surface audit guard', () => {
  it('keeps Pine-facing clamps, fallbacks, and swallowed-error boundaries accounted for', () => {
    const unaccounted = detectSuspiciousSites().filter((site) => !isAccounted(site));

    expect(
      unaccounted.map((site) => `${site.file}:${site.line} [${site.rule}] ${site.source}`),
      'New Pine-facing normalization/fallback/error-boundary sites must be added to runtimeApproximations, fallbackInventory, pineVisualNormalizationRegister, or this allowlist with a documented reason.',
    ).toEqual([]);
  });

  it('keeps swallowed generated-code boundaries from demoting Pine runtime errors', () => {
    expect(
      detectPineRuntimeErrorDemotionsWithoutClassifier(),
      'Any catch that records generated-code/request replay errors as swallowed must check isKnownPineRuntimeError(error) before demoting; otherwise correct Pine errors become profile-only noise.',
    ).toEqual([]);
  });

  it('keeps the guard scoped to the audited Pine-facing surface', () => {
    const unscanned = derivePineApproximationAuditFiles().filter((file) => !hasSuspiciousRuleCoverage(file));

    expect(
      unscanned,
      'A Pine-facing runtime/tealchart file with clamp/fallback/coercion/swallow signals must be covered by suspicious-site rules, or explicitly excluded with a reason if it is pure plumbing.',
    ).toEqual([]);

    expect(
      PINE_APPROXIMATION_SCOPE_EXCLUSIONS.map((entry) => `${entry.file}: ${entry.reason.trim() ? 'reasoned' : 'missing reason'}`),
    ).toEqual(PINE_APPROXIMATION_SCOPE_EXCLUSIONS.map((entry) => `${entry.file}: reasoned`));
  });
});
