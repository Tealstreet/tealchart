import type { SharedValue } from 'react-native-reanimated';

export interface NativeTapClaimSharedValues {
  claimedSequence: SharedValue<number>;
  sequence: SharedValue<number>;
}

export function beginNativeTapClaimScope(tapClaim: NativeTapClaimSharedValues): number {
  'worklet';
  tapClaim.sequence.value += 1;
  tapClaim.claimedSequence.value = 0;
  return tapClaim.sequence.value;
}

export function claimNativeTap(tapClaim: NativeTapClaimSharedValues): void {
  tapClaim.claimedSequence.value = tapClaim.sequence.value;
}

export function isNativeTapClaimed(tapClaim: NativeTapClaimSharedValues, sequence: number): boolean {
  return tapClaim.claimedSequence.value === sequence;
}
