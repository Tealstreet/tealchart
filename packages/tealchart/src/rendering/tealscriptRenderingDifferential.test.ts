// @vitest-environment node
import type { DrawingOutput, ExecutionResult, PlotOutput } from '@tealstreet/tealscript';
import type { CanvasContext } from './CanvasContext';
import type { Bar, ComputedPane, Viewport } from '../types';

import { afterEach, describe, expect, it } from 'vitest';

import { parse, TealscriptEngine, executeScript } from '@tealstreet/tealscript';
import { executeCompiled, tryCompile } from '@tealstreet/tealscript/src/runtime/codegen/execute';
import { TealchartRenderer } from '../TealchartRenderer';
import { clearChartStoreCache } from '../state/chartState';
import { partitionTealScriptDrawings } from './TealScriptDrawingPartition';
import { TealScriptDrawingRenderer } from './TealScriptDrawingRenderer';

type DrawCall =
  | { op: 'arc'; fillStyle: string; strokeStyle: string; x: number; y: number; radius: number }
  | { op: 'beginPath' }
  | { op: 'clip' }
  | { op: 'closePath' }
  | { op: 'fill'; fillStyle: string }
  | { op: 'fillRect'; fillStyle: string; x: number; y: number; width: number; height: number }
  | { op: 'fillText'; fillStyle: string; font: string; text: string; textAlign: CanvasTextAlign; textBaseline: CanvasTextBaseline; x: number; y: number }
  | { op: 'lineTo'; x: number; y: number }
  | { op: 'moveTo'; x: number; y: number }
  | { op: 'rect'; x: number; y: number; width: number; height: number }
  | { op: 'restore' }
  | { op: 'save' }
  | { op: 'scale'; x: number; y: number }
  | { op: 'setLineDash'; segments: number[] }
  | { op: 'stroke'; lineDash: number[]; lineWidth: number; strokeStyle: string }
  | { op: 'strokeRect'; lineWidth: number; strokeStyle: string; x: number; y: number; width: number; height: number };

interface CanvasState {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  lineDashOffset: number;
  globalAlpha: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  lineDash: number[];
}

interface RenderProgram {
  id: string;
  seed: number;
  blocks: string[];
  source: string;
}

interface RenderSnapshot {
  plots: DrawCall[];
  drawings: DrawCall[];
}

class RecordingCanvasContext implements CanvasContext {
  readonly calls: DrawCall[] = [];
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000';
  lineWidth = 1;
  font = '10px sans-serif';
  textAlign: CanvasTextAlign = 'left';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  lineDashOffset = 0;
  globalAlpha = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  private lineDash: number[] = [];
  private readonly stateStack: CanvasState[] = [];

  beginPath(): void {
    this.calls.push({ op: 'beginPath' });
  }

  moveTo(x: number, y: number): void {
    this.calls.push({ op: 'moveTo', x: roundCoord(x), y: roundCoord(y) });
  }

  lineTo(x: number, y: number): void {
    this.calls.push({ op: 'lineTo', x: roundCoord(x), y: roundCoord(y) });
  }

  quadraticCurveTo(_cpx: number, _cpy: number, x: number, y: number): void {
    this.lineTo(x, y);
  }

  bezierCurveTo(_cp1x: number, _cp1y: number, _cp2x: number, _cp2y: number, x: number, y: number): void {
    this.lineTo(x, y);
  }

  arc(x: number, y: number, radius: number): void {
    this.calls.push({
      op: 'arc',
      x: roundCoord(x),
      y: roundCoord(y),
      radius: roundCoord(radius),
      fillStyle: String(this.fillStyle),
      strokeStyle: String(this.strokeStyle),
    });
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.calls.push({ op: 'rect', x: roundCoord(x), y: roundCoord(y), width: roundCoord(width), height: roundCoord(height) });
  }

  roundRect(x: number, y: number, width: number, height: number): void {
    this.rect(x, y, width, height);
  }

