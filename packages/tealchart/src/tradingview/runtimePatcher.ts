import type {
  TradingViewPatchErrorCode,
  TradingViewPatchOptions,
  TradingViewPatchResult,
  TradingViewPatchSpec,
  TradingViewTextPatch,
} from './types';

export class TradingViewPatchError extends Error {
  constructor(
    readonly code: TradingViewPatchErrorCode,
    message: string,
    readonly patchId?: string
  ) {
    super(message);
    this.name = 'TradingViewPatchError';
  }
}

export async function sha256Hex(source: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('crypto.subtle is required to hash TradingView bundles');
  }

  const bytes = new TextEncoder().encode(source);
  const digest = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function patchTradingViewBundle(
  source: string,
  spec: TradingViewPatchSpec,
  options: TradingViewPatchOptions = {}
): Promise<TradingViewPatchResult> {
  const expectedSha256 = options.expectedSha256 ?? spec.sourceSha256;
  const sourceSha256 = expectedSha256 ? await sha256Hex(source) : undefined;
  const warnings: string[] = [];

  if (expectedSha256 && sourceSha256 !== expectedSha256) {
    const message = `TradingView bundle hash mismatch for ${spec.id}`;
    if (!options.allowHashMismatch) {
      throw new TradingViewPatchError('hash-mismatch', message);
    }
    warnings.push(message);
  }

  const patchResult = applyTradingViewPatchSpec(source, spec);

  return {
    code: patchResult.code,
    specId: spec.id,
    tradingViewVersion: spec.tradingViewVersion,
    sourceSha256,
    appliedPatches: patchResult.appliedPatches,
    warnings: [...warnings, ...patchResult.warnings],
  };
}

export function applyTradingViewPatchSpec(
  source: string,
  spec: TradingViewPatchSpec
): Pick<TradingViewPatchResult, 'appliedPatches' | 'code' | 'warnings'> {
  let code = source;
  const appliedPatches: string[] = [];
  const warnings: string[] = [];

  for (const patch of spec.patches) {
    const nextCode = applyTextPatch(code, patch);
    if (nextCode === code) {
      if (patch.required !== false) {
        throw new TradingViewPatchError(
          'missing-anchor',
          `Required TradingView patch anchor was not found: ${patch.id}`,
          patch.id
        );
      }
      warnings.push(`Optional TradingView patch anchor was not found: ${patch.id}`);
      continue;
    }

    code = nextCode;
    appliedPatches.push(patch.id);
  }

  return { code, appliedPatches, warnings };
}

function applyTextPatch(source: string, patch: TradingViewTextPatch): string {
  const occurrence = patch.occurrence ?? 0;

  if (occurrence === 'all') {
    return source.split(patch.find).join(patch.replace);
  }

  if (occurrence < 0 || !Number.isInteger(occurrence)) {
    throw new TradingViewPatchError(
      'invalid-occurrence',
      `TradingView patch occurrence must be a non-negative integer: ${patch.id}`,
      patch.id
    );
  }

  const indexes = findAllIndexes(source, patch.find);
  if (indexes.length === 0) {
    return source;
  }

  if (occurrence >= indexes.length) {
    throw new TradingViewPatchError(
      'invalid-occurrence',
      `TradingView patch occurrence ${occurrence} is outside ${indexes.length} matches: ${patch.id}`,
      patch.id
    );
  }

  if (indexes.length > 1 && patch.occurrence === undefined) {
    throw new TradingViewPatchError(
      'ambiguous-anchor',
      `TradingView patch anchor matched ${indexes.length} times: ${patch.id}`,
      patch.id
    );
  }

  const start = indexes[occurrence];
  return `${source.slice(0, start)}${patch.replace}${source.slice(start + patch.find.length)}`;
}

function findAllIndexes(source: string, needle: string): number[] {
  if (!needle) {
    throw new TradingViewPatchError('missing-anchor', 'TradingView patch anchor cannot be empty');
  }

  const indexes: number[] = [];
  let index = source.indexOf(needle);

  while (index !== -1) {
    indexes.push(index);
    index = source.indexOf(needle, index + needle.length);
  }

  return indexes;
}
