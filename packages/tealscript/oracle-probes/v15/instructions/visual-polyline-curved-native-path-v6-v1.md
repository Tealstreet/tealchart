# visual-polyline-curved-native-path-v6-v1 capture instructions v1

Native outcome: UNOBSERVED. Expected observation: UNSPECIFIED: exact native curved path control coordinates on this bounded four-vertex stimulus.

1. Compile whole unmodified indicator; >=32 historical bars.
2. Zoom to last confirmed history with all four vertices visible; save source, timezone, price/time transform, native vertices and screenshot.
3. If the capture instrument supports it, retain actual native canvas/SVG moveTo/lineTo/bezierCurveTo/quadraticCurveTo path calls for red curved output, with CSS/device coordinates and source identification.
4. Repeat at a changed bar-spacing viewport and retain transformations. If path extraction is unavailable, explicitly record that limitation; screenshot alone is not proof of an internal kernel.

Scope: One bounded shape and viewport transformations; no universal Catmull-Rom/Bezier/tension/order inference.

Return evidence to v15/captures/v15/RESPONSE-v15.md. Preserve source SHA, chart context, attempt and exact diagnostic/CSV/screenshot paths.