  closePath(): void {
    this.calls.push({ op: 'closePath' });
  }

  fill(): void {
    this.calls.push({ op: 'fill', fillStyle: String(this.fillStyle) });
  }

  stroke(): void {
    this.calls.push({
      op: 'stroke',
      strokeStyle: String(this.strokeStyle),
      lineWidth: this.lineWidth,
      lineDash: [...this.lineDash],
    });
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push({
      op: 'fillRect',
      fillStyle: String(this.fillStyle),
      x: roundCoord(x),
      y: roundCoord(y),
      width: roundCoord(width),
      height: roundCoord(height),
    });
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.calls.push({
      op: 'strokeRect',
      strokeStyle: String(this.strokeStyle),
      lineWidth: this.lineWidth,
      x: roundCoord(x),
      y: roundCoord(y),
      width: roundCoord(width),
      height: roundCoord(height),
    });
  }

  fillText(text: string, x: number, y: number): void {
    this.calls.push({
      op: 'fillText',
      text,
      x: roundCoord(x),
      y: roundCoord(y),
      fillStyle: String(this.fillStyle),
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
    });
  }

  save(): void {
    this.stateStack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      lineDashOffset: this.lineDashOffset,
      globalAlpha: this.globalAlpha,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      lineDash: [...this.lineDash],
    });
    this.calls.push({ op: 'save' });
  }

  restore(): void {
    const state = this.stateStack.pop();
    if (state) {
      this.fillStyle = state.fillStyle;
      this.strokeStyle = state.strokeStyle;
      this.lineWidth = state.lineWidth;
      this.font = state.font;
      this.textAlign = state.textAlign;
      this.textBaseline = state.textBaseline;
      this.lineDashOffset = state.lineDashOffset;
      this.globalAlpha = state.globalAlpha;
      this.lineCap = state.lineCap;
      this.lineJoin = state.lineJoin;
      this.lineDash = [...state.lineDash];
    }
    this.calls.push({ op: 'restore' });
  }

  clip(): void {
    this.calls.push({ op: 'clip' });
  }

  scale(x: number, y: number): void {
    this.calls.push({ op: 'scale', x, y });
  }

  translate(_x: number, _y: number): void {
    return;
  }

  setLineDash(segments: number[]): void {
    this.lineDash = [...segments];
    this.calls.push({ op: 'setLineDash', segments: [...segments] });
  }

  getLineDash(): number[] {
    return [...this.lineDash];
  }

  measureText(text: string): TextMetrics {
    return { width: text.length * 7 } as TextMetrics;
  }
}

const DEFAULT_PROGRAMS = 12;
const SOAK_PROGRAMS = 96;
const PROGRAM_COUNT = process.env.TEALSCRIPT_GRAMMAR_DIFF_SOAK === '1' ? SOAK_PROGRAMS : DEFAULT_PROGRAMS;
const WIDTH = 420;
const HEIGHT = 300;

const BASE_BARS: Bar[] = [
  { time: 1_700_000_000_000, open: 100, high: 105, low: 97, close: 102, volume: 1_000 },
  { time: 1_700_000_060_000, open: 102, high: 108, low: 101, close: 107, volume: 1_150 },
  { time: 1_700_000_120_000, open: 107, high: 109, low: 103, close: 104, volume: 900 },
  { time: 1_700_000_180_000, open: 104, high: 111, low: 102, close: 110, volume: 1_250 },
  { time: 1_700_000_240_000, open: 110, high: 112, low: 105, close: 106, volume: 1_400 },
  { time: 1_700_000_300_000, open: 106, high: 113, low: 104, close: 111, volume: 1_500 },
];

const LIVE_UPDATES: Bar[] = [
  { ...BASE_BARS[BASE_BARS.length - 1]!, high: 114, close: 112, volume: 1_650 },
  { ...BASE_BARS[BASE_BARS.length - 1]!, high: 115, low: 103, close: 105, volume: 1_900 },
  { ...BASE_BARS[BASE_BARS.length - 1]!, high: 116, close: 113, volume: 2_050 },
];

