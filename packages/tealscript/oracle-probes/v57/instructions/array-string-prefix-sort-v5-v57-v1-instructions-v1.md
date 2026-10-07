# Proper-prefix ordering native probe request v1

Owner: codex-tkxtd0; native-queue request; phase and values UNSPECIFIED. Needed authority for certificate 324682e90e: nonempty proper-prefix ordering A versus Az, both directions, in v5 and v6. Use separate indicator-only sources per version; capture public CSV containing all named columns. Standard chart with at least 3 historical bars, record symbol/timeframe/session and source/capture hashes. Do not substitute local engine results as expected native values.

Use this source for v6; change only version and title for v5:

```pine
//@version=6
indicator("Prefix order native v6")
a = array.from("B", "Az", "A", "a", "Z")
a.sort(order.ascending)
plot(a.get(0) == "A" ? 1 : 0, "ASC0_A")
plot(a.get(1) == "Az" ? 1 : 0, "ASC1_Az")
plot(a.get(2) == "B" ? 1 : 0, "ASC2_B")
plot(a.get(3) == "Z" ? 1 : 0, "ASC3_Z")
plot(a.get(4) == "a" ? 1 : 0, "ASC4_a")
a.sort(order.descending)
plot(a.get(0) == "a" ? 1 : 0, "DESC0_a")
plot(a.get(1) == "Z" ? 1 : 0, "DESC1_Z")
plot(a.get(2) == "B" ? 1 : 0, "DESC2_B")
plot(a.get(3) == "Az" ? 1 : 0, "DESC3_Az")
plot(a.get(4) == "A" ? 1 : 0, "DESC4_A")
```

Boolean columns discriminate proposed ordering; zero is valid contrary evidence, not capture failure. Local preflight not run; native outcome unobserved.

## Round v57 record

Source: `array-string-prefix-sort-v5-v57-v1.pine`; SHA256 `956541bd17a68e682b34fcfc448148d2b212a37613b1723dcf3ae1db05d680ae`. Capture independently; preserve all source bytes and default inputs. Native phase and values are UNSPECIFIED. Record contrary values, zero, missing cells and refusals without editing the source. Hidden columns remain UNOBSERVED.

Credit is limited to this exact source and its observed cells; no unobserved domain or algorithm is settled.

Return artifacts beneath `captures/v57/array-string-prefix-sort-v5-v57-v1/` and reference them in `captures/v57/RESPONSE-v57.md`. Include exact source hash, symbol/ticker modifiers, timeframe, chart type/timezone, input values, capture time, closed/realtime cutoff, raw CSV, diagnostics, settings and Data Window screenshot. Preserve request symbols such as REMOTE:ALT or REMOTE:VERIFY; unavailable-symbol diagnostics are outcomes, not permission to substitute a feed.
