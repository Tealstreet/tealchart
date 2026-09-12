import { describe, expect, it, vi } from 'vitest';

const VALUE_VECTOR_TIMEOUT_MS = 120_000;

// The value-vector gate runs the full deterministic Pine oracle suite, so it
// intentionally keeps a larger budget than the package default.
vi.setConfig({ testTimeout: VALUE_VECTOR_TIMEOUT_MS });

describe('Pine value vectors', () => {
  it('keeps passing vectors green and known defects explicit', async () => {
    const { formatValueVectorGateFailure, validateValueVectorGate } = await import(
      '../scripts/run-pine-value-vectors.ts'
    );
    const gate = validateValueVectorGate();
    expect(formatValueVectorGateFailure(gate)).toBe('');
  });

  it('requires owner and reason metadata before parking an expected red', async () => {
    const { validateExpectedValueVectorFailureMetadata } = await import(
      '../scripts/run-pine-value-vectors.ts'
    );

    expect(validateExpectedValueVectorFailureMetadata({
      'unguarded.expected-red': {
        cause: 'A cause alone is not enough to suppress a value-vector failure.',
        citation: 'https://www.tradingview.com/pine-script-docs/',
      },
    })).toEqual([
      'unguarded.expected-red: ownerLane must be one of parser, semantic, semantic/codegen, runtime/strategy',
      'unguarded.expected-red: reason must be one of trace-required, other-lane, open-defect',
    ]);

    expect(validateExpectedValueVectorFailureMetadata({
      'unnamed.open-defect': {
        ownerLane: 'semantic',
        reason: 'open-defect',
        cause: 'Open defects need a searchable defect name.',
        citation: 'https://www.tradingview.com/pine-script-docs/',
      },
    })).toEqual([
      'unnamed.open-defect: openDefect is required when reason is open-defect',
    ]);
  });
});
