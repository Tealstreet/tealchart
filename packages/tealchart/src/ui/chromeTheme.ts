import type { RenderOptions } from '../types';

import { resolveChromeThemeVars } from '../chromeTheme';

export {
  isDarkChromeColor as isDarkColor,
  resolveChartChromeTheme,
  resolveChromeThemeVars,
  withChromeAlpha as withAlpha,
} from '../chromeTheme';

export function applyChromeThemeVars(
  el: HTMLElement,
  renderOptions: Partial<RenderOptions> | undefined,
): void {
  const vars = resolveChromeThemeVars(renderOptions);
  for (const [name, value] of Object.entries(vars)) {
    el.style.setProperty(name, value);
  }
}
