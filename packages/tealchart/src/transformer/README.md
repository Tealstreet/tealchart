# Custom Chart Transformer

Bidirectional transformation between Custom Chart settings and TradingView saved layouts.

## TradingView Layout Schema

TradingView layouts are stored as **triple-nested JSON**. Understanding this structure is critical for debugging.

### Storage Structure

```
ChartData (from SaveLoadAdapter)
├── id: string | number
├── name: string
├── symbol: string
├── resolution: string
└── content: string (JSON) ─────────────────────────────────────────┐
                                                                    │
    ┌───────────────────────────────────────────────────────────────┘
    ▼
    Outer Content (parsed once)
    ├── symbol: string
    ├── resolution: string
    └── content: string (JSON) ─────────────────────────────────────┐
                                                                    │
        ┌───────────────────────────────────────────────────────────┘
        ▼
        Inner Content (parsed twice from original)
        ├── charts: Array<Chart>
        │   └── [0]: Chart
        │       ├── panes: Array<Pane>
        │       │   └── Pane
        │       │       ├── sources: string[] (IDs referencing sources)
        │       │       └── height: number
        │       └── mainSourceId: string
        ├── mainSourceId: string (may also be at root)
        └── sources: TvSource[] (flattened from panes, may need extraction)
```

### TvSource Structure (Indicators/Studies)

```typescript
interface TvSource {
  id: string;           // e.g., "abc123"
  type: string;         // ALWAYS "Study" for indicators (not useful!)
  state: {
    symbol: string;
    interval: string;
    inputs: Record<string, unknown>;  // Study parameters
    plots: Array<{
      id: string;
      color?: string;
      linewidth?: number;
    }>;
    visible: boolean;
  };
  metaInfo: {
    fullId: string;     // THE ACTUAL STUDY ID! e.g., "Moving Average Convergence/Divergence@tv-basicstudies-1"
    id: string;         // Shorter form, e.g., "MACD@tv-basicstudies"
    shortId: string;    // Shortest form
  };
}
```

### Key Discovery: Study Identification

**The `source.type` field is useless for indicators!** It's always `"Study"`.

The actual study identifier is in `source.metaInfo.fullId`:

| Study | metaInfo.fullId |
|-------|-----------------|
| MACD | `Moving Average Convergence/Divergence@tv-basicstudies-1` |
| RSI | `STD;RSI` |
| SMA | `STD;SMA` |
| EMA | `STD;EMA` |
| Bollinger Bands | `STD;Bollinger_Bands` |

## Debugging TV Layouts

Add temporary logging to see the actual structure:

```typescript
// In fromTvFormat.ts, after parsing:
console.log('[TV Layout] Raw content (first 500 chars):', contentStr.substring(0, 500));
console.log('[TV Layout] Outer parsed:', JSON.stringify(outerContent, null, 2).substring(0, 1000));
console.log('[TV Layout] Inner parsed:', JSON.stringify(tvContent, null, 2).substring(0, 1000));

// To see all sources with their study IDs:
for (const source of tvContent.sources ?? []) {
  console.log('[TV Source]', {
    id: source.id,
    type: source.type,
    metaInfoFullId: (source as any).metaInfo?.fullId,
    metaInfoId: (source as any).metaInfo?.id,
  });
}
```

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Public exports |
| `types.ts` | Type definitions |
| `toTvFormat.ts` | CustomChart → TradingView |
| `fromTvFormat.ts` | TradingView → CustomChart |
| `indicatorMapping.ts` | Bidirectional indicator ID mappings |
| `saveLoadIntegration.ts` | SaveLoadAdapter integration |
| `migrations.ts` | Version migrations |

## Adding New Indicator Mappings

1. Find the TV study ID by loading a layout with that indicator and logging `source.metaInfo.fullId`
2. Add to `INDICATOR_MAPPINGS` in `indicatorMapping.ts`:

```typescript
'my-indicator': {
  customId: 'my-indicator',
  tvStudyId: 'Exact Full ID From metaInfo@version',
  tvAltIds: ['Alternative', 'IDs'],  // Optional
  inputMappings: {
    customInputName: 'TV Input Name',  // Map your input names to TV's
  },
  defaultInputs: {
    customInputName: 14,
  },
  isOverlay: false,  // true if renders on price chart
}
```

## Round-Trip Preservation

When saving from Custom Chart, we embed metadata for lossless round-trips:

```typescript
{
  _tealstreetCustomChart: true,
  _tealstreetVersion: 1,
  _tealstreetOriginalSettings: { ... },  // Original settings for round-trip
  _tealstreetOriginalIndicators: [ ... ] // Unmapped indicators preserved
}
```
