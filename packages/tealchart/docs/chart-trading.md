# Chart Trading Contract

Tealchart exposes chart trading as a state-driven overlay plus typed user
intents. The integrator owns the OMS/exchange side effects and feeds the next
authoritative state back into the chart.

This API is intentionally separate from TradingView brokerage/order-line APIs.
When the TradingView backend is used through the runtime patch, Tealchart still
draws and hit-tests the trading affordances itself on the exposed chart canvas.

## Data Flow

1. Render the current trading model with `ChartTradingState`.
2. Handle `ChartTradingIntent` events from user gestures.
3. Validate and execute the requested action in your OMS.
4. Push the updated `ChartTradingState` back to the chart.

`ChartTradingIntent` is not a transaction result. Treat it as a request from the
UI layer.

## React Props

Consumers that use the Premys `TealChart` wrapper pass the same props to the
web canvas, TradingView, and native Skia backends:

```tsx
import type {
  ChartTradingIntent,
  ChartTradingState,
} from '@tealstreet/tealchart';

function TradingChart() {
  const tradingState: ChartTradingState = {
    orders: [
      {
        kind: 'order',
        id: 'local-order-1',
        orderId: 'exchange-order-1',
        price: 62_500,
        side: 'buy',
        quantity: 0.25,
        editable: true,
        cancellable: true,
        brackets: { takeProfit: 64_000 },
        partialEnabled: true,
        actions: [{ id: 'duplicate', label: 'Duplicate' }],
      },
    ],
    positions: [
      {
        kind: 'position',
        id: 'position-1',
        positionId: 'exchange-position-1',
        price: 61_000,
        side: 'long',
        quantity: 0.5,
        closeable: true,
        reversible: true,
        brackets: { stopLoss: 59_500 },
      },
    ],
    executions: [
      {
        kind: 'execution',
        id: 'fill-1',
        price: 61_250,
        time: 1_756_000_000,
        direction: 'buy',
      },
    ],
  };

  const handleTradingIntent = (intent: ChartTradingIntent) => {
    switch (intent.type) {
      case 'order.move.commit':
        return amendOrderPrice(intent.orderId, intent.price);
      case 'order.cancel':
        return cancelOrder(intent.orderId);
      case 'position.close':
        return closePosition(intent.positionId);
      case 'position.reverse':
        return reversePosition(intent.positionId);
      case 'bracket.tp.preview':
      case 'bracket.sl.preview':
        return previewBracketPrice(intent.ownerType, intent.ownerId, intent.price, intent.partialPercent);
      case 'bracket.tp.commit':
      case 'bracket.sl.commit':
        return setBracketPrice(intent.ownerType, intent.ownerId, intent.price, intent.partialPercent);
      case 'bracket.tp.click':
      case 'bracket.sl.click':
        return openBracketEditor(intent.ownerType, intent.ownerId, intent.type);
      case 'line.action':
        return runCustomLineAction(intent.lineId, intent.actionId);
    }
  };

  return <TealChart tradingState={tradingState} onTradingIntent={handleTradingIntent} />;
}
```

## Widget API

Direct Tealchart widget consumers use the same state and intent types through
the chart API:

```ts
const chart = widget.activeChart();

chart.setTradingState(tradingState);

const unsubscribe = chart.trading().onIntent(handleTradingIntent);

chart.trading().setState(nextTradingState);
const currentTradingState = chart.trading().getState();

unsubscribe();
```

## IDs

- `id` is the stable chart-line id. Keep it stable across state refreshes.
- `orderId` and `positionId` are optional external ids. Intents use them when
  present, otherwise they fall back to `id`.
- `lineId` is a generated chart id such as `chart_trading_order_<id>` or
  `chart_trading_position_<id>`. Use it for UI routing and custom line actions,
  not as the exchange identity.

## Intents

| Intent | When it fires |
| --- | --- |
| `order.move.commit` | Editable order line drag is released past the drag threshold. |
| `order.cancel` | Cancellable order cancel affordance is clicked. |
| `position.close` | Close affordance is clicked. |
| `position.reverse` | Reverse affordance is clicked. |
| `bracket.tp.preview` / `bracket.sl.preview` | TP/SL affordance is dragged. Use for temporary UI previews only. |
| `bracket.tp.commit` / `bracket.sl.commit` | TP/SL drag is released past the drag threshold. |
| `bracket.tp.click` / `bracket.sl.click` | TP/SL affordance is clicked without a drag. |
| `line.action` | A custom action button is clicked. |

Built-in actions are opt-in. Set `editable`, `cancellable`, `closeable`, or
`reversible` to `true`, or include enabled built-in action metadata with ids
`cancel`, `close`, or `reverse`.

## Brackets And Partials

`brackets: null` or an omitted `brackets` value means no TP/SL controls. A
one-sided object such as `{ takeProfit: 64_000 }` still renders both TP and SL
controls so the missing side can be created from the chart.

When `partialEnabled` is true, horizontal drag distance maps to the same partial
percentage bands on the canvas and TradingView backends:

| Horizontal distance | Partial percent |
| --- | --- |
| `0..27px` | `100` |
| `28..82px` | `75` |
| `83..137px` | `50` |
| `138..192px` | `25` |
| `193px+` | `10` |

## Backend Parity

The web canvas and native Skia backends use Tealchart's native interactive line
layers. The TradingView backend uses the runtime patch to draw on the
TradingView chart canvas and a pointer hit layer on the chart container. All
backends emit the same `ChartTradingIntent` union for the same high-level
gestures.

Known backend differences:

- TradingView chart trading does not create native TradingView order or
  position entities.
- TradingView native order ticket UI, line settings, and brokerage adapter
  callbacks are not involved.
- `source` identifies where the intent came from: `native-line`,
  `tradingview-bridge`, or `programmatic`.

## Execution Times

Execution marker `time` may be seconds or milliseconds. Values below
`1_000_000_000_000` are treated as seconds and normalized to milliseconds before
rendering.
