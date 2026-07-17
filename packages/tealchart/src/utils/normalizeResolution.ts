import type { ResolutionString } from '../types';

export type ResolutionInput = string | number | null | undefined;

export function normalizeResolution(
  resolution: ResolutionInput,
  fallback: ResolutionString | string = '60'
): ResolutionString {
  const fallbackResolution = String(fallback).trim();

  if (resolution === null || resolution === undefined) {
    return fallbackResolution as ResolutionString;
  }

  const normalized = String(resolution).trim();
  return (normalized || fallbackResolution) as ResolutionString;
}
