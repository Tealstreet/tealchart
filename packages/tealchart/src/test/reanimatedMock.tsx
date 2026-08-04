import { View } from 'react-native';
import { vi } from 'vitest';

export function useDerivedValue<T>(factory: () => T) {
  return Object.defineProperty({}, 'value', {
    enumerable: true,
    get: factory,
  }) as { readonly value: T };
}

export function useSharedValue<T>(value: T) {
  return { value };
}

export function useAnimatedStyle<T>(factory: () => T) {
  return factory();
}

export function useAnimatedReaction<T>(prepare: () => T, react: (prepared: T, previous: T | null) => void) {
  react(prepare(), null);
}

export function withTiming<T>(value: T) {
  return value;
}

export const Easing = {
  cubic: (value: number) => value * value * value,
  out: (easing: (value: number) => number) => easing,
};

export const useFrameCallback = vi.fn();

export default { View };
