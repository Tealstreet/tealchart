#!/usr/bin/env node

/**
 * Check that checked-in parser artifacts match the Peggy grammar.
 */

import { readFileSync } from 'fs';

import { generateParserArtifacts, parserArtifactPaths } from './parser-artifacts.js';

const expected = generateParserArtifacts();

const checks = [
  {
    name: 'generated parser',
    path: parserArtifactPaths.generated,
    expected: expected.parserSource,
  },
  {
    name: 'generated declarations',
    path: parserArtifactPaths.declarations,
    expected: expected.declarations,
  },
];

const stale = checks.filter((check) => {
  try {
    return readFileSync(check.path, 'utf-8') !== check.expected;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${check.name} is missing or unreadable: ${check.path} (${message})`);
    return true;
  }
});

if (stale.length > 0) {
  for (const check of stale) {
    console.error(`${check.name} is stale: ${check.path}`);
  }
  console.error('Run `yarn build:parser` from packages/tealscript and commit the generated files.');
  process.exit(1);
}

console.log('Parser artifacts are up to date.');
