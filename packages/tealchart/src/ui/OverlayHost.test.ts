import { fireEvent } from '@testing-library/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';
import { IndicatorSettingsModal } from './IndicatorSettingsModal';
import { ContextMenu } from './ContextMenu';
import { ChartSettingsModal } from './ChartSettingsModal';
import { ChartTopBar } from './ChartTopBar';
import { LayoutSelector } from './LayoutSelector';
import { IndicatorsModal } from './IndicatorsModal';
import { BUILTIN_INDICATORS } from '../indicators/builtinIndicators';
import { DEFAULT_CHART_SETTINGS } from '../state/chartState';
import { UserDrawingObjectTreePanel } from './UserDrawingObjectTreePanel';
import { UserDrawingPropertiesPanel } from './UserDrawingPropertiesPanel';
import { resolveUserDrawingObjectTreeModel, resolveUserDrawingPropertiesSurface, type UserDrawingState } from '../drawings';
import type { WebOverlayEnvironment, WebOverlayHost, WebOverlayHostFactory, WebOverlayInput } from './OverlayHost';

const owned: Array<() => void> = [];
function fixture() {
  const frame = document.createElement('iframe');
  const source = document.createElement('div');
  document.body.append(source, frame);
  const target = frame.contentWindow!;
  let admit!: (environment: WebOverlayEnvironment) => void;
  const listeners = new Set<(input: WebOverlayInput) => void>();
  const host: WebOverlayHost = {
    surfaceId: 'hosted-chart-ui',
    ready: new Promise((resolve) => { admit = resolve; }),
    sourcePoint: (point) => ({ x: point.clientX, y: point.clientY }),
    sourceRect: () => ({ x: 20, y: 30, width: 500, height: 360 }),
    setContent: vi.fn(), setActive: vi.fn(), dispose: vi.fn(),
    subscribeInput: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
  const factory = vi.fn<WebOverlayHostFactory>(() => host);
  const environment: WebOverlayEnvironment = {
    document: target.document, window: target, sourceWindow: window, portalRoot: target.document.body,
    sourcePoint: (point) => ({ x: point.clientX + 10, y: point.clientY + 15 }),
    targetPoint: (point) => ({ x: point.x - 10, y: point.y - 15 }), getZoom: () => 1,
  };
  return { host, source, factory, target, admit: () => admit(environment),
    input: (input: WebOverlayInput) => listeners.forEach((listener) => listener(input)),
    fail: (error: string) => factory.mock.calls.at(-1)![0].onError(error) };
}

afterEach(() => { owned.splice(0).forEach((dispose) => dispose()); document.body.replaceChildren(); vi.restoreAllMocks(); });

describe('original chart UI adopted overlays', () => {
  it('retires constructor-time host failures after caller ownership is assigned and allows reopening', async () => {
    const f = fixture();
    const failure = vi.fn<WebOverlayHostFactory>(() => { throw new Error('Native admission failed'); });
    const closed = vi.fn();
    const menu = new ContextMenu({ overlayHost: failure, source: f.source, x: 100, y: 120,
      items: [{ position: 'top', text: 'Original item', click: vi.fn() }], onClose: () => { closed(); menu.close(); } });
    expect(closed).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(closed).toHaveBeenCalledOnce();
    expect(f.source.querySelector('[role="alert"]')?.textContent).toContain('Native admission failed');
    const state: UserDrawingState = { version: 1, activeTool: 'select', selection: null, draft: null, textEdit: null, drawings: [] };
    let panel: UserDrawingPropertiesPanel | null;
    const panelClosed = vi.fn();
    panel = new UserDrawingPropertiesPanel({ source: f.source, overlayHost: failure, surface: resolveUserDrawingPropertiesSurface(state),
      onDispatch: vi.fn(() => true), onClose: () => { panelClosed(); panel = null; } });
    expect(panel).not.toBeNull();
    await Promise.resolve();
    expect(panel).toBeNull();
    expect(panelClosed).toHaveBeenCalledOnce();
    let tree: UserDrawingObjectTreePanel | null;
    const treeClosed = vi.fn();
    tree = new UserDrawingObjectTreePanel({ parent: f.source, overlayHost: failure, model: resolveUserDrawingObjectTreeModel(state),
      onDispatch: vi.fn(() => true), onClose: () => { treeClosed(); tree = null; } });
    expect(tree).not.toBeNull();
    await Promise.resolve();
    expect(tree).toBeNull();
    expect(treeClosed).toHaveBeenCalledOnce();
    const retry = new ContextMenu({ overlayHost: f.factory, source: f.source, x: 100, y: 120,
      items: [{ position: 'top', text: 'Original item', click: vi.fn() }] });
    owned.push(() => retry.close());
    f.admit();
    await f.host.ready;
    expect(retry.getElement().ownerDocument).toBe(f.target.document);
  });

  it('maps a nested interval anchor once and follows source scroll, resize and measured row changes', async () => {
    const f = fixture();
    const sourceFrame = document.createElement('iframe');
    document.body.append(sourceFrame);
    const sourceWindow = sourceFrame.contentWindow!;
    sourceWindow.document.body.append(f.source);
    f.host.sourcePoint = (point) => ({ x: point.clientX + 200, y: point.clientY + 100 });
    let resize!: () => void;
    const observe = vi.fn();
    const disconnect = vi.fn();
    Object.defineProperty(sourceWindow, 'ResizeObserver', { configurable: true, value: class {
      constructor(callback: () => void) { resize = callback; }
      observe = observe;
      disconnect = disconnect;
    } });
    const topBar = new ChartTopBar({ chartKey: 'nested-native-interval', symbol: 'BTCUSDT', overlayHost: f.factory });
    owned.push(() => topBar.unmount());
    topBar.mount(f.source);
    let anchor = sourceWindow.document.querySelector<HTMLButtonElement>('[aria-label="Select interval"]')!;
    let left = 40, bottom = 50;
    anchor.click();
    anchor = sourceWindow.document.querySelector<HTMLButtonElement>('[aria-label="Select interval"]')!;
    vi.spyOn(anchor, 'getBoundingClientRect').mockImplementation(() => ({ left, bottom, top: bottom - 30, right: left + 20, width: 20, height: 30 } as DOMRect));
    f.admit();
    await f.host.ready;
    const popup = f.target.document.querySelector<HTMLElement>('[role="menu"]')!;
    expect(anchor.ownerDocument).toBe(sourceWindow.document);
    expect(popup.style.left).toBe('230px');
    expect(popup.style.top).toBe('139px');
    expect(observe).toHaveBeenCalledWith(anchor);
    left = 60; bottom = 70;
    sourceWindow.dispatchEvent(new Event('scroll'));
    expect(popup.style.left).toBe('250px');
    expect(popup.style.top).toBe('159px');
    left = 80;
    window.dispatchEvent(new Event('resize'));
    expect(popup.style.left).toBe('270px');
    left = 90;
    resize();
    expect(popup.style.left).toBe('280px');
    topBar.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    left = 100;
    sourceWindow.dispatchEvent(new Event('scroll'));
    expect(popup.style.left).toBe('280px');
  });

  it('keeps the original indicator picker search and selection in its host', async () => {
    const f = fixture();
    const selected = vi.fn();
    const indicator = BUILTIN_INDICATORS.find((item) => item.id === 'sma')!;
    const modal = new IndicatorsModal({ indicators: [indicator], onSelectIndicator: selected });
    owned.push(() => modal.unmount());
    modal.setOverlayHost(f.factory);
    modal.mount(f.source);
    modal.open();
    f.admit();
    await f.host.ready;
    const search = f.target.document.querySelector('input')!;
    fireEvent.input(search, { target: { value: 'absent indicator' } });
    expect(f.target.document.body.textContent).toContain('No indicators found');
    fireEvent.input(search, { target: { value: '' } });
    const name = Array.from(f.target.document.querySelectorAll('div')).find((element) => element.textContent === indicator.name)!;
    fireEvent.click(name);
    expect(selected).toHaveBeenCalledExactlyOnceWith(indicator);
  });

  it('saves chart settings through the original control context after adoption', async () => {
    const f = fixture();
    const setSetting = vi.fn();
    const dirty = vi.fn();
    const modal = new ChartSettingsModal({ getSettings: () => DEFAULT_CHART_SETTINGS,
      setSetting, setChartProperties: vi.fn(), markLayoutDirty: dirty });
    owned.push(() => modal.unmount());
    modal.setOverlayHost(f.factory);
    modal.mount(f.source);
    modal.open();
    f.admit();
    await f.host.ready;
    const control = f.target.document.querySelector<HTMLInputElement>('[data-control-id="showVolume"] input')!;
    fireEvent.click(control);
    expect(setSetting).toHaveBeenCalledExactlyOnceWith('showVolume', !DEFAULT_CHART_SETTINGS.showVolume);
    expect(dirty).toHaveBeenCalledOnce();
    modal.close();
    modal.open();
    await Promise.resolve();
    const reopened = f.target.document.querySelector<HTMLInputElement>('[data-control-id="showVolume"] input')!;
    expect(reopened).not.toBe(control);
    expect(f.target.document.activeElement).toBe(reopened);
  });

  it('loads the original saved layout list and actions inside the admitted modal', async () => {
    const f = fixture();
    const load = vi.fn();
    const selector = new LayoutSelector({ getAllLayouts: async () => [{ id: 0, name: 'Original Layout', symbol: 'BTCUSDT', isTealchart: true }],
      onLoad: load, onSave: vi.fn(), onSaveAs: vi.fn(), onDelete: vi.fn(), onRename: vi.fn() });
    owned.push(() => selector.dispose());
    selector.setOverlayHost(f.factory);
    selector.mount(f.source);
    selector.open();
    f.admit();
    await f.host.ready;
    await Promise.resolve();
    const name = Array.from(f.target.document.querySelectorAll('span')).find((element) => element.textContent === 'Original Layout')!;
    fireEvent.click(name);
    expect(load).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('retains original drawing properties and object tree dispatchers and geometry', async () => {
    const state: UserDrawingState = { version: 1, activeTool: 'select', selection: { drawingId: 'line' }, draft: null, textEdit: null,
      drawings: [{ id: 'line', name: 'Original line', kind: 'horizontalLine', paneId: 'main', visible: true, locked: false,
        createdAt: 1, updatedAt: 1, style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' }, price: 50 }] };
    const f = fixture();
    const dispatch = vi.fn(() => true);
    const panel = new UserDrawingPropertiesPanel({ surface: resolveUserDrawingPropertiesSurface(state), onDispatch: dispatch,
      overlayHost: f.factory, source: f.source });
    owned.push(() => panel.close());
    f.admit();
    await f.host.ready;
    const original = panel.getElement();
    expect(original.ownerDocument).toBe(f.target.document);
    const action = f.target.document.querySelector<HTMLButtonElement>('[data-tealchart-user-drawing-properties-controls="line"] button')!;
    fireEvent.click(action);
    expect(dispatch).toHaveBeenCalledOnce();
    const treeFixture = fixture();
    const treeDispatch = vi.fn(() => true);
    const tree = new UserDrawingObjectTreePanel({ model: resolveUserDrawingObjectTreeModel(state), parent: treeFixture.source,
      onDispatch: treeDispatch, overlayHost: treeFixture.factory });
    owned.push(() => tree.close());
    treeFixture.admit();
    await treeFixture.host.ready;
    expect(tree.getElement().ownerDocument).toBe(treeFixture.target.document);
    expect(tree.getElement().style.left).toBe('174px');
    expect(tree.getElement().style.top).toBe('71px');
    const row = treeFixture.target.document.querySelector<HTMLElement>('[aria-label="Select Original line"]')!;
    fireEvent.click(row);
    expect(treeDispatch).toHaveBeenCalledOnce();
  });

  it('moves the original modal and edited DOM into the host, preserving callbacks and chart containment', async () => {
    const f = fixture();
    const closed = vi.fn();
    const edited = vi.fn();
    const modal = new Modal({ onClose: closed, width: 320 });
    owned.push(() => modal.unmount());
    modal.setOverlayHost(f.factory);
    modal.mount(f.source);
    const element = modal.getElement();
    const input = document.createElement('input');
    input.value = 'original draft';
    input.addEventListener('input', edited);
    modal.getContentElement().append(input);
    modal.open();
    expect(f.source.querySelector('[role="dialog"]')).toBeNull();
    f.admit();
    await f.host.ready;
    expect(modal.getElement()).toBe(element);
    expect(element.ownerDocument).toBe(f.target.document);
    expect(element.style.left).toBe('10px');
    expect(element.style.top).toBe('15px');
    expect(element.style.width).toBe('500px');
    expect(element.style.height).toBe('360px');
    expect(input.value).toBe('original draft');
    expect(f.target.document.activeElement).toBe(input);
    fireEvent.input(input, { target: { value: 'edited draft' } });
    expect(edited).toHaveBeenCalledTimes(1);
    f.input({ type: 'keydown', inside: true, sourceId: 'nested-popup', event: new KeyboardEvent('keydown', { key: 'Escape' }) });
    await Promise.resolve();
    expect(modal.isOpen()).toBe(true);
    f.input({ type: 'keydown', inside: true, event: new KeyboardEvent('keydown', { key: 'Escape' }) });
    await Promise.resolve();
    expect(modal.isOpen()).toBe(false);
    expect(f.host.setActive).toHaveBeenLastCalledWith(false);
    expect(closed).toHaveBeenCalledTimes(1);
    modal.open();
    expect(modal.getElement()).toBe(element);
    expect(input.value).toBe('edited draft');
    expect(f.factory).toHaveBeenCalledTimes(1);
  });

  it('keeps a pending closed modal hidden and cancels admission if its original owner unmounts', async () => {
    const f = fixture();
    const modal = new Modal();
    modal.setOverlayHost(f.factory);
    modal.mount(f.source);
    modal.open();
    modal.close();
    f.admit();
    await f.host.ready;
    expect(modal.getElement().style.display).toBe('none');
    expect(f.host.setActive).toHaveBeenLastCalledWith(false);
    modal.unmount();
    expect(f.host.dispose).toHaveBeenCalledTimes(1);
    const cancelled = fixture();
    const abandoned = new Modal();
    abandoned.setOverlayHost(cancelled.factory);
    abandoned.mount(cancelled.source);
    abandoned.open();
    abandoned.unmount();
    cancelled.admit();
    await cancelled.host.ready;
    expect(cancelled.host.setContent).not.toHaveBeenCalled();
    expect(abandoned.getElement().isConnected).toBe(false);
  });

  it('uses the original indicator settings form and saves typed input through its owner callback', async () => {
    const f = fixture();
    const saved = vi.fn();
    const modal = new IndicatorSettingsModal();
    owned.push(() => modal.unmount());
    modal.setOverlayHost(f.factory);
    modal.mount(f.source);
    modal.openWith({ id: 'study-1', name: 'Study', inputs: { length: 14 } },
      [{ id: 'length', title: 'Length', type: 'int', defval: 14 }], [], undefined, saved);
    const element = modal.getElement();
    f.admit();
    await f.host.ready;
    const input = f.target.document.querySelector<HTMLInputElement>('input[type="number"]')!;
    fireEvent.input(input, { target: { value: '21' } });
    fireEvent.change(input, { target: { value: '21' } });
    const apply = [...f.target.document.querySelectorAll('button')].find((button) => button.textContent === 'Apply')!;
    fireEvent.click(apply);
    expect(saved).toHaveBeenCalledWith({ length: 21 }, []);
    expect(modal.getElement()).toBe(element);
    modal.close();
    modal.openWith({ id: 'study-1', name: 'Study', inputs: { length: 34 } },
      [{ id: 'length', title: 'Length', type: 'int', defval: 14 }], [], undefined, saved);
    await Promise.resolve();
    const reopened = f.target.document.querySelector<HTMLInputElement>('input[type="number"]')!;
    expect(reopened).not.toBe(input);
    expect(reopened.value).toBe('34');
    expect(f.target.document.activeElement).toBe(reopened);
    expect(f.factory).toHaveBeenCalledOnce();
  });

  it('returns the original menu immediately and dispatches an adopted item once', async () => {
    const f = fixture();
    const action = vi.fn();
    const closed = vi.fn();
    const menu = new ContextMenu({ overlayHost: f.factory, source: f.source, x: 100, y: 120,
      items: [{ text: 'Original action', position: 'top', click: action }], onClose: closed });
    owned.push(() => menu.close());
    const element = menu.getElement();
    expect(element.isConnected).toBe(false);
    f.admit();
    await f.host.ready;
    expect(menu.getElement()).toBe(element);
    expect(element.ownerDocument).toBe(f.target.document);
    expect(element.style.left).toBe('90px');
    expect(element.style.top).toBe('105px');
    f.input({ type: 'pointerdown', inside: true, event: new MouseEvent('pointerdown') });
    expect(closed).not.toHaveBeenCalled();
    fireEvent.click(element.querySelector('div')!);
    expect(action).toHaveBeenCalledTimes(1);
    expect(closed).toHaveBeenCalledTimes(1);
    expect(f.host.dispose).toHaveBeenCalledTimes(1);
  });

  it('reports an admission error and cancels its original pending UI', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const f = fixture();
    const modal = new Modal();
    modal.setOverlayHost(f.factory);
    modal.mount(f.source);
    modal.open();
    f.fail('admission failed');
    expect(f.source.querySelector('[role="alert"]')?.textContent).toBe('Chart overlay failed: admission failed');
    expect(modal.isOpen()).toBe(false);
    expect(f.host.dispose).toHaveBeenCalledTimes(1);
    f.admit();
    await f.host.ready;
    expect(modal.getElement().isConnected).toBe(false);
    modal.unmount();
  });
});
