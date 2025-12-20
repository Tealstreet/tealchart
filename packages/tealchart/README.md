# @tealstreet/custom-chart

A standalone custom OHLCV chart package with a TradingView-compatible widget API. Provides a drop-in alternative to TradingView charts with canvas-based rendering.

## Features

- Canvas-based OHLCV candlestick rendering
- TradingView-compatible widget API (`IChartingLibraryWidget` interface)
- Pan and zoom interactions (mouse drag, scroll wheel, trackpad)
- Price axis zoom (drag on price axis)
- Crosshair with price/time labels
- Historical data backfetch on pan/zoom
- Configurable colors and styling via theme overrides
- Reset viewport button

## Installation

The package is part of the Tealstreet monorepo and is available as a workspace dependency:

```json
{
  "dependencies": {
    "@tealstreet/custom-chart": "workspace:*"
  }
}
```

## Usage

### Basic Usage with CustomChart Component

```tsx
import { CustomChart } from '@tealstreet/custom-chart';

const MyChart = () => {
  const bars = [...]; // Your OHLCV data

  return (
    <CustomChart
      width={800}
      height={400}
      bars={bars}
      renderOptions={{
        upColor: '#26a69a',
        downColor: '#ef5350',
        backgroundColor: '#131722',
      }}
    />
  );
};
```

### Widget API (TradingView-compatible)

For integration with existing TradingView infrastructure (like `useWidgetStateManagement`):

```tsx
import { createCustomChartWidget } from '@tealstreet/custom-chart';

const widget = createCustomChartWidget({
  container: containerElement,
  symbol: 'BTCUSDT',
  interval: '1h',
  datafeed: myDatafeed, // IBasicDataFeed implementation
  theme: 'Dark',
  overrides: {
    'mainSeriesProperties.candleStyle.upColor': '#26a69a',
    'mainSeriesProperties.candleStyle.downColor': '#ef5350',
  },
});

// Widget lifecycle
widget.onChartReady(() => {
  console.log('Chart ready');
});

// Clean up
widget.remove();
```

## API Reference

### CustomChartWidget

TradingView-compatible widget class implementing core chart functionality.

#### Lifecycle Methods

- `onChartReady(callback: () => void)` - Called when chart is ready
- `headerReady(): Promise<void>` - Resolves when header is ready
- `remove()` - Dispose the widget and clean up

#### Chart Access

- `chart(index?: number): CustomChartApi` - Get chart API for index
- `activeChart(): CustomChartApi` - Get active chart API
- `chartsCount(): Promise<number>` - Get number of charts (always 1)

#### Styling

- `applyOverrides(overrides: ChartOverrides)` - Apply chart style overrides
- `setCSSCustomProperty(key: string, value: string)` - Set CSS property

#### Events

- `subscribe(event: WidgetEvent, callback: Function)` - Subscribe to events
- `unsubscribe(event: WidgetEvent, callback: Function)` - Unsubscribe

Supported events: `onAutoSaveNeeded`, `layout_about_to_be_changed`, `chart_loaded`, `layout_changed`, `mouse_down`, `mouse_up`

### CustomChartApi

Per-chart API for symbol/data management.

- `symbol(): string` - Get current symbol
- `setSymbol(symbol: string)` - Set symbol
- `resetData()` - Reset and reload data
- `crossHairMoved(): ISubscription` - Crosshair position subscription
- `onSymbolChanged(): ISubscription` - Symbol change subscription
- `onIntervalChanged(): ISubscription` - Interval change subscription

### Bar Interface

```typescript
interface Bar {
  time: number;    // Unix timestamp in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

### RenderOptions

```typescript
interface RenderOptions {
  width: number;
  height: number;
  devicePixelRatio: number;
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  upColor: string;
  downColor: string;
  crosshairColor: string;
  showVolume: boolean;
  volumeHeight: number;      // 0-1, fraction of chart height
  minCandleWidth: number;
}
```

## Interactions

| Action | Behavior |
|--------|----------|
| Drag on chart | Pan (time + price) |
| Scroll wheel vertical | Zoom time axis |
| Scroll wheel horizontal | Pan time axis |
| Drag on price axis | Zoom price axis (exponential) |
| Hover near bottom center | Show reset button |

## Integration with Tealstreet

The package integrates with the existing chart infrastructure:

1. **CustomChartDirect** - React component that mirrors `TradingViewDirect`, using `useWidgetStateManagement` hook
2. **CustomChartModule** - Grid module wrapper for the layout system
3. **DefaultDatafeed** - Reuses existing datafeed for historical data and real-time updates

### Adding to Layout

Both chart types are available in the grid module system:
- `chart` - TradingView (existing)
- `customChart` - Custom chart (this package)

## Development

```bash
# Build the package
yarn build

# Run tests
yarn test

# Type check
yarn typecheck
```

## Architecture

```
packages/custom-chart/
├── src/
│   ├── index.ts                 # Main exports
│   ├── CustomChartWidget.ts     # TradingView-compatible widget class
│   ├── CustomChartApi.ts        # Per-chart API
│   ├── CustomChartRenderer.ts   # Canvas rendering engine
│   ├── CustomChart.tsx          # React component
│   ├── types.ts                 # Type definitions
│   └── events/
│       └── EventEmitter.ts      # Pub-sub for widget events
```

## Known Limitations

- Single chart only (no multi-chart layouts yet)
- No indicators/studies support
- No drawing tools
- No save/load chart state (stubs only)

These features are planned for future implementation.
