> Superseded by pine-value-vectors-index-v1.md. Historical measurement only; use the superseding report for current figures.

# External Pine Corpus v5 Fixture Blind Spots v1

## Basis

- Corpus: fixed v5 corpus, 1,000 pinned source files.
- Measurement report: `packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/runs-282c41d0a8/report-282c41d0a8-final.json`.
- Measurement commit: `282c41d0a868556588f1e8555c69bf079a527a13`.
- Standard fixture: 1,600 weekday daily bars, from `1546332300000` to `1739806200000`.
- Method: static dependency scan over comment-stripped source. Counts below are script counts, not occurrence counts.
- Limit: this audit says what the fixture cannot represent. It does not prove the referenced branch is active for a given script.

## Dependency Counts

| Dependency class | Scripts | Current buckets |
| --- | ---: | --- |
| Drawing objects / limits | 292 | 232 supported, 41 tealscript-gap, 13 invalid-pine, 4 unsupported-by-design, 2 corpus-hygiene |
| Barstate realtime / last-bar state | 225 | 175 supported, 37 tealscript-gap, 11 invalid-pine, 2 unsupported-by-design |
| Timeframe identity | 211 | 149 supported, 45 tealscript-gap, 13 invalid-pine, 2 unsupported-by-design, 2 corpus-hygiene |
| Volume-dependent logic | 192 | 164 supported, 21 tealscript-gap, 5 invalid-pine, 2 unsupported-by-design |
| Request timeframes | 128 | 75 supported, 41 tealscript-gap, 9 invalid-pine, 3 unsupported-by-design |
| Symbol metadata | 121 | 83 supported, 27 tealscript-gap, 9 invalid-pine, 2 unsupported-by-design |
| Tick / precision contract | 113 | 98 supported, 9 tealscript-gap, 6 invalid-pine |
| Explicit long history | 83 | 63 supported, 15 tealscript-gap, 3 invalid-pine, 2 unsupported-by-design |
| Higher-timeframe literals | 57 | 45 supported, 9 tealscript-gap, 2 invalid-pine, 1 unsupported-by-design |
| Intraday clock / calendar | 49 | 34 supported, 13 tealscript-gap, 2 invalid-pine |
| Session windows | 37 | 30 supported, 7 tealscript-gap |
| Currency metadata | 25 | 21 supported, 3 tealscript-gap, 1 invalid-pine |
| 24/7 or weekend markets | 12 | 8 supported, 4 tealscript-gap |
| Fundamental / macro requests | 3 | 3 supported |
| Corporate actions | 1 | 1 supported |

## Raw Member References

| Namespace | References found |
| --- | --- |
| `syminfo.*` | `mintick` 481, `tickerid` 293, `type` 80, `ticker` 54, `basecurrency` 20, `timezone` 19, `prefix` 14, `currency` 5, `session` 3, `pointvalue` 2, `description` 1, `root` 1 |
| `timeframe.*` | `period` 371, `in_seconds` 103, `isintraday` 46, `isdaily` 42, `isweekly` 40, `change` 27, `multiplier` 23, `ismonthly` 5, `isseconds` 2, `isminutes` 2, `from_seconds` 2 |
| `barstate.*` | `islast` 317, `isconfirmed` 247, `isrealtime` 30, `isfirst` 30, `islastconfirmedhistory` 21, `ishistory` 4, `isnew` 2 |
| `session.*` | `ismarket` 6, `ispremarket` 3, `isfirstbar` 2, `extended` 1, `regular` 1, `isfirstbar_regular` 1 |
| `request.*` | `security` 321, `security_lower_tf` 14, `financial` 14, `earnings` 1, `dividends` 1 |

## Common Blind Spots

| Priority | Blind spot | Why it matters | Profile needed |
| ---: | --- | --- | --- |
| 1 | Timeframe and realtime state | 225 scripts reference `barstate.*` and 211 reference timeframe identity. A daily historical fixture cannot prove last-bar redraw, same-time replacement, intraday-only branches, or timeframe-specific control flow. | Intraday realtime profile with 1m/5m bars, same-time replacements, last-bar redraws, and explicit chart timeframe metadata. |
| 2 | Session and exchange calendar | 49 scripts reference clock/calendar values and 37 reference session windows. The fixture rotates four UTC timestamps, but it is not a coherent exchange session. | Equity intraday profile in an exchange timezone with premarket, RTH, postmarket, open/close boundaries, and session calendar metadata. |
| 3 | Symbol metadata and tick contract | 121 scripts reference symbol identity/type and 113 reference tick precision or point value. One synthetic symbol cannot exercise crypto, futures, forex, equity, base currency, or tick-size branches. | Symbol metadata matrix over representative equity, crypto, futures, and forex instruments with realistic `mintick`, `pointvalue`, `currency`, `basecurrency`, `type`, `tickerid`, and `timezone`. |
| 4 | Request timeframe mapping | 128 scripts call request APIs and 57 use higher-timeframe literals. The fixture is one chart stream; request data may need lower/higher timeframe aggregation and multiple symbol feeds. | Request profile with deterministic multi-symbol data and validated LTF/HTF aggregation for daily, weekly, monthly, and intraday requests. |
| 5 | Long history | 83 scripts ask for long lookbacks or `max_bars_back`. The 1,600-bar fixture is a large improvement over 160, but not a 5k/20k long-chart oracle. | Long-history profile at 5k and 20k bars using the same realistic generator, with parity checked against the old fixture for reproducibility. |
| 6 | Volume regimes | 192 scripts depend on volume. The fixture has volume spikes, but still represents one synthetic regime. | Volume stress profile with sustained low volume, high volume, spikes, gaps, and market-specific zero/missing-volume cases. |
| 7 | 24/7 markets | 12 scripts reference 24/7 or weekend behavior. Weekday-only equity-style bars cannot exercise weekend crypto logic. | Crypto 24/7 profile with weekend bars and crypto symbol metadata. |
| 8 | Fundamental, macro, and corporate-action events | 3 scripts use `request.financial` and 1 uses earnings/dividends. OHLCV-only bars cannot validate event-backed series. | Low-priority event-feed profile for the specific request APIs the product intends to support. |

## Recommended Fixture Matrix

The next fixture should not replace the 1,600-bar weekday daily profile. It should add a small matrix so each run says which market shape it exercised:

1. Equity intraday/session: 1m or 5m bars across premarket, RTH, postmarket, open/close boundaries, and realtime same-time replacements.
2. Crypto 24/7: hourly or minute bars across weekdays and weekends, with crypto metadata and realistic tick precision.
3. Long-history daily/weekly/monthly: 5k and 20k bars, plus deterministic D/W/M aggregation and request feeds.
4. Symbol metadata matrix: representative subset rerun under equity, crypto, futures, and forex metadata.
5. Event-backed requests: narrow profile for `request.financial`, `request.earnings`, `request.dividends`, and related event series.

## Conclusion

The 1,600-bar volatile weekday fixture fixed the old 160-bar tame-window blind spot, but it is still one daily synthetic symbol. The common dependencies above are frequent enough that a supported row can still be under-exercised: it may parse, execute, and produce some output while never taking the branch a real intraday, session-aware, multi-symbol, 24/7, or long-history chart would take.
