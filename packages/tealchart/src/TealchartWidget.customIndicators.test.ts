import type { BuiltinIndicator } from './indicators/builtinIndicators';
import type { IndicatorInstance } from './state/chartState';

import { describe, expect, it, vi } from 'vitest';

import { PaneManager } from './rendering/PaneManager';
import { TealchartWidget } from './TealchartWidget';

const source: BuiltinIndicator = {
  id: 'custom-source',
  name: 'Saved source',
  category: 'other',
  overlay: false,
  code: 'plot(close)',
  sourceKind: 'custom_tealchart_study',
  sourceId: 'source-row',
  sourceHash: 'v1',
};

function appliedWidget() {
  let instances: IndicatorInstance[] = [true, false].map((isVisible, index) => ({
    id: `instance-${index}`,
    builtinId: source.id,
    name: source.name,
    sourceKind: source.sourceKind,
    sourceId: source.sourceId,
    sourceHash: source.sourceHash,
    inputs: { length: 10 + index },
    styleOverrides: [{ plotId: 'plot-0', color: '#abcdef' }],
    isVisible,
    createdAt: index,
  }));
  const studies = new Map(
    instances.map((instance, index) => [
      `study-${index}`,
      {
        name: source.name,
        inputs: { length: 20 + index },
        isVisible: instance.isVisible,
        isOverlay: false,
      },
    ]),
  );
  const visibility = new Map([...studies].map(([id, study]) => [id, study.isVisible]));
  const manager = {
    addScript: vi.fn((id: string, _code: string, _inputs: Record<string, unknown>) => {
      visibility.set(id, true);
      return Promise.resolve();
    }),
    setScriptVisibility: vi.fn((id: string, visible: boolean) => visibility.set(id, visible)),
  };
  const paneManager = new PaneManager();
  for (const id of studies.keys()) paneManager.addIndicator({ indicatorId: id, overlay: false });
  const config = new Map([...studies.keys()].map((id) => [id, source]));
  const internals = {
    _customTealscriptIndicators: [source],
    _options: {},
    _disposed: false,
    _indicatorRestoreGeneration: 0,
    _jailbreakInstanceIds: new Set(),
    _tealScriptManager: manager,
    _chartApi: {
      getStudies: () => studies,
      getAllStudies: () => [...studies.keys()].map((id) => ({ id })),
      removeStudy: vi.fn((id: string) => {
        studies.delete(id);
        config.delete(id);
      }),
      getStudyById: (id: string) => (studies.has(id) ? { getInputs: () => studies.get(id)!.inputs } : null),
    },
    _indicatorStudyMap: new Map(instances.map((instance, index) => [instance.id, `study-${index}`])),
    _studyInstanceMap: new Map([...studies.keys()].map((id, index) => [id, `instance-${index}`])),
    _indicatorConfigMap: config,
    _indicatorDeclarationMap: new Map(),
    _paneManager: paneManager,
    _chartStore: {
      settings: {
        get: () => ({ indicators: instances }),
        setKey: (_key: string, value: IndicatorInstance[]) => {
          instances = value;
        },
      },
    },
    _ui: { setAvailableIndicators: vi.fn(), setAdditionalIndicatorCategories: vi.fn() },
    _markDirty: vi.fn(),
    _scheduler: { markDirty: vi.fn() },
    _logger: { error: vi.fn() },
  };
  const widget = Object.assign(Object.create(TealchartWidget.prototype), internals) as TealchartWidget;
  return { widget, internals, manager, studies, visibility, config, paneManager, instances: () => instances };
}

