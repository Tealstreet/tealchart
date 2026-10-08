import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

describe('missing string results', () => {
  it.each([5, 6])('v%s preserves no-match, empty and selected strings', (version) => {
    const result = runCompatScript(
      `//@version=${version}
indicator("Missing string results")
missingBranch = if false
    "AZ"
missingCall() =>
    if false
        "AZ"
missingFunction = missingCall()
selected = if true
    "AZ"
string declaredMissing = na
plot(na(missingBranch) ? 1 : 0, "Branch missing")
plot(missingBranch == "" ? 1 : 0, "Branch empty")
plot(str.length(missingBranch), "Branch length")
plot(na(missingFunction) ? 1 : 0, "Function missing")
plot(missingFunction == "" ? 1 : 0, "Function empty")
plot(str.length(missingFunction), "Function length")
plot(na("") ? 1 : 0, "Empty missing")
plot(str.length(""), "Empty length")
plot(na(declaredMissing) ? 1 : 0, "Declared missing")
plot(declaredMissing == "" ? 1 : 0, "Declared empty")
plot(str.length(declaredMissing), "Declared length")
plot(na(selected) ? 1 : 0, "Selected missing")
plot(selected == "AZ" ? 1 : 0, "Selected text")
plot(str.length(selected), "Selected length")`,
      { bars: compatibilityBars.slice(0, 1) },
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [1],
      [1],
      [0],
      [1],
      [1],
      [0],
      [1],
      [0],
      [1],
      [1],
      [0],
      [0],
      [1],
      [2],
    ]);
  });
});
