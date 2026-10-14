import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

interface NativeRefusal {
  executedSource: string;
  executedSha256: string;
  status: string;
  nativeCompilationObserved: boolean;
  markers: { severity: number; message: string; code?: string }[];
  publication?: { publishedSourceSha256: string; immutableImportPath: string; sourceVerifiedAgainstTemplate: boolean };
}

export function readV58File(path: string): string {
  return readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
}

export function readV58Observation(path: string): NativeRefusal {
  const observation = JSON.parse(readV58File(path)) as NativeRefusal;
  assert.equal(observation.status, 'COMPILE-ERROR', path);
  assert.equal(observation.nativeCompilationObserved, true, path);
  assert.equal(createHash('sha256').update(observation.executedSource).digest('hex'), observation.executedSha256, path);
  assert.ok(
    observation.markers.some((marker) => marker.severity === 8),
    path,
  );
  return observation;
}

export function readV58Refusal(sourcePath: string, observationPath: string) {
  const source = readV58File(sourcePath);
  const observation = readV58Observation(observationPath);
  assert.equal(source, observation.executedSource, sourcePath);
  return { source, observation };
}

export function readV58PublishedLibrary(path: string, observation: NativeRefusal, importPath: string): string {
  const source = readV58File(path);
  assert.equal(observation.publication?.immutableImportPath, importPath);
  assert.equal(observation.publication?.sourceVerifiedAgainstTemplate, true);
  assert.equal(createHash('sha256').update(source).digest('hex'), observation.publication?.publishedSourceSha256);
  return source;
}
