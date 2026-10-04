# visual-chart-fg-solid-numeric-v6-v1 capture instructions v1

Native outcome: UNOBSERVED. Expected observation: UNSPECIFIED exact native foreground values. Prior v4 source was blocked by str.tostring(color); numeric channels avoid that unrelated refusal.

1. Compile the exact source and record any code/text. Set chart background to Solid, retaining a screenshot of chart/settings/theme.
2. For each exact background #000000,#FFFFFF,#7F7F7F,#808080,#404040,#C0C0C0,#FF0000,#00FF00,#0000FF: apply setting, wait for chart recalculation, export CSV and capture log/setting screenshot.
3. Record exported BG_R/G/B and FG_R/G/B/T plus theme, source SHA, UTC, symbol/timeframe and export name. If the host does not expose an exact color value, record that limitation instead of inferring it.
4. Where foreground changes between neighboring gray samples, use the same source for a bounded grayscale bracket, keeping every attempted exact background and result.

Scope: An observed grayscale bracket and sampled color settings do not prove a global luminance formula or all chart themes.

Return evidence to v15/captures/v15/RESPONSE-v15.md. Preserve source SHA, chart context, attempt and exact diagnostic/CSV/screenshot paths.
