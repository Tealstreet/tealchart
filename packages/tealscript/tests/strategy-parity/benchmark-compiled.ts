import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';
import { tryCompile, executeCompiled } from '../../src/runtime/codegen';

const corpusDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'corpus');
const maxBars = process.argv[2] ? parseInt(process.argv[2], 10) : 10000;
const warmup = parseInt(process.argv[3] || '3', 10);
const iterations = parseInt(process.argv[4] || '5', 10);

const entryId = 'pf-ema-cross-flip';
const dir = path.join(corpusDir, entryId);
const allBars = JSON.parse(fs.readFileSync(path.join(dir, 'bars.json'), 'utf-8'));
const bars = maxBars > 0 ? allBars.slice(0, maxBars) : allBars;

// Use an indicator-only script (no strategy) for the compiled benchmark
const indicatorPine = `//@version=6
indicator("Benchmark Indicator", overlay=true)
fast = ta.ema(close, 5)
slow = ta.ema(close, 13)
plot(fast)
plot(slow)
plot(ta.crossover(fast, slow) ? 1 : 0)
plot(ta.rsi(close, 14))
plot(ta.sma(close, 20))
plot(ta.highest(close, 10))
plot(ta.lowest(close, 10))
plot(ta.change(close))
`;

const ast = parse(indicatorPine);

console.log(`Benchmark: indicator with 8 plots, EMA/SMA/RSI/crossover/highest/lowest/change`);
console.log(`Bars: ${bars.length}`);
console.log(`Warmup: ${warmup}, Iterations: ${iterations}`);
console.log('---');

// Interpreter benchmark
for (let i = 0; i < warmup; i++) {
  executeScript(ast, bars);
}

const interpTimes: number[] = [];
for (let i = 0; i < iterations; i++) {
  const t0 = performance.now();
  executeScript(ast, bars);
  const elapsed = performance.now() - t0;
  interpTimes.push(elapsed);
}

const interpMedian = interpTimes.slice().sort((a, b) => a - b)[Math.floor(interpTimes.length / 2)]!;
const interpBps = Math.round(bars.length / (interpMedian / 1000));

console.log(`\nInterpreter:`);
console.log(`  Median: ${interpMedian.toFixed(1)}ms`);
console.log(`  Bars/s: ${interpBps.toLocaleString()}`);

// Compiled benchmark
const compiled = tryCompile(ast);
if (!compiled.success) {
  console.error('Compilation failed:', compiled.unsupported);
  process.exit(1);
}

console.log(`  Compiled: ${compiled.success}`);

for (let i = 0; i < warmup; i++) {
  executeCompiled(compiled, bars);
}

const compiledTimes: number[] = [];
for (let i = 0; i < iterations; i++) {
  const t0 = performance.now();
  executeCompiled(compiled, bars);
  const elapsed = performance.now() - t0;
  compiledTimes.push(elapsed);
}

const compiledMedian = compiledTimes.slice().sort((a, b) => a - b)[Math.floor(compiledTimes.length / 2)]!;
const compiledBps = Math.round(bars.length / (compiledMedian / 1000));

console.log(`\nCompiled:`);
console.log(`  Median: ${compiledMedian.toFixed(1)}ms`);
console.log(`  Bars/s: ${compiledBps.toLocaleString()}`);

console.log(`\nSpeedup: ${(interpMedian / compiledMedian).toFixed(1)}x`);
console.log(`  Interpreter: ${interpBps.toLocaleString()} bps`);
console.log(`  Compiled:    ${compiledBps.toLocaleString()} bps`);

// Verify parity
const interpResult = executeScript(ast, bars);
const compiledResult = executeCompiled(compiled, bars)!;

let parityOk = true;
for (let i = 0; i < interpResult.plots.length; i++) {
  const iv = interpResult.plots[i].values;
  const cv = compiledResult.plots[i]?.values;
  if (!cv) {
    console.log(`  Plot ${i}: MISSING in compiled`);
    parityOk = false;
    continue;
  }
  let mismatches = 0;
  for (let j = 0; j < iv.length; j++) {
    const a = iv[j], b = cv[j];
    if (a === null && b === null) continue;
    if (a === null || b === null || Math.abs(a - b) > 1e-10) {
      mismatches++;
    }
  }
  if (mismatches > 0) {
    console.log(`  Plot ${i}: ${mismatches} mismatches out of ${iv.length}`);
    parityOk = false;
  }
}

console.log(`\nParity: ${parityOk ? 'OK' : 'FAILED'}`);
