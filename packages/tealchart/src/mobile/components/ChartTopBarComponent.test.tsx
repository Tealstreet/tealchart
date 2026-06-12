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

  it('dispatches selected drawing actions from shared toolbar descriptors', () => {
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    const onClear = vi.fn();
    const onZOrder = vi.fn();
    render(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={{
          ...baseDrawingState,
          activeTool: 'trendLine',
          selection: { drawingId: 'h' },
          draft: {
            tool: 'trendLine',
            paneId: 'main',
            anchors: [{ time: 1, price: 10 }],
            style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
            startedAt: 1,
          },
          drawings: [
            {
              id: 'back',
              kind: 'horizontalLine',
              paneId: 'main',
              visible: true,
              locked: false,
              createdAt: 1,
              updatedAt: 1,
              style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
              price: 8,
            },
            {
              id: 'h',
              kind: 'horizontalLine',
              paneId: 'main',
              visible: true,
              locked: false,
              createdAt: 1,
              updatedAt: 1,
              style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
              price: 10,
            },
            {
              id: 'front',
              kind: 'horizontalLine',
              paneId: 'main',
              visible: true,
              locked: false,
              createdAt: 1,
              updatedAt: 1,
              style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
              price: 12,
            },
          ],
        }}
        onUserDrawingDuplicateSelected={onDuplicate}
        onUserDrawingDeleteSelected={onDelete}
        onUserDrawingCancelDraft={onCancel}
        onUserDrawingClearAll={onClear}
        onUserDrawingZOrderChange={onZOrder}
      />,
    );

    fireEvent.click(screen.getByLabelText('Duplicate selected drawing'));
    fireEvent.click(screen.getByLabelText('Delete selected drawing'));
    fireEvent.click(screen.getByLabelText('Bring selected drawing forward'));
    fireEvent.click(screen.getByLabelText('Send selected drawing backward'));
    fireEvent.click(screen.getByLabelText('Bring selected drawing to front'));
    fireEvent.click(screen.getByLabelText('Send selected drawing to back'));
    fireEvent.click(screen.getByLabelText('Cancel draft drawing'));
    fireEvent.click(screen.getByLabelText('Clear all drawings'));

    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onZOrder).toHaveBeenCalledWith('bringForward');
    expect(onZOrder).toHaveBeenCalledWith('sendBackward');
    expect(onZOrder).toHaveBeenCalledWith('bringToFront');
    expect(onZOrder).toHaveBeenCalledWith('sendToBack');
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
    fireEvent.click(screen.getByLabelText('75 percent opacity'));
    fireEvent.click(screen.getByLabelText('Toggle drawing border'));
    fireEvent.click(screen.getByLabelText('Toggle drawing fill'));

    expect(onStyle).toHaveBeenCalledWith({ fillColor: 'rgba(34, 197, 94, 0.12)' });
    expect(onStyle).toHaveBeenCalledWith({ opacity: 0.75 });
    expect(onStyle).toHaveBeenCalledWith({ lineVisible: false });
    expect(onStyle).toHaveBeenCalledWith({ fillVisible: false });
    expect(screen.queryByLabelText('Green text color')).toBeNull();
  });

  it('dispatches selected icon library controls without text controls', () => {
    const onIconName = vi.fn();
    render(
      <ChartTopBarComponent
        symbol="BTCUSDT"
        interval="1"
        userDrawingState={{
          ...baseDrawingState,
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
              style: {
                lineColor: '#f5c542',
                lineWidth: 1,
                lineStyle: 'solid',
                fillColor: 'rgba(245, 197, 66, 0.12)',
              },
              point: { time: 1, price: 10 },
              iconName: 'star',
            },
          ],
        }}
        onUserDrawingIconNameChange={onIconName}
      />,
    );

    fireEvent.click(screen.getByLabelText('Arrow up icon'));

    expect(onIconName).toHaveBeenCalledWith('arrowUp');
    expect(screen.queryByLabelText('Green text color')).toBeNull();
  });

  it('dispatches selected text label fill, text color, and font size controls', () => {
    const onStyle = vi.fn();
    const onTextAlign = vi.fn();
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
        onUserDrawingTextAlignChange={onTextAlign}
      />,
    );

    fireEvent.click(screen.getByLabelText('Blue fill color'));
    fireEvent.click(screen.getByLabelText('Red text color'));
    fireEvent.click(screen.getByLabelText('16 pixel font size'));
    fireEvent.click(screen.getByLabelText('monospace font family'));
    fireEvent.click(screen.getByLabelText('Bold text'));
    fireEvent.click(screen.getByLabelText('Right text alignment'));

    expect(onStyle).toHaveBeenCalledWith({ fillColor: 'rgba(56, 189, 248, 0.12)' });
    expect(onStyle).toHaveBeenCalledWith({ textColor: '#f43f5e' });
    expect(onStyle).toHaveBeenCalledWith({ fontSize: 16 });
    expect(onStyle).toHaveBeenCalledWith({ fontFamily: 'monospace' });
    expect(onStyle).toHaveBeenCalledWith({ fontWeight: 'bold' });
    expect(onTextAlign).toHaveBeenCalledWith('right');
  });

  it('disables locked selected drawing fill and text controls', () => {
    const onStyle = vi.fn();
    const onTextAlign = vi.fn();
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
        onUserDrawingTextAlignChange={onTextAlign}
      />,
    );

    fireEvent.click(screen.getByLabelText('Green fill color'));
    fireEvent.click(screen.getByLabelText('75 percent opacity'));
    fireEvent.click(screen.getByLabelText('Toggle drawing border'));
    fireEvent.click(screen.getByLabelText('Toggle drawing fill'));
    fireEvent.click(screen.getByLabelText('Red text color'));
    fireEvent.click(screen.getByLabelText('16 pixel font size'));
    fireEvent.click(screen.getByLabelText('monospace font family'));
    fireEvent.click(screen.getByLabelText('Right text alignment'));

    expect((screen.getByLabelText('Green fill color') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('75 percent opacity') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Toggle drawing border') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Toggle drawing fill') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Red text color') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('16 pixel font size') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('monospace font family') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Right text alignment') as HTMLButtonElement).disabled).toBe(true);
    expect(onStyle).not.toHaveBeenCalled();
    expect(onTextAlign).not.toHaveBeenCalled();
  });
});
