import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../../src/parser';
import { tryCompile, executeCompiled } from '../../src/runtime/codegen';

const corpusDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'corpus');
const bars = JSON.parse(fs.readFileSync(path.join(corpusDir, 'pf-ema-cross-flip', 'bars.json'), 'utf-8')).slice(0, 10000);

const pine = `//@version=6
indicator("Benchmark", overlay=true)
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

const ast = parse(pine);
const compiled = tryCompile(ast);

// Warmup
for (let i = 0; i < 5; i++) executeCompiled(compiled, bars);

// Profiled run
for (let i = 0; i < 30; i++) executeCompiled(compiled, bars);

console.log('Done');
