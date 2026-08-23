export function runOnJS<T extends (...args: never[]) => unknown>(callback: T): T {
  return callback;
}

