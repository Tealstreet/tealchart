#!/usr/bin/env node

/**
 * Build the TealScript parser from the Peggy grammar
 *
 * Usage: node scripts/build-parser.js
 */

import { writeFileSync } from 'fs';

import { generateParserArtifacts, parserArtifactPaths } from './parser-artifacts.js';

console.log('Building TealScript parser...');
console.log(`  Grammar: ${parserArtifactPaths.grammar}`);
console.log(`  Output:  ${parserArtifactPaths.generated}`);

try {
  const { parserSource, declarations } = generateParserArtifacts();

  // Write parser
  writeFileSync(parserArtifactPaths.generated, parserSource, 'utf-8');

  // Write TypeScript declarations
  writeFileSync(parserArtifactPaths.declarations, declarations, 'utf-8');

  console.log('Parser built successfully!');
} catch (error) {
  console.error('Failed to build parser:', error.message);
  process.exit(1);
}