describe('TealchartWidget applied custom source updates', () => {
  it.each(['layout replacement', 'disposal'] as const)(
    'retires a pending add after %s without writing settings or mappings',
    async (boundary) => {
      const state = appliedWidget();
      let finish!: (study: { getId: () => string }) => void;
      Object.assign(state.internals._chartApi, {
        createStudy: () =>
          new Promise<{ getId: () => string }>((resolve) => {
            finish = resolve;
          }),
      });
      const lifecycle = state.widget as unknown as {
        _handleAddIndicator: (definition: BuiltinIndicator) => void;
        _replaceRuntimeIndicators: (instances: IndicatorInstance[]) => void;
        _disposed: boolean;
      };
      lifecycle._handleAddIndicator(source);
      if (boundary === 'layout replacement') {
        lifecycle._replaceRuntimeIndicators([]);
        state.internals._chartStore.settings.setKey('indicators', []);
      } else {
        lifecycle._disposed = true;
        state.internals._indicatorStudyMap.clear();
        state.internals._studyInstanceMap.clear();
        state.config.clear();
        state.paneManager.reset();
      }
      const settings = state.instances();
      state.internals._chartApi.removeStudy.mockClear();
      state.studies.set('pending-study', { name: source.name, inputs: { length: 33 }, isVisible: true, isOverlay: false });
      finish({ getId: () => 'pending-study' });
      await Promise.resolve();
      expect(state.internals._chartApi.removeStudy).toHaveBeenCalledWith('pending-study');
      expect(state.instances()).toBe(settings);
      expect(state.internals._indicatorStudyMap.size).toBe(0);
      expect(state.internals._studyInstanceMap.size).toBe(0);
      expect(state.config.has('pending-study')).toBe(false);
    },
  );

  it('reconciles the latest saved source when an earlier add request finishes', async () => {
    const state = appliedWidget();
    const edited = { ...source, code: 'plot(high)', sourceHash: 'v2' };
    let finish!: (study: { getId: () => string }) => void;
    Object.assign(state.internals._chartApi, {
      createStudy: () =>
        new Promise<{ getId: () => string }>((resolve) => {
          finish = resolve;
        }),
    });
    (state.widget as unknown as { _handleAddIndicator: (definition: BuiltinIndicator) => void })._handleAddIndicator(
      source,
    );
    state.widget.setCustomTealscriptIndicators([edited]);
    state.studies.set('pending-study', {
      name: source.name,
      inputs: { length: 33 },
      isVisible: true,
      isOverlay: false,
    });
    finish({ getId: () => 'pending-study' });
    await vi.waitFor(() =>
      expect(state.manager.addScript).toHaveBeenCalledWith('pending-study', edited.code, { length: 33 }),
    );
    expect(state.instances()).toHaveLength(3);
    expect(state.instances()[2].sourceHash).toBe('v2');
    expect(state.config.get('pending-study')?.code).toBe(edited.code);
    expect(state.internals._studyInstanceMap.get('pending-study')).toBe(state.instances()[2].id);
  });

  it('recompiles every existing instance while preserving IDs, live inputs, styles, visibility and panes', () => {
    const state = appliedWidget();
    const before = state.instances();
    const panes = structuredClone(state.paneManager.getIndicatorPanes());
    const edited = {
      ...source,
      id: 'renamed-catalog-id',
      code: 'plot(close * 2)',
      name: 'Edited source',
      sourceHash: 'v2',
    };
    state.widget.setCustomTealscriptIndicators([edited]);

    expect(state.manager.addScript.mock.calls).toEqual([
      ['study-0', edited.code, { length: 20 }],
      ['study-1', edited.code, { length: 21 }],
    ]);
    expect([...state.visibility]).toEqual([
      ['study-0', true],
      ['study-1', false],
    ]);
    expect(state.paneManager.getIndicatorPanes()).toEqual(panes);
    expect([...state.studies.values()].map((study) => study.name)).toEqual([edited.name, edited.name]);
    expect(state.instances()).toEqual(
      before.map((instance) => ({
        ...instance,
        name: edited.name,
        builtinId: edited.id,
        sourceHash: edited.sourceHash,
      })),
    );
    state.widget.setCustomTealscriptIndicators([edited]);
    expect(state.manager.addScript).toHaveBeenCalledTimes(2);
  });

  it('updates metadata without restarting unchanged code, and moves panes only for an explicit overlay change', () => {
    const state = appliedWidget();
    state.widget.setCustomTealscriptIndicators([{ ...source, name: 'Renamed', sourceHash: 'v2' }]);
    expect(state.manager.addScript).not.toHaveBeenCalled();
    expect(state.instances().map((instance) => instance.sourceHash)).toEqual(['v2', 'v2']);
    const panes = structuredClone(state.paneManager.getIndicatorPanes());
    state.widget.setCustomTealscriptIndicators([{ ...source, code: 'plot(high)', overlay: true }]);
    expect(state.manager.addScript).toHaveBeenCalledTimes(2);
    expect(state.paneManager.getIndicatorPanes()).toEqual([]);
    expect([...state.studies.values()].every((study) => study.isOverlay)).toBe(true);
    expect(panes).toHaveLength(2);
  });

  it('leaves built-in instances and missing sources untouched, and reports recompilation failures', async () => {
    const state = appliedWidget();
    const reportError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const workerError = new Error('worker failed');
    state.instances()[1].sourceKind = 'builtin';
    state.manager.addScript.mockRejectedValueOnce(workerError);
    state.widget.setCustomTealscriptIndicators([{ ...source, code: 'plot(high)' }]);
    expect(state.manager.addScript).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(reportError).toHaveBeenCalledWith('Failed to update indicator Saved source', workerError));
    state.widget.setCustomTealscriptIndicators([]);
    expect(state.manager.addScript).toHaveBeenCalledTimes(1);
    expect(state.instances()).toHaveLength(2);
  });
});
