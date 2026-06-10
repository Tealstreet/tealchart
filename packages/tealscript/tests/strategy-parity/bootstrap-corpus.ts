import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';
import type { StrategyTrade } from '../../src/runtime/strategy';
import { generateDeterministicBars } from './generate-bars';

const CORPUS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'corpus');
const BAR_COUNT = 200;

function tradesToTvCsv(trades: StrategyTrade[]): string {
  const header = 'Trade #,Type,Signal,Date/Time,Price,Contracts,Profit,Cum. Profit';
  const rows: string[] = [header];
  let cumProfit = 0;

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i]!;
    const tradeNum = i + 1;
    const entryType = t.direction === 'long' ? 'Entry Long' : 'Entry Short';
    const exitType = t.direction === 'long' ? 'Exit Long' : 'Exit Short';
    const entryDate = new Date(t.entryTime).toISOString().replace('T', ' ').replace('.000Z', '');
    const exitDate =
      t.exitTime !== undefined ? new Date(t.exitTime).toISOString().replace('T', ' ').replace('.000Z', '') : '';

    rows.push(`${tradeNum},${entryType},${t.entryOrderId},${entryDate},${t.entryPrice},${t.qty},,`);

    if (t.exitPrice !== undefined && t.exitOrderId !== undefined) {
      cumProfit += t.profit;
      rows.push(
        `${tradeNum},${exitType},${t.exitOrderId},${exitDate},${t.exitPrice},${t.qty},${t.profit.toFixed(2)},${cumProfit.toFixed(2)}`,
      );
    }
  }

  return rows.join('\n') + '\n';
}

function bootstrap(): void {
  const dirs = fs
    .readdirSync(CORPUS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const dir of dirs) {
    const entryDir = path.join(CORPUS_DIR, dir.name);
    const pinePath = path.join(entryDir, 'strategy.pine');
    if (!fs.existsSync(pinePath)) continue;

    const barsPath = path.join(entryDir, 'bars.json');
    const csvPath = path.join(entryDir, 'tv_trades.csv');
    const metaPath = path.join(entryDir, 'meta.json');

    const pineSource = fs.readFileSync(pinePath, 'utf-8');

    if (!fs.existsSync(barsPath)) {
      const bars = generateDeterministicBars(BAR_COUNT);
      fs.writeFileSync(barsPath, JSON.stringify(bars, null, 2) + '\n');
      console.log(`  Generated ${barsPath}`);
    }

    const bars = JSON.parse(fs.readFileSync(barsPath, 'utf-8'));

    try {
      const ast = parse(pineSource);
      const result = executeScript(ast, bars);

      if (result.errors.length > 0) {
        console.error(`  ${dir.name}: execution errors:`, result.errors);
        continue;
      }

      if (!result.strategy) {
        console.error(`  ${dir.name}: no strategy output`);
        continue;
      }

      const allTrades = [...result.strategy.closedTrades, ...result.strategy.openTrades];

      if (!fs.existsSync(csvPath)) {
        const csv = tradesToTvCsv(allTrades);
        fs.writeFileSync(csvPath, csv);
        console.log(`  Generated ${csvPath} (${result.strategy.closedTrades.length} closed trades)`);
      }

      if (!fs.existsSync(metaPath)) {
        const meta = {
          description: `Auto-bootstrapped from engine output`,
          barCount: bars.length,
          closedTradeCount: result.strategy.closedTrades.length,
          openTradeCount: result.strategy.openTrades.length,
          netProfit: result.strategy.netProfit,
          source: 'engine-baseline',
        };
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
        console.log(`  Generated ${metaPath}`);
      }

      console.log(
        `  ${dir.name}: ${result.strategy.closedTrades.length} closed, ${result.strategy.openTrades.length} open, net=${result.strategy.netProfit.toFixed(2)}`,
      );
    } catch (err) {
      console.error(`  ${dir.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

bootstrap();