function roundCoord(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function makeRenderer(ctx: RecordingCanvasContext): TealchartRenderer {
  return new TealchartRenderer(ctx, {
    width: WIDTH,
    height: HEIGHT,
    showVolume: false,
    backgroundColor: '#101214',
    gridColor: '#25282c',
    textColor: '#d0d4dc',
    devicePixelRatio: 1,
  });
}

function makeViewport(bars: Bar[]): Viewport {
  const prices = bars.flatMap((bar) => [bar.open, bar.high, bar.low, bar.close]);
  return {
    startTime: bars[0]!.time,
    endTime: bars[bars.length - 1]!.time,
    priceMin: Math.min(...prices) - 8,
    priceMax: Math.max(...prices) + 8,
  };
}

function makeDrawingPane(renderer: TealchartRenderer, viewport: Viewport): ComputedPane {
  const margins = renderer.getOptions().margins;
  return {
    id: 'main',
    type: 'main',
    heightRatio: 1,
    yMin: viewport.priceMin,
    yMax: viewport.priceMax,
    fixedRange: false,
    top: margins.top,
    height: HEIGHT - margins.top - margins.bottom,
    bottom: HEIGHT - margins.bottom,
  };
}

function renderSnapshot(output: Pick<ExecutionResult, 'plots' | 'drawings'>, bars: Bar[]): RenderSnapshot {
  const viewport = makeViewport(bars);
  const plotCtx = new RecordingCanvasContext();
  makeRenderer(plotCtx).renderPlots(output.plots, bars, viewport);

  const drawingCtx = new RecordingCanvasContext();
  const drawingRendererHost = makeRenderer(drawingCtx);
  const options = drawingRendererHost.getOptions();
  const drawingRenderer = new TealScriptDrawingRenderer({
    ctx: drawingCtx,
    options,
    margins: options.margins,
    font: 'sans-serif',
    coordinateResolvers: {
      timeToX: (time, activeViewport, chartWidth) => {
        const ratio = (time - activeViewport.startTime) / (activeViewport.endTime - activeViewport.startTime);
        return options.margins.left + ratio * chartWidth;
      },
      valueToY: (value, pane) => drawingRendererHost.valueToY(value, pane),
    },
    getTextWidth: (_ctx, text) => text.length * 7,
  });
  drawingRenderer.render(partitionTealScriptDrawings(output.drawings), bars, viewport, makeDrawingPane(drawingRendererHost, viewport));

  return { plots: plotCtx.calls, drawings: drawingCtx.calls };
}

function cloneBars(bars: Bar[]): Bar[] {
  return bars.map((bar) => ({ ...bar }));
}

function replaceLastBar(bars: Bar[], bar: Bar): Bar[] {
  return [...bars.slice(0, -1).map((entry) => ({ ...entry })), { ...bar }];
}

function executeCompiledProgram(source: string, bars: Bar[]): ExecutionResult {
  const ast = parse(source);
  const compiled = tryCompile(ast);
  if (!compiled.success) {
    throw new Error(`Generated render program did not compile: ${compiled.unsupported.join('; ')}\n${source}`);
  }
  const result = executeCompiled(compiled, cloneBars(bars));
  if (!result) {
    throw new Error(`Generated render program returned no compiled result\n${source}`);
  }
  return result;
}

function xorshift32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)]!;
}

function shuffle<T>(random: () => number, values: readonly T[]): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }
  return copy;
}

