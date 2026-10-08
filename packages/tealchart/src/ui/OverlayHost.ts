export interface WebOverlayEnvironment {
  document: Document;
  window: Window;
  sourceWindow: Window;
  portalRoot: HTMLElement;
  surfaceId?: string;
  sourcePoint(point: { clientX: number; clientY: number }): { x: number; y: number };
  targetPoint(point: { x: number; y: number }): { x: number; y: number };
  getZoom(): number;
}

export interface WebOverlayInput {
  type: 'pointerdown' | 'keydown' | 'keyup';
  event: MouseEvent | PointerEvent | KeyboardEvent;
  sourceId?: string;
  inside: boolean;
}

export interface WebOverlayHost {
  surfaceId: string;
  ready: Promise<WebOverlayEnvironment>;
  sourcePoint(point: { clientX: number; clientY: number }): { x: number; y: number };
  sourceRect(): { x: number; y: number; width: number; height: number };
  setContent(element: HTMLElement | null): void;
  setActive(active: boolean): void;
  subscribeInput(listener: (input: WebOverlayInput) => void): () => void;
  dispose(): void;
}

export type WebOverlayHostFactory = (options: {
  kind: 'floating' | 'modal';
  source: HTMLElement;
  onError: (message: string) => void;
}) => WebOverlayHost;

export function showWebOverlayError(source: HTMLElement, error: string): HTMLElement {
  const alert = source.ownerDocument.createElement('div');
  alert.setAttribute('role', 'alert');
  alert.textContent = `Chart overlay failed: ${error}`;
  source.append(alert);
  console.error(alert.textContent);
  return alert;
}
