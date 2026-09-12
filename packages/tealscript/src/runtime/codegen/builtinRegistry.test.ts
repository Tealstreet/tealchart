import { describe, expect, it } from 'vitest';
import { EXPORTABLE_BUILTIN_CONSTANTS } from '../../builtinMetadata';
import { getOfficialTradingViewLibrary } from '../../officialTradingViewLibraries';
import { builtinSignatureMapForCoverage } from '../../semantic/checker';
import {
  assertCompiledBuiltinRegistryDuplicateRejectedForCoverage,
  compiledBuiltinRegistryNamesForCoverage,
} from './execute';

const OFFICIAL_TRADINGVIEW_LIBRARY_PATHS = [
  'TradingView/Color/2',
  'TradingView/ValueAtTime/2',
  'TradingView/ta/1',
  'TradingView/ta/4',
  'TradingView/ta/7',
  'TradingView/ta/8',
  'TradingView/ta/9',
  'TradingView/ta/10',
  'TradingView/ta/12',
  'TradingView/ta/14',
];

function officialTradingViewRuntimeNames(): Set<string> {
  const names = new Set<string>();
  for (const path of OFFICIAL_TRADINGVIEW_LIBRARY_PATHS) {
    const library = getOfficialTradingViewLibrary(path);
    for (const fn of library?.functions.values() ?? []) {
      if (fn.runtimeName) names.add(fn.runtimeName);
    }
  }
  return names;
}

const DRAWING_ALL_REGISTRY_VALUES = new Set([
  'box.all',
  'label.all',
  'line.all',
  'linefill.all',
  'polyline.all',
  'table.all',
]);

describe('compiled builtin registry coverage', () => {
  it('keeps runtime registry entries aligned with semantic names, constants, and official runtime names', () => {
    const registryNames = compiledBuiltinRegistryNamesForCoverage();
    const signatureNames = new Set(Object.keys(builtinSignatureMapForCoverage()));
    const officialNames = officialTradingViewRuntimeNames();

    const unclassifiedRuntimeNames = registryNames.filter((name) => (
      !signatureNames.has(name)
      && !EXPORTABLE_BUILTIN_CONSTANTS.has(name)
      && !DRAWING_ALL_REGISTRY_VALUES.has(name)
      && !officialNames.has(name)
    ));

    expect(unclassifiedRuntimeNames).toEqual([]);
  });

  it('rejects duplicate compiled builtin registrations instead of overwriting silently', () => {
    expect(() => assertCompiledBuiltinRegistryDuplicateRejectedForCoverage('str.tostring')).toThrow(
      'Duplicate compiled builtin registration: str.tostring',
    );
  });
});
