import { afterEach, expect, it, vi } from 'vitest';

import { IndicatorDataWindow } from './IndicatorOutputReadouts';

const entry = {
  plotId: 'plot',
  scriptId: 'study',
  title: 'Close',
  values: ['12.30'],
  color: '#ff0000',
  statusLine: false,
  dataWindow: true,
};
afterEach(() => {
  document.body.innerHTML = '';
});

it('shows only data-window entries and keeps the window open while values refresh', () => {
  const window = new IndicatorDataWindow();
  document.body.append(window.getElement());
  window.getElement().open = true;
  window.setReadouts([entry, { ...entry, plotId: 'status', title: 'Status only', dataWindow: false }]);
  expect(window.getElement().hidden).toBe(false);
  expect(window.getElement().textContent).toContain('Close');
  expect(window.getElement().textContent).not.toContain('Status only');
  window.getElement().open = true;
  window.setReadouts([{ ...entry, values: ['na'] }]);
  expect(window.getElement().open).toBe(true);
  expect(window.getElement().textContent).toContain('na');
  window.setReadouts([]);
  expect(window.getElement().hidden).toBe(true);
});


it("defers closed-window rows and reuses open rows across ticks", () => {
  const window = new IndicatorDataWindow();
  document.body.append(window.getElement());
  const create = vi.spyOn(document, "createElement");
  const replace = vi.spyOn(Element.prototype, "replaceChildren");
  window.setReadouts([entry]);
  expect(create).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
  window.getElement().open = true;
  window.getElement().dispatchEvent(new Event("toggle"));
  const row = window.getElement().querySelector("div > div");
  create.mockClear(); replace.mockClear();
  for (let tick = 0; tick < 100; tick++) window.setReadouts([entry]);
  window.setReadouts([{ ...entry, values: ["99.00"] }]);
  expect(window.getElement().querySelector("div > div")).toBe(row);
  expect(window.getElement().textContent).toContain("99.00");
  expect(create).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
});
