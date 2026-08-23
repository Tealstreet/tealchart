import type { ComponentProps } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AVAILABLE_TIMEFRAMES } from '../../state/chartState';
import { createNativeTopBarLayout } from '../utils/topBarLayout';
import { NativeTopBarOverlayImpl } from './NativeTopBarOverlay';

const textWidth = (text: string) => text.length * 7;

function createLayout(options: { timeframeMenuEnabled?: boolean } = {}) {
  return createNativeTopBarLayout({
    width: 390,
    height: 36,
    symbol: 'BTC-USD',
    interval: '15',
    timeframes: AVAILABLE_TIMEFRAMES.filter((timeframe) => ['1', '5', '15', '30', '60'].includes(timeframe.value)),
    textWidth,
    titleTextWidth: textWidth,
    textColor: '#f0f3fa',
    mutedTextColor: '#8a8f98',
    activeTextColor: '#12c48b',
    activeBackgroundColor: '#24312b',
    indicatorsEnabled: true,
    layoutName: 'Default',
    layoutSelectorEnabled: true,
    timeframeMenuEnabled: options.timeframeMenuEnabled,
    undoEnabled: true,
    redoEnabled: true,
  });
}

function renderOverlay(
  props: Partial<ComponentProps<typeof NativeTopBarOverlayImpl>> & {
    topBarLayout?: ComponentProps<typeof NativeTopBarOverlayImpl>['topBarLayout'];
  } = {},
) {
  const onAction = props.onAction ?? vi.fn();
  const onFavoriteTimeframeToggle = props.onFavoriteTimeframeToggle ?? vi.fn();

  render(
    <NativeTopBarOverlayImpl
      backgroundColor="#101418"
      favoriteTimeframeValues={props.favoriteTimeframeValues}
      gridColor="#222831"
      menuTimeframes={props.menuTimeframes}
      mutedTextColor="#8a8f98"
      onAction={onAction}
      onFavoriteTimeframeToggle={onFavoriteTimeframeToggle}
      textColor="#f0f3fa"
      topBarLayout={props.topBarLayout ?? createLayout()}
    />,
  );

  return { onAction, onFavoriteTimeframeToggle };
}

describe('NativeTopBarOverlay', () => {
  it('renders top-bar chrome as React Native controls', () => {
    renderOverlay();

    expect(screen.getByText('BTC-USD')).toBeTruthy();
    expect(screen.getByText('15m')).toBeTruthy();
    expect(screen.getByText('Default')).toBeTruthy();
    expect(screen.getByText('Indicators')).toBeTruthy();
    expect(screen.getByLabelText('Change symbol')).toBeTruthy();
    expect(screen.getByLabelText('Chart layouts')).toBeTruthy();
  });

  it('dispatches the symbol command from the symbol header', () => {
    const { onAction } = renderOverlay();

    fireEvent.click(screen.getByLabelText('Change symbol'));

    expect(onAction).toHaveBeenCalledWith({ type: 'symbol' });
  });

  it('dispatches the selected button command directly', () => {
    const { onAction } = renderOverlay();

    fireEvent.click(screen.getByLabelText('15m timeframe'));

    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'timeframe', interval: '15' }));
  });

  it('dispatches the layout selector command from the layout button', () => {
    const { onAction } = renderOverlay();

    fireEvent.click(screen.getByLabelText('Chart layouts'));

    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'layout' }));
  });

  it('opens a grouped timeframe selector with favorite toggles', () => {
    const { onAction, onFavoriteTimeframeToggle } = renderOverlay({
      favoriteTimeframeValues: ['1', '3', '5', '15', '30', '60'],
      menuTimeframes: AVAILABLE_TIMEFRAMES,
      topBarLayout: createLayout({ timeframeMenuEnabled: true }),
    });

    fireEvent.click(screen.getByLabelText('More timeframes'));

    expect(screen.getByText('Seconds')).toBeTruthy();
    expect(screen.getByText('Days')).toBeTruthy();
    expect(screen.getByLabelText('1 day timeframe')).toBeTruthy();
    expect(screen.getByLabelText('Favorite 1 day')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Favorite 1 day'));
    expect(onFavoriteTimeframeToggle).toHaveBeenCalledWith('1D');

    fireEvent.click(screen.getByLabelText('1 week timeframe'));
    expect(onAction).toHaveBeenCalledWith({ type: 'timeframe', interval: '1W' });
  });
});
