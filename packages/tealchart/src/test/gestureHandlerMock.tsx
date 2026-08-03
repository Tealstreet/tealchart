function createMockGesture() {
  return {
    config: {} as Record<string, unknown>,
    handlers: {} as Record<string, unknown>,
    enabled(value: boolean) {
      this.config.enabled = value;
      return this;
    },
    manualActivation(value: boolean) {
      this.config.manualActivation = value;
      return this;
    },
    maxDistance(value: number) {
      this.config.maxDistance = value;
      return this;
    },
    maxPointers(value: number) {
      this.config.maxPointers = value;
      return this;
    },
    minDuration(value: number) {
      this.config.minDuration = value;
      return this;
    },
    minDistance(value: number) {
      this.config.minDistance = value;
      return this;
    },
    onBegin(callback: unknown) {
      this.handlers.onBegin = callback;
      return this;
    },
    onStart(callback: unknown) {
      this.handlers.onStart = callback;
      return this;
    },
    onTouchesDown(callback: unknown) {
      this.handlers.onTouchesDown = callback;
      return this;
    },
    onTouchesMove(callback: unknown) {
      this.handlers.onTouchesMove = callback;
      return this;
    },
    onTouchesUp(callback: unknown) {
      this.handlers.onTouchesUp = callback;
      return this;
    },
    onTouchesCancelled(callback: unknown) {
      this.handlers.onTouchesCancelled = callback;
      return this;
    },
    onUpdate(callback: unknown) {
      this.handlers.onUpdate = callback;
      return this;
    },
    onEnd(callback: unknown) {
      this.handlers.onEnd = callback;
      return this;
    },
    onFinalize(callback: unknown) {
      this.handlers.onFinalize = callback;
      return this;
    },
  };
}

export const Gesture = {
  LongPress: createMockGesture,
  Manual: createMockGesture,
  Pan: createMockGesture,
  Tap: createMockGesture,
  Simultaneous: (...gestures: unknown[]) => ({
    type: 'Simultaneous',
    gestures,
  }),
};

export function GestureDetector({ children }: { children: unknown }) {
  return children;
}