function generatedBlocks(suffix: number): Array<{ id: string; source: string }> {
  const colorA = suffix % 2 === 0 ? 'color.lime' : 'color.aqua';
  const colorB = suffix % 3 === 0 ? 'color.fuchsia' : 'color.orange';
  return [
    {
      id: 'plot-line-fill-bg',
      source: `basis${suffix} = ta.sma(close, 3)
upper${suffix} = basis${suffix} + (high - low)
lower${suffix} = basis${suffix} - (high - low)
pUpper${suffix} = plot(upper${suffix}, title="upper_${suffix}", color=color.new(${colorA}, bar_index % 2 == 0 ? 10 : 35), linewidth=${1 + (suffix % 3)}, style=plot.style_line)
pLower${suffix} = plot(lower${suffix}, title="lower_${suffix}", color=color.new(${colorB}, 25), style=plot.style_linebr)
fill(pUpper${suffix}, pLower${suffix}, color=color.new(color.blue, 82), fillgaps=false)
bgcolor(bar_index % 2 == 0 ? color.new(color.gray, 88) : na)`,
    },
    {
      id: 'plot-ohlc-arrow-marker',
      source: `wick${suffix} = close >= open ? color.silver : color.gray
plotcandle(open, high, low, close, title="candle_${suffix}", color=close >= open ? color.new(color.green, 15) : color.new(color.red, 20), wickcolor=wick${suffix}, bordercolor=color.black)
plotbar(open, high + ${suffix % 2}, low - ${suffix % 2}, close, title="bar_${suffix}", color=close >= open ? color.green : color.red)
plotarrow(close - open, title="arrow_${suffix}", colorup=color.lime, colordown=color.red, minheight=4, maxheight=${12 + (suffix % 6)})
plotshape(close > open, title="shape_${suffix}", style=shape.triangleup, location=location.abovebar, color=color.new(color.green, 30), text="U${suffix % 10}", textcolor=color.white)`,
    },
    {
      id: 'drawing-last-bar',
      source: `var marker${suffix} = label.new(0, close, text="seed_${suffix}", color=color.blue, textcolor=color.white)
var trend${suffix} = line.new(0, close, 1, close + 1, color=color.red, style=line.style_dotted, width=2)
var range${suffix} = box.new(0, high, 1, low, border_color=color.orange, border_width=1, bgcolor=color.new(color.purple, 85), text="box_${suffix}")
if barstate.islast
    label.set_x(marker${suffix}, bar_index)
    label.set_y(marker${suffix}, close)
    label.set_text(marker${suffix}, str.format("C{0}", close))
    label.set_color(marker${suffix}, close >= open ? color.green : color.red)
    line.set_xy1(trend${suffix}, bar_index - 2, low[2])
    line.set_xy2(trend${suffix}, bar_index, high)
    line.set_color(trend${suffix}, close >= open ? color.lime : color.fuchsia)
    box.set_left(range${suffix}, bar_index - 2)
    box.set_right(range${suffix}, bar_index)
    box.set_top(range${suffix}, high)
    box.set_bottom(range${suffix}, low)
    box.set_text(range${suffix}, str.format("R{0}", high - low))`,
    },
    {
      id: 'table-state',
      source: `var dash${suffix} = table.new(position.top_right, 2, 2, bgcolor=color.new(color.black, 0), frame_color=color.blue, frame_width=1)
if barstate.islast
    table.cell(dash${suffix}, 0, 0, "close", text_color=color.white, bgcolor=color.new(color.blue, 20))
    table.cell(dash${suffix}, 1, 0, str.format("{0}", close), text_color=close >= open ? color.lime : color.red)
    table.cell(dash${suffix}, 0, 1, "vol", text_color=color.white)
    table.cell(dash${suffix}, 1, 1, str.format("{0}", volume), text_color=color.yellow)`,
    },
    {
      id: 'history-na-offsets',
      source: `hist${suffix} = na(close[2]) ? open : close[2]
plot(hist${suffix}, title="hist_${suffix}", color=hist${suffix} > close ? color.red : color.green, offset=${(suffix % 3) - 1}, style=plot.style_circles, linewidth=2)
plot(close > nz(close[1]) ? high : na, title="gap_${suffix}", color=color.new(color.yellow, 15), style=plot.style_columns, histbase=low)`,
    },
  ];
}

