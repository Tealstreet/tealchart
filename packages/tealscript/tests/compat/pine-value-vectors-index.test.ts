import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const INDEX_PATH = join(REPO_ROOT, 'packages/tealscript/reports/pine-value-vectors-index-v1.md');
const REPORTS_ROOT = join(REPO_ROOT, 'packages/tealscript/reports');
const COMMIT_SHA_PATTERN = /`[0-9a-f]{10,40}`/;

function expandReportCell(cell: string): string[] {
  return cell
    .replaceAll('`', '')
    .split(/\s+and\s+/)
    .flatMap((part) => {
      const trimmed = part.trim();
      if (!trimmed) return [];
      const braceMatch = /^(.+?)\.\{md,json\}$/.exec(trimmed);
      if (braceMatch) return [`${braceMatch[1]}.md`, `${braceMatch[1]}.json`];
      return [trimmed];
    });
}

function resolveReportPath(report: string): string {
  if (report.startsWith('packages/tealscript/scripts/')) {
    return join(REPO_ROOT, report);
  }
  return join(REPORTS_ROOT, report);
}

describe('Pine value-vector index', () => {
  it('points authoritative metric routes at current committed reports', () => {
    const contents = readFileSync(INDEX_PATH, 'utf8');
    const routeRows = contents
      .split('\n')
      .filter((line) => line.startsWith('| '))
      .filter((line) => !line.startsWith('| Question |') && !line.startsWith('| --- |'));

    expect(routeRows.length).toBeGreaterThan(0);

    for (const row of routeRows) {
      const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
      if (cells.length !== 4) continue;
      const [question, reportCell, commitCell] = cells;
      expect(reportCell, question).not.toContain('superseded');
      expect(commitCell, question).toMatch(COMMIT_SHA_PATTERN);

      for (const report of expandReportCell(reportCell)) {
        const reportPath = resolveReportPath(report);
        expect(existsSync(reportPath), `${question}: missing ${report}`).toBe(true);
        if (report.endsWith('.md')) {
          const reportContents = readFileSync(reportPath, 'utf8');
          expect(reportContents.slice(0, 200), `${question}: ${report} is superseded`).not.toMatch(/^Superseded by /);
        }
      }
    }
  });
});
