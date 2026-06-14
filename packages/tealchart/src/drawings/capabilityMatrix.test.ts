import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { USER_DRAWING_TOOL_DESCRIPTORS } from './toolbar';

const readCapabilityMatrixMarkdown = () => {
  const candidates = ['DRAWING_TOOLS_CAPABILITY_MATRIX.md', '../../DRAWING_TOOLS_CAPABILITY_MATRIX.md'];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) {
    throw new Error('Unable to locate DRAWING_TOOLS_CAPABILITY_MATRIX.md');
  }
  return readFileSync(path, 'utf8');
};

const extractToolInventoryTools = (markdown: string): string[] => {
  const [, inventory = ''] = markdown.split('## Tealchart Tool Inventory');
  const [table = ''] = inventory.split('## TradingView Category Coverage');
  const tools = new Set<string>();

  for (const line of table.split('\n')) {
    if (!line.startsWith('|')) continue;
    const columns = line.split('|').map((column) => column.trim());
    const toolsColumn = columns[2];
    if (!toolsColumn || toolsColumn === 'Tools' || toolsColumn === '---') continue;
    for (const [, tool] of toolsColumn.matchAll(/`([^`]+)`/g)) {
      tools.add(tool);
    }
  }

  return Array.from(tools).sort();
};

describe('drawing tools capability matrix', () => {
  it('tracks every registered drawing tool in the parity inventory', () => {
    const registeredTools = USER_DRAWING_TOOL_DESCRIPTORS.map(({ tool }) => tool).sort();
    const inventoryTools = extractToolInventoryTools(readCapabilityMatrixMarkdown());

    expect(inventoryTools).toEqual(registeredTools);
  });
});
