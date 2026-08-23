export interface WebFloatingViewport {
  height: number;
  width: number;
}

export interface ResolveFixedFloatingPositionOptions {
  desiredLeft: number;
  desiredTop: number;
  fallbackHeight?: number;
  fallbackWidth?: number;
  height?: number;
  margin?: number;
  viewport?: WebFloatingViewport;
  width?: number;
}

export interface FixedFloatingPosition {
  left: number;
  top: number;
}

export function getWebFloatingViewport(): WebFloatingViewport {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

export function resolveFixedFloatingPosition({
  desiredLeft,
  desiredTop,
  fallbackHeight = 0,
  fallbackWidth = 0,
  height,
  margin = 8,
  viewport = getWebFloatingViewport(),
  width,
}: ResolveFixedFloatingPositionOptions): FixedFloatingPosition {
  const surfaceWidth = width ?? fallbackWidth;
  const surfaceHeight = height ?? fallbackHeight;
  const maxLeft = Math.max(margin, viewport.width - surfaceWidth - margin);
  const maxTop = Math.max(margin, viewport.height - surfaceHeight - margin);
  const left = Math.min(Math.max(desiredLeft, margin), maxLeft);
  const top = Math.min(Math.max(desiredTop, margin), maxTop);

  return { left, top };
}

export function mountWebFloatingElement(element: HTMLElement, parent: HTMLElement = document.body): void {
  if (element.parentElement !== parent) {
    parent.appendChild(element);
  }
}

export function positionFixedFloatingElement(
  element: HTMLElement,
  options: Omit<ResolveFixedFloatingPositionOptions, 'height' | 'width'>,
): FixedFloatingPosition {
  const rect = element.getBoundingClientRect();
  const position = resolveFixedFloatingPosition({
    ...options,
    width: rect.width || element.offsetWidth || options.fallbackWidth,
    height: rect.height || element.offsetHeight || options.fallbackHeight,
  });

  element.style.left = `${position.left}px`;
  element.style.top = `${position.top}px`;

  return position;
}
