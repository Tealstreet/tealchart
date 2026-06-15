import type { UserDrawingAnchor, UserDrawingRiskRewardStatsMode } from './types';

import { DEFAULT_USER_DRAWING_RISK_REWARD_STATS_MODE, normalizeUserDrawingRiskRewardStatsMode } from './types';

export interface UserDrawingRiskRewardMetrics {
  reward: number;
  risk: number;
  ratio: number | null;
  rewardLabel: string;
  riskLabel: string;
  ratioLabel: string;
}

export interface UserDrawingRiskRewardMetricOptions {
  statsMode?: UserDrawingRiskRewardStatsMode;
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
  options: UserDrawingRiskRewardMetricOptions = {},
): UserDrawingRiskRewardMetrics {
  const reward = kind === 'longPosition' ? target.price - entry.price : entry.price - target.price;
  const risk = kind === 'longPosition' ? entry.price - stop.price : stop.price - entry.price;
  const rewardPercent = entry.price === 0 ? 0 : (reward / entry.price) * 100;
  const riskPercent = entry.price === 0 ? 0 : (risk / entry.price) * 100;
  const ratio = Math.abs(risk) > 0 ? Math.abs(reward) / Math.abs(risk) : null;
  const statsMode = normalizeUserDrawingRiskRewardStatsMode(
    options.statsMode ?? DEFAULT_USER_DRAWING_RISK_REWARD_STATS_MODE,
  );
  const rewardValueLabel = `${formatSigned(reward)} (${formatSigned(rewardPercent)}%)`;
  const riskValueLabel = `${formatSigned(-risk)} (${formatSigned(-riskPercent)}%)`;

  return {
    reward,
    risk,
    ratio,
    rewardLabel: statsMode === 'compact' ? rewardValueLabel : `Reward ${rewardValueLabel}`,
    riskLabel: statsMode === 'compact' ? riskValueLabel : `Risk ${riskValueLabel}`,
    ratioLabel: ratio === null ? 'R:R --' : `R:R ${ratio.toFixed(2)}`,
  };
}
