import { describe, expect, it } from 'vitest';

import { selectPinnedCorpusPaths } from '../../scripts/run-pinned-external-pine-corpus.ts';

describe('pinned corpus shard selection', () => {
  it('assigns each manifest position to exactly one deterministic shard', () => {
    const paths = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const shards = [0, 1, 2].map((index) => selectPinnedCorpusPaths(paths, { index, count: 3 }));

    expect(shards.map((shard) => [...shard])).toEqual([
      ['a', 'd', 'g'],
      ['b', 'e'],
      ['c', 'f'],
    ]);
    expect(new Set(shards.flatMap((shard) => [...shard]))).toEqual(new Set(paths));
  });

  it('keeps the full manifest when no shard is requested', () => {
    expect([...selectPinnedCorpusPaths(['a', 'b'])]).toEqual(['a', 'b']);
  });
});
