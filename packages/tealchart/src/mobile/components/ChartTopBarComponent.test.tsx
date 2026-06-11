import type { UserDrawingState } from '../../drawings';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChartTopBarComponent } from './ChartTopBarComponent';

const baseDrawingState: UserDrawingState = {
  version: 1,
  activeTool: 'select',
  selection: null,
  draft: null,
  textEdit: null,
  drawings: [],
};

describe('ChartTopBarComponent drawing toolbar', () => {
  afterEach(() => {
    cleanup();
  });

  it('dispatches selected rectangle fill style controls without text controls', () => {
    const onStyle = vi.fn();
    render(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={{
          ...baseDrawingState,
          selection: { drawingId: 'rect' },
          drawings: [
            {
              id: 'rect',
              kind: 'rectangle',
              paneId: 'main',
              visible: true,
              locked: false,
              createdAt: 1,
              updatedAt: 1,
              style: {
                lineColor: '#f5c542',
                lineWidth: 1,
                lineStyle: 'solid',
                fillColor: 'rgba(245, 197, 66, 0.12)',
              },
              points: [
                { time: 1, price: 10 },
                { time: 2, price: 12 },
              ],
            },
          ],
        }}
        onUserDrawingStyleChange={onStyle}
      />,
    );

    fireEvent.click(screen.getByLabelText('Green fill color'));

    expect(onStyle).toHaveBeenCalledWith({ fillColor: 'rgba(34, 197, 94, 0.12)' });
    expect(screen.queryByLabelText('Green text color')).toBeNull();
  });

  it('dispatches selected text label fill, text color, and font size controls', () => {
    const onStyle = vi.fn();
    render(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={{
          ...baseDrawingState,
          selection: { drawingId: 'text' },
          drawings: [
            {
              id: 'text',
              kind: 'textLabel',
              paneId: 'main',
              visible: true,
              locked: false,
              createdAt: 1,
              updatedAt: 1,
              style: {
                lineColor: '#f5c542',
                lineWidth: 1,
                lineStyle: 'solid',
                fillColor: 'rgba(245, 197, 66, 0.12)',
                textColor: '#f5c542',
                fontSize: 12,
              },
              point: { time: 1, price: 10 },
              text: 'note',
              textAlign: 'center',
            },
          ],
        }}
        onUserDrawingStyleChange={onStyle}
      />,
    );

    fireEvent.click(screen.getByLabelText('Blue fill color'));
    fireEvent.click(screen.getByLabelText('Red text color'));
    fireEvent.click(screen.getByLabelText('16 pixel font size'));

    expect(onStyle).toHaveBeenCalledWith({ fillColor: 'rgba(56, 189, 248, 0.12)' });
    expect(onStyle).toHaveBeenCalledWith({ textColor: '#f43f5e' });
    expect(onStyle).toHaveBeenCalledWith({ fontSize: 16 });
  });

  it('disables locked selected drawing fill and text controls', () => {
    const onStyle = vi.fn();
    render(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={{
          ...baseDrawingState,
          selection: { drawingId: 'text' },
          drawings: [
            {
              id: 'text',
              kind: 'textLabel',
              paneId: 'main',
              visible: true,
              locked: true,
              createdAt: 1,
              updatedAt: 1,
              style: {
                lineColor: '#f5c542',
                lineWidth: 1,
                lineStyle: 'solid',
                fillColor: 'rgba(245, 197, 66, 0.12)',
                textColor: '#f5c542',
                fontSize: 12,
              },
              point: { time: 1, price: 10 },
              text: 'note',
              textAlign: 'center',
            },
          ],
        }}
        onUserDrawingStyleChange={onStyle}
      />,
    );

    fireEvent.click(screen.getByLabelText('Green fill color'));
    fireEvent.click(screen.getByLabelText('Red text color'));
    fireEvent.click(screen.getByLabelText('16 pixel font size'));

    expect((screen.getByLabelText('Green fill color') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Red text color') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('16 pixel font size') as HTMLButtonElement).disabled).toBe(true);
    expect(onStyle).not.toHaveBeenCalled();
  });
});
