/** Issued at an admitted native touch-down, never by a render or JS callback. */
export interface NativeOrderMoveGesture {
  sequence: number;
  startedAt: number;
}

export const NATIVE_ORDER_MOVE_MAX_AGE_MS = 15_000;

/** One captured line and one commit per touch, including delayed/repeated JS delivery. */
export function createNativeOrderMoveLease<T>(now = () => Date.now(), afterSequence = 0) {
  let highestSequence = afterSequence;
  let pending: { objectId: string; gesture: NativeOrderMoveGesture; value: T } | undefined;
  const fresh = (gesture: NativeOrderMoveGesture) => {
    const age = now() - gesture.startedAt;
    return Number.isFinite(gesture.startedAt) && age >= 0 && age < NATIVE_ORDER_MOVE_MAX_AGE_MS;
  };
  return {
    begin(objectId: string, gesture: NativeOrderMoveGesture, value: T | undefined): boolean {
      if (!gesture || !Number.isSafeInteger(gesture.sequence) || gesture.sequence <= highestSequence) return false;
      highestSequence = gesture.sequence;
      pending = undefined;
      if (!value || !fresh(gesture)) return false;
      pending = { objectId, gesture: { ...gesture }, value };
      return true;
    },
    consume(objectId: string, gesture: NativeOrderMoveGesture): T | undefined {
      const captured = pending;
      if (
        !captured ||
        !gesture ||
        captured.objectId !== objectId ||
        captured.gesture.sequence !== gesture.sequence ||
        captured.gesture.startedAt !== gesture.startedAt
      )
        return;
      // Consume before any callback can rerender, throw, retire or re-enter.
      pending = undefined;
      return fresh(captured.gesture) ? captured.value : undefined;
    },
    retire() {
      pending = undefined;
    },
  };
}
