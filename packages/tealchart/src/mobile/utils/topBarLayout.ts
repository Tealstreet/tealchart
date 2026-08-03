import type { TimeframeOption } from '../../state/chartState';
import type { ResolutionString } from '../../types';

export type NativeTopBarActionType = 'symbol' | 'timeframe' | 'indicators' | 'undo' | 'redo';

export interface NativeTopBarActionCommand {
  type: NativeTopBarActionType;
  interval?: ResolutionString;
}

export interface NativeTopBarTextGeometry {
  text: string;
  x: number;
  y: number;
  color: string;
  font: 'title' | 'text';
}

export interface NativeTopBarButtonGeometry extends NativeTopBarActionCommand {
  text: string;
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  textX: number;
  textY: number;
  textColor: string;
  backgroundColor?: string;
}

export interface NativeTopBarDividerGeometry {
  x: number;
  y: number;
  height: number;
}

export interface NativeTopBarHitRectGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NativeTopBarLayout {
  height: number;
  symbol: NativeTopBarTextGeometry;
  symbolChevron: NativeTopBarTextGeometry | null;
  symbolHitRect: NativeTopBarHitRectGeometry | null;
  buttons: NativeTopBarButtonGeometry[];
  dividers: NativeTopBarDividerGeometry[];
}

export interface NativeTopBarLayoutInput {
  width: number;
  height: number;
  symbol: string;
  interval: ResolutionString;
  timeframes: readonly TimeframeOption[];
  textWidth: (text: string) => number;
  titleTextWidth: (text: string) => number;
  textColor: string;
  mutedTextColor: string;
  activeTextColor: string;
  activeBackgroundColor: string;
  indicatorsEnabled?: boolean;
  undoEnabled?: boolean;
  redoEnabled?: boolean;
}

export interface NativeTopBarTimeframesInput {
  timeframes: readonly TimeframeOption[];
  interval: ResolutionString;
  supportedResolutions?: readonly ResolutionString[];
  defaultVisibleValues: ReadonlySet<ResolutionString>;
}

interface NativeTopBarTimeframeCandidate {
  timeframe: TimeframeOption;
  width: number;
}

const HORIZONTAL_PADDING = 4;
const GROUP_GAP = 6;
const BUTTON_GAP = 2;
const BUTTON_HEIGHT = 28;
const BUTTON_PADDING_X = 6;
const MIN_TIMEFRAME_BUTTON_WIDTH = 30;
const ACTION_BUTTON_WIDTH = 24;
const DIVIDER_HEIGHT = 18;
const SYMBOL_CHEVRON = 'v';
const SYMBOL_CHEVRON_WIDTH = 8;
const SYMBOL_CHEVRON_GAP = 5;
const INDICATORS_LABEL = 'Indicators';
const INDICATORS_ICON_WIDTH = 16;
const INDICATORS_ICON_GAP = 4;
const UNDO_ICON = '↶';
const REDO_ICON = '↷';

function fitTextToWidth(text: string, width: number, textWidth: (text: string) => number): string {
  if (textWidth(text) <= width) return text;
  const suffix = '...';
  const suffixWidth = textWidth(suffix);
  if (suffixWidth > width) return '';

  let end = text.length;
  while (end > 0 && textWidth(`${text.slice(0, end)}${suffix}`) > width) {
    end -= 1;
  }
  return `${text.slice(0, end)}${suffix}`;
}

function pushDivider(dividers: NativeTopBarDividerGeometry[], x: number, height: number): void {
  dividers.push({
    x,
    y: Math.round((height - DIVIDER_HEIGHT) / 2),
    height: DIVIDER_HEIGHT,
  });
}

