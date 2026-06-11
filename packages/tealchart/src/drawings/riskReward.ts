import type { UserDrawingAnchor } from './types';

export interface UserDrawingRiskRewardMetrics {
  reward: number;
  risk: number;
  ratio: number | null;
  rewardLabel: string;
  riskLabel: string;
  ratioLabel: string;
}

function formatSigned(value: number): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}`;
}

export function resolveUserDrawingRiskRewardMetrics(
  kind: 'longPosition' | 'shortPosition',
  entry: UserDrawingAnchor,
  target: UserDrawingAnchor,
  stop: UserDrawingAnchor,
): UserDrawingRiskRewardMetrics {
  const reward = kind === 'longPosition' ? target.price - entry.price : entry.price - target.price;
  const risk = kind === 'longPosition' ? entry.price - stop.price : stop.price - entry.price;
  const rewardPercent = entry.price === 0 ? 0 : (reward / entry.price) * 100;
  const riskPercent = entry.price === 0 ? 0 : (risk / entry.price) * 100;
  const ratio = Math.abs(risk) > 0 ? Math.abs(reward) / Math.abs(risk) : null;

  return {
    reward,
    risk,
    ratio,
    rewardLabel: `Reward ${formatSigned(reward)} (${formatSigned(rewardPercent)}%)`,
    riskLabel: `Risk ${formatSigned(-risk)} (${formatSigned(-riskPercent)}%)`,
    ratioLabel: ratio === null ? 'R:R --' : `R:R ${ratio.toFixed(2)}`,
  };
}
