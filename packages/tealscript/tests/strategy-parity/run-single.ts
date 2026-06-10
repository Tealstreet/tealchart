import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';
import {
  computeParity,
  engineToNormalizedTrades,
  parseTvTradesCsv,
  referenceToNormalizedTrades,
} from './trade-comparison';

const corpusDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'corpus');
const entryId = process.argv[2];
if (!entryId) {
  console.error('Usage: npx tsx tests/strategy-parity/run-single.ts <entry-id>');
  process.exit(1);
}

const dir = path.join(corpusDir, entryId);
const pine = fs.readFileSync(path.join(dir, 'strategy.pine'), 'utf-8');
const bars = JSON.parse(fs.readFileSync(path.join(dir, 'bars.json'), 'utf-8'));
const csv = fs.readFileSync(path.join(dir, 'tv_trades.csv'), 'utf-8');

console.log(`Bars: ${bars.length}`);
console.log('Parsing...');
const ast = parse(pine);
console.log('Executing...');
const t0 = performance.now();
const result = executeScript(ast, bars);
const elapsed = performance.now() - t0;

console.log(`Time: ${elapsed.toFixed(0)}ms`);

if (result.errors.length > 0) {
  console.log('Errors:', result.errors.slice(0, 10));
}

if (!result.strategy) {
  console.log('No strategy output');
  process.exit(1);
}

const s = result.strategy;
console.log(`Closed trades: ${s.closedTrades.length}`);
console.log(`Open trades: ${s.openTrades.length}`);
console.log(`Net profit: ${s.netProfit.toFixed(2)}`);

if (s.closedTrades.length > 0) {
  const first = s.closedTrades[0]!;
  console.log(`First engine trade: dir=${first.direction} entry=${first.entryPrice} exit=${first.exitPrice} profit=${first.profit.toFixed(2)}`);
}

const refTrades = parseTvTradesCsv(csv);
console.log(`\nReference CSV rows: ${refTrades.length}`);
const refNorm = referenceToNormalizedTrades(refTrades);
console.log(`Reference normalized trades: ${refNorm.length}`);
if (refNorm.length > 0) {
  const first = refNorm[0]!;
  console.log(`First ref trade: dir=${first.direction} entry=${first.entryPrice} exit=${first.exitPrice} profit=${first.profit.toFixed(2)}`);
}

const engineNorm = engineToNormalizedTrades(s.closedTrades);
const meta = fs.existsSync(path.join(dir, 'meta.json'))
  ? JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf-8'))
  : {};
const trimOverlap = meta.source === 'tradingview';
if (trimOverlap) console.log('(Trimming to overlap window — TV reference may have warmup data outside our bar range)');
const parity = computeParity(entryId, engineNorm, refNorm, { trimOverlap });

console.log(`\n=== PARITY: ${parity.grade.toUpperCase()} ===`);
console.log(parity.summary);

if (parity.matches.length > 0) {
  console.log('\nFirst 5 matches:');
  for (const m of parity.matches.slice(0, 5)) {
    const et = engineNorm[m.engineIndex]!;
    const rt = refNorm[m.referenceIndex]!;
    console.log(`  engine[${m.engineIndex}] ↔ ref[${m.referenceIndex}]: entry ${et.entryPrice} vs ${rt.entryPrice} (Δ${(m.entryPriceDelta * 100).toFixed(4)}%) | exit ${et.exitPrice} vs ${rt.exitPrice} (Δ${(m.exitPriceDelta * 100).toFixed(4)}%)`);
  }
}

if (parity.unmatchedEngine.length > 0) {
  console.log(`\nUnmatched engine trades (first 10):`);
  for (const i of parity.unmatchedEngine.slice(0, 10)) {
    const t = engineNorm[i]!;
    console.log(`  [${i}] ${t.direction} entry=${t.entryPrice} exit=${t.exitPrice} profit=${t.profit.toFixed(2)}`);
  }
}

if (parity.unmatchedReference.length > 0) {
  console.log(`\nUnmatched reference trades (first 10):`);
  for (const i of parity.unmatchedReference.slice(0, 10)) {
    const t = refNorm[i]!;
    console.log(`  [${i}] ${t.direction} entry=${t.entryPrice} exit=${t.exitPrice} profit=${t.profit.toFixed(2)}`);
  }
}
