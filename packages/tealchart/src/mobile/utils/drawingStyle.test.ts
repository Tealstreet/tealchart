import type { UserDrawingState } from '../../drawings';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../../state/chartState';
import {
  setMobileUserDrawingIconName,
  setMobileUserDrawingImageSource,
  setMobileUserDrawingLocked,
  setMobileUserDrawingTextAlign,
  setMobileUserDrawingVisibility,
  updateMobileUserDrawingStyle,
} from './drawingStyle';

const state: UserDrawingState = {
  version: 1,
  activeTool: 'select',
  selection: { drawingId: 'line' },
  draft: null,
  textEdit: null,
  drawings: [
    {
      id: 'line',
      kind: 'horizontalLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: {
        lineColor: '#f5c542',
        lineWidth: 1,
        lineStyle: 'solid',
      },
      price: 100,
    },
  ],
};

describe('mobile drawing style helpers', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('updates selected drawing style through the shared reducer contract', () => {
    const updated = updateMobileUserDrawingStyle(state, { lineColor: '#00ffcc', lineStyle: 'dashed' }, { now: () => 10 });

    expect(updated.drawings[0]).toMatchObject({
      updatedAt: 10,
      style: expect.objectContaining({
        lineColor: '#00ffcc',
        lineStyle: 'dashed',
      }),
    });
  });

  it('toggles visibility and lock state while clearing invalid selection', () => {
    const hidden = setMobileUserDrawingVisibility(state, false, { now: () => 20 });
    expect(hidden.drawings[0]).toMatchObject({ visible: false, updatedAt: 20 });
    expect(hidden.selection).toBeNull();

    const locked = setMobileUserDrawingLocked(state, true, { now: () => 30 });
    expect(locked.drawings[0]).toMatchObject({ locked: true, updatedAt: 30 });
    expect(locked.selection).toBeNull();
  });

  it('updates selected text label alignment through the shared reducer contract', () => {
    const textState: UserDrawingState = {
      ...state,
      selection: { drawingId: 'label' },
      drawings: [
        {
          id: 'label',
          kind: 'textLabel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: state.drawings[0]!.style,
          point: { time: 1, price: 100 },
          text: 'Note',
          textAlign: 'left',
        },
      ],
    };

    expect(setMobileUserDrawingTextAlign(textState, 'right', { now: () => 40 }).drawings[0]).toMatchObject({
      textAlign: 'right',
      updatedAt: 40,
    });
    expect(setMobileUserDrawingTextAlign(state, 'right')).toBe(state);
  });

  it('updates selected icon name through the shared reducer contract', () => {
    const iconState: UserDrawingState = {
      ...state,
      selection: { drawingId: 'icon' },
      drawings: [
        {
          id: 'icon',
          kind: 'icon',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: state.drawings[0]!.style,
          point: { time: 1, price: 100 },
          iconName: 'star',
        },
      ],
    };

    expect(setMobileUserDrawingIconName(iconState, 'arrowDown', { now: () => 50 }).drawings[0]).toMatchObject({
      iconName: 'arrowDown',
      updatedAt: 50,
    });
    expect(setMobileUserDrawingIconName(state, 'arrowDown')).toBe(state);
  });

  it('updates selected image sources through the shared reducer contract', () => {
    const imageState: UserDrawingState = {
      ...state,
      selection: { drawingId: 'image' },
      drawings: [
        {
          id: 'image',
          kind: 'image',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: state.drawings[0]!.style,
          points: [
            { time: 1, price: 100 },
            { time: 2, price: 110 },
          ],
          src: '',
          alt: 'Image',
        },
      ],
    };

    expect(
      setMobileUserDrawingImageSource(
        imageState,
        { src: 'https://example.test/mobile.png', alt: 'Mobile chart' },
        { now: () => 60 },
      ).drawings[0],
    ).toMatchObject({
      src: 'https://example.test/mobile.png',
      alt: 'Mobile chart',
      updatedAt: 60,
    });
    expect(setMobileUserDrawingImageSource(state, { src: 'ignored.png' })).toBe(state);
  });

  it('requires explicit opt-in for locked drawing property changes', () => {
    const lockedState: UserDrawingState = {
      ...state,
      selection: null,
      drawings: [{ ...state.drawings[0]!, locked: true }],
    };

    expect(setMobileUserDrawingVisibility(lockedState, false, { drawingId: 'line' })).toBe(lockedState);
    expect(setMobileUserDrawingLocked(lockedState, false, { drawingId: 'line' })).toBe(lockedState);
    expect(
      setMobileUserDrawingVisibility(lockedState, false, { drawingId: 'line', includeLocked: true }).drawings[0],
    ).toMatchObject({ visible: false });
    expect(
      setMobileUserDrawingLocked(lockedState, false, { drawingId: 'line', includeLocked: true }).drawings[0],
    ).toMatchObject({ locked: false });
  });
});
