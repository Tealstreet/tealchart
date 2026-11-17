import { GlobalFonts } from '@napi-rs/canvas';

// Generic CSS families are not installed family names on every host. Bind the
// fixture recipes before measuring or painting, as the native glyph plate does.
// This selects host fonts only; it does not alter frozen native PNG evidence.
for (const [alias, ...candidates] of [
  ['sans-serif', 'DejaVu Sans', 'Liberation Sans', 'Arial', 'Helvetica'],
  ['monospace', 'DejaVu Sans Mono', 'Liberation Mono', 'Menlo', 'Courier New'],
]) {
  const family = candidates.find((name) => GlobalFonts.has(name));
  if (!family || !GlobalFonts.setAlias(family, alias))
    throw new Error(`No installed canvas fixture family for ${alias}`);
}