function generateProgram(seed: number): RenderProgram {
  const random = xorshift32(seed);
  const suffix = seed % 1_000;
  const blocks = shuffle(random, generatedBlocks(suffix)).slice(0, 2 + (seed % 2));
  const overlay = pick(random, ['true', 'false']);
  return {
    id: `render-${seed}`,
    seed,
    blocks: blocks.map((block) => block.id),
    source: `//@version=6
indicator("RenderDiff ${seed}", overlay=${overlay}, max_labels_count=20, max_lines_count=20, max_boxes_count=20, explicit_plot_zorder=true)
${blocks.map((block) => block.source).join('\n')}`,
  };
}

function firstDifference(left: RenderSnapshot, right: RenderSnapshot): string {
  const leftPlots = JSON.stringify(left.plots);
  const rightPlots = JSON.stringify(right.plots);
  if (leftPlots !== rightPlots) return `plot commands differ\nleft=${leftPlots}\nright=${rightPlots}`;
  return `drawing commands differ\nleft=${JSON.stringify(left.drawings)}\nright=${JSON.stringify(right.drawings)}`;
}

function assertRenderSnapshotsEqual(left: RenderSnapshot, right: RenderSnapshot, context: string): void {
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    expect.fail(`${context}\n${firstDifference(left, right)}`);
  }
}

describe('TealScript render differential generator', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it(`renders interpreter-fed and compiled-fed outputs identically across ${PROGRAM_COUNT} generated programs`, () => {
    const failures: string[] = [];
    for (let index = 0; index < PROGRAM_COUNT; index += 1) {
      const program = generateProgram(91_000 + index);
      const interpreted = executeScript(parse(program.source), cloneBars(BASE_BARS));
      const compiled = executeCompiledProgram(program.source, BASE_BARS);

      const interpretedSnapshot = renderSnapshot(interpreted, BASE_BARS);
      const compiledSnapshot = renderSnapshot(compiled, BASE_BARS);
      if (JSON.stringify(interpretedSnapshot) !== JSON.stringify(compiledSnapshot)) {
        failures.push(`${program.id} blocks=${program.blocks.join(',')}\n${firstDifference(interpretedSnapshot, compiledSnapshot)}\n${program.source}`);
      }
    }

    expect(failures).toEqual([]);
  });

  it(`renders realtime update state like a fresh full execution across ${PROGRAM_COUNT} generated programs`, () => {
    const failures: string[] = [];
    for (let index = 0; index < PROGRAM_COUNT; index += 1) {
      const program = generateProgram(92_000 + index);
      const ast = parse(program.source);
      const engine = new TealscriptEngine();
      engine.execute(ast, cloneBars(BASE_BARS));

      for (const [updateIndex, updateBar] of LIVE_UPDATES.entries()) {
        const updatedBars = replaceLastBar(BASE_BARS, updateBar);
        const updateOutput: Pick<ExecutionResult, 'plots' | 'drawings'> = {
          plots: engine.updateBar(ast, { ...updateBar }),
          drawings: engine.getDrawings(),
        };
        const updateSnapshot = renderSnapshot(updateOutput, updatedBars);
        const freshInterpreter = executeScript(ast, cloneBars(updatedBars));
        const freshCompiled = executeCompiledProgram(program.source, updatedBars);
        const freshInterpreterSnapshot = renderSnapshot(freshInterpreter, updatedBars);
        const freshCompiledSnapshot = renderSnapshot(freshCompiled, updatedBars);

        try {
          assertRenderSnapshotsEqual(
            updateSnapshot,
            freshInterpreterSnapshot,
            `${program.id} update ${updateIndex} realtime render differs from fresh interpreter render`,
          );
          assertRenderSnapshotsEqual(
            freshCompiledSnapshot,
            freshInterpreterSnapshot,
            `${program.id} update ${updateIndex} compiled full render differs from interpreter full render`,
          );
        } catch (error) {
          failures.push(`${error instanceof Error ? error.message : String(error)}\nblocks=${program.blocks.join(',')}\n${program.source}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
