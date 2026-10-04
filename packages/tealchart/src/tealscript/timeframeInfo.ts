import type { TealscriptRuntimeOptions } from '@tealstreet/tealscript';
import type { ResolutionString } from '../types';

/** Existing widget resolution metadata, shared by all Tealscript hosts. */
export function createTealscriptTimeframeInfo(period: ResolutionString): TealscriptRuntimeOptions['timeframe'] {
  const normalized = String(period).trim().toUpperCase();
  const numericMinutes = Number(normalized);
  if (Number.isFinite(numericMinutes) && numericMinutes > 0) {
    return {
      period: String(period),
      multiplier: numericMinutes,
      isminutes: true,
      isdaily: false,
      isweekly: false,
      ismonthly: false,
      isintraday: true,
      isseconds: false,
      isticks: false,
    };
  }

  const match = /^(\d+)?([STDWM])$/.exec(normalized);
  const multiplier = match?.[1] === undefined ? 1 : Number(match[1]);
  const unit = match?.[2];
  return {
    period: String(period),
    multiplier: Number.isFinite(multiplier) ? multiplier : 1,
    isminutes: false,
    isdaily: unit === 'D',
    isweekly: unit === 'W',
    ismonthly: unit === 'M',
    isintraday: unit === 'S' || unit === 'T',
    isseconds: unit === 'S',
    isticks: unit === 'T',
  };
}