export function createNativeTopBarLayout(input: NativeTopBarLayoutInput): NativeTopBarLayout {
  const height = input.height;
  const buttonY = Math.round((height - BUTTON_HEIGHT) / 2);
  const textY = Math.round(height / 2 + 5);
  const buttons: NativeTopBarButtonGeometry[] = [];
  const dividers: NativeTopBarDividerGeometry[] = [];

  const rawSymbolText = input.symbol || '';
  const maxSymbolWidth = Math.max(44, Math.min(56, input.width * 0.16));
  const symbolText = fitTextToWidth(rawSymbolText, maxSymbolWidth, input.titleTextWidth);
  const symbolWidth = Math.min(Math.ceil(input.titleTextWidth(symbolText)), maxSymbolWidth);
  const symbol: NativeTopBarTextGeometry = {
    text: symbolText,
    x: HORIZONTAL_PADDING,
    y: textY,
    color: input.textColor,
    font: 'title',
  };
  const symbolChevronWidth = SYMBOL_CHEVRON_WIDTH;
  const symbolChevron: NativeTopBarTextGeometry | null =
    symbolText.length > 0
      ? {
          text: SYMBOL_CHEVRON,
          x: HORIZONTAL_PADDING + symbolWidth + SYMBOL_CHEVRON_GAP,
          y: textY,
          color: input.mutedTextColor,
          font: 'text',
        }
      : null;
  const symbolHitRect: NativeTopBarHitRectGeometry | null =
    symbolText.length > 0
      ? {
          x: 0,
          y: 0,
          width: Math.ceil(symbolWidth + (symbolChevron ? SYMBOL_CHEVRON_GAP + 16 : 0) + HORIZONTAL_PADDING * 2),
          height,
        }
      : null;

  let rightX = input.width - HORIZONTAL_PADDING;
  const actionButtons: NativeTopBarButtonGeometry[] = [];
  for (const action of [
    { type: 'redo' as const, text: REDO_ICON },
    { type: 'undo' as const, text: UNDO_ICON },
  ]) {
    const enabled = action.type === 'undo' ? input.undoEnabled === true : input.redoEnabled === true;
    rightX -= ACTION_BUTTON_WIDTH;
    if (rightX < HORIZONTAL_PADDING) break;
    const button: NativeTopBarButtonGeometry = {
      type: action.type,
      text: action.text,
      enabled,
      x: rightX,
      y: buttonY,
      width: ACTION_BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      textX: Math.round(rightX + (ACTION_BUTTON_WIDTH - input.textWidth(action.text)) / 2),
      textY,
      textColor: input.mutedTextColor,
    };
    actionButtons.push(button);
    rightX -= BUTTON_GAP;
  }

  const indicatorsWidth = Math.max(
    72,
    Math.ceil(input.textWidth(INDICATORS_LABEL)) + INDICATORS_ICON_WIDTH + INDICATORS_ICON_GAP + 8,
  );
  rightX -= GROUP_GAP + indicatorsWidth;
  if (rightX >= HORIZONTAL_PADDING) {
    const button: NativeTopBarButtonGeometry = {
      type: 'indicators',
      text: INDICATORS_LABEL,
      enabled: input.indicatorsEnabled === true,
      x: rightX,
      y: buttonY,
      width: indicatorsWidth,
      height: BUTTON_HEIGHT,
      textX: rightX + INDICATORS_ICON_WIDTH + INDICATORS_ICON_GAP + 4,
      textY,
      textColor: input.mutedTextColor,
    };
    buttons.push(button);
    pushDivider(dividers, Math.max(HORIZONTAL_PADDING, button.x - Math.ceil(GROUP_GAP / 2)), height);
    rightX -= GROUP_GAP;
  }

  if (actionButtons.length > 0) {
    rightX = Math.min(rightX, actionButtons[0].x - GROUP_GAP);
  }

  let x = HORIZONTAL_PADDING + symbolWidth + (symbolChevron ? SYMBOL_CHEVRON_GAP + symbolChevronWidth : 0) + GROUP_GAP;
  if (x < rightX) {
    pushDivider(dividers, x, height);
    x += GROUP_GAP;
  }

  const timeframeCandidates = input.timeframes.map(
    (timeframe): NativeTopBarTimeframeCandidate => ({
      timeframe,
      width: Math.max(
        MIN_TIMEFRAME_BUTTON_WIDTH,
        Math.ceil(input.textWidth(timeframe.shortLabel)) + BUTTON_PADDING_X * 2,
      ),
    }),
  );
  const visibleTimeframes: NativeTopBarTimeframeCandidate[] = [];
  let usedTimeframeWidth = 0;
  const maxTimeframeWidth = Math.max(0, rightX - x);
  for (const candidate of timeframeCandidates) {
    const nextWidth = usedTimeframeWidth + (visibleTimeframes.length > 0 ? BUTTON_GAP : 0) + candidate.width;
    if (nextWidth > maxTimeframeWidth) break;
    visibleTimeframes.push(candidate);
    usedTimeframeWidth = nextWidth;
  }

  const activeTimeframe = timeframeCandidates.find((candidate) => candidate.timeframe.value === input.interval);
  if (activeTimeframe && !visibleTimeframes.some((candidate) => candidate.timeframe.value === input.interval)) {
    while (
      visibleTimeframes.length > 0 &&
      usedTimeframeWidth + BUTTON_GAP + activeTimeframe.width > maxTimeframeWidth
    ) {
      const removed = visibleTimeframes.pop();
      if (!removed) break;
      usedTimeframeWidth -= removed.width + (visibleTimeframes.length > 0 ? BUTTON_GAP : 0);
    }
    const activeWidth = usedTimeframeWidth + (visibleTimeframes.length > 0 ? BUTTON_GAP : 0) + activeTimeframe.width;
    if (activeWidth <= maxTimeframeWidth) {
      visibleTimeframes.push(activeTimeframe);
    }
  }

  for (const candidate of visibleTimeframes) {
    const { timeframe } = candidate;
    const label = timeframe.shortLabel;
    const buttonWidth = candidate.width;
    const active = timeframe.value === input.interval;
    const button: NativeTopBarButtonGeometry = {
      type: 'timeframe',
      interval: timeframe.value,
      text: label,
      enabled: true,
      x,
      y: buttonY,
      width: buttonWidth,
      height: BUTTON_HEIGHT,
      textX: Math.round(x + (buttonWidth - input.textWidth(label)) / 2),
      textY,
      textColor: active ? input.activeTextColor : input.mutedTextColor,
      backgroundColor: active ? input.activeBackgroundColor : undefined,
    };
    buttons.push(button);
    x += buttonWidth + BUTTON_GAP;
  }

  if (actionButtons.length > 0) {
    const leftActionButton = actionButtons.reduce((minX, button) => Math.min(minX, button.x), input.width);
    pushDivider(dividers, Math.max(HORIZONTAL_PADDING, leftActionButton - GROUP_GAP), height);
  }

  actionButtons.reverse();
  for (const button of actionButtons) {
    buttons.push(button);
  }

  buttons.sort((a, b) => a.x - b.x);

  return {
    height,
    symbol,
    symbolChevron,
    symbolHitRect,
    buttons,
    dividers,
  };
}

export function createNativeTopBarTimeframes(input: NativeTopBarTimeframesInput): TimeframeOption[] {
  const selectedValues =
    input.supportedResolutions && input.supportedResolutions.length > 0
      ? new Set<ResolutionString>(input.supportedResolutions)
      : input.defaultVisibleValues;
  const selectedTimeframes = input.timeframes.filter((timeframe) => selectedValues.has(timeframe.value));
  const fallbackTimeframes =
    selectedTimeframes.length > 0
      ? selectedTimeframes
      : input.timeframes.filter((timeframe) => input.defaultVisibleValues.has(timeframe.value));
  const activeTimeframe = input.timeframes.find((timeframe) => timeframe.value === input.interval) ?? {
    value: input.interval,
    label: input.interval,
    shortLabel: input.interval,
  };

  if (fallbackTimeframes.some((timeframe) => timeframe.value === activeTimeframe.value)) {
    return fallbackTimeframes;
  }

  return [activeTimeframe, ...fallbackTimeframes.filter((timeframe) => timeframe.value !== activeTimeframe.value)];
}
