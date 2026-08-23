import type { TimeframeOption } from '../../state/chartState';
import type { ResolutionString } from '../../types';

export type NativeTopBarActionType = 'symbol' | 'timeframe' | 'indicators' | 'layout' | 'undo' | 'redo';

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
  scrollAreaX: number;
  scrollContentWidth: number;
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
  layoutName?: string | null;
  layoutSelectorEnabled?: boolean;
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
const SYMBOL_CHEVRON_GAP = 5;
const INDICATORS_LABEL = 'Indicators';
const INDICATORS_ICON_WIDTH = 16;
const INDICATORS_ICON_GAP = 4;
const LAYOUT_LABEL = 'Layout';
const LAYOUT_CHEVRON_WIDTH = 13;
const LAYOUT_CHEVRON_GAP = 3;
const LAYOUT_MIN_WIDTH = 54;
const LAYOUT_MAX_WIDTH = 104;
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

function sumButtonWidths(widths: readonly number[]): number {
  if (widths.length === 0) return 0;
  return widths.reduce((total, width) => total + width, 0) + BUTTON_GAP * (widths.length - 1);
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

  const timeframeCandidates = input.timeframes.map((timeframe): NativeTopBarTimeframeCandidate => ({
    timeframe,
    width: Math.max(
      MIN_TIMEFRAME_BUTTON_WIDTH,
      Math.ceil(input.textWidth(timeframe.shortLabel)) + BUTTON_PADDING_X * 2,
    ),
  }));
  const scrollAreaX =
    (symbolHitRect ? symbolHitRect.x + symbolHitRect.width : HORIZONTAL_PADDING) +
    (symbolChevron ? GROUP_GAP : HORIZONTAL_PADDING);
  const timeframeWidth = sumButtonWidths(timeframeCandidates.map((candidate) => candidate.width));

  const rawLayoutLabel = input.layoutName?.trim() || LAYOUT_LABEL;
  const resolvedLayoutWidth = input.layoutSelectorEnabled
    ? Math.min(
        LAYOUT_MAX_WIDTH,
        Math.max(
          LAYOUT_MIN_WIDTH,
          Math.ceil(input.textWidth(rawLayoutLabel)) + BUTTON_PADDING_X * 2 + LAYOUT_CHEVRON_GAP + LAYOUT_CHEVRON_WIDTH,
        ),
      )
    : 0;
  const indicatorsWidth = Math.max(
    72,
    Math.ceil(input.textWidth(INDICATORS_LABEL)) + INDICATORS_ICON_WIDTH + INDICATORS_ICON_GAP + 8,
  );
  const actionButtonsWidth = ACTION_BUTTON_WIDTH * 2 + BUTTON_GAP;
  const rightControlsWidth =
    indicatorsWidth + GROUP_GAP + actionButtonsWidth + (resolvedLayoutWidth > 0 ? GROUP_GAP + resolvedLayoutWidth : 0);
  const visibleLaneWidth = Math.max(0, input.width - scrollAreaX);

  let x = 0;
  for (const candidate of timeframeCandidates) {
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
  if (timeframeCandidates.length > 0) {
    x -= BUTTON_GAP;
  }

  const spacerBeforeRightControls = Math.max(
    GROUP_GAP,
    visibleLaneWidth - x - GROUP_GAP - rightControlsWidth - HORIZONTAL_PADDING,
  );
  x += spacerBeforeRightControls;
  pushDivider(dividers, Math.max(0, x - Math.ceil(GROUP_GAP / 2)), height);

  const indicatorsButton: NativeTopBarButtonGeometry = {
    type: 'indicators',
    text: INDICATORS_LABEL,
    enabled: input.indicatorsEnabled === true,
    x,
    y: buttonY,
    width: indicatorsWidth,
    height: BUTTON_HEIGHT,
    textX: x + INDICATORS_ICON_WIDTH + INDICATORS_ICON_GAP + 4,
    textY,
    textColor: input.mutedTextColor,
  };
  buttons.push(indicatorsButton);
  x += indicatorsWidth + GROUP_GAP;
  pushDivider(dividers, Math.max(0, x - Math.ceil(GROUP_GAP / 2)), height);

  for (const action of [
    { type: 'undo' as const, text: UNDO_ICON, enabled: input.undoEnabled === true },
    { type: 'redo' as const, text: REDO_ICON, enabled: input.redoEnabled === true },
  ]) {
    buttons.push({
      type: action.type,
      text: action.text,
      enabled: action.enabled,
      x,
      y: buttonY,
      width: ACTION_BUTTON_WIDTH,
      height: BUTTON_HEIGHT,
      textX: Math.round(x + (ACTION_BUTTON_WIDTH - input.textWidth(action.text)) / 2),
      textY,
      textColor: input.mutedTextColor,
    });
    x += ACTION_BUTTON_WIDTH + BUTTON_GAP;
  }
  x -= BUTTON_GAP;

  if (resolvedLayoutWidth > 0) {
    x += GROUP_GAP;
    pushDivider(dividers, Math.max(0, x - Math.ceil(GROUP_GAP / 2)), height);
    const text = fitTextToWidth(
      rawLayoutLabel,
      resolvedLayoutWidth - BUTTON_PADDING_X * 2 - LAYOUT_CHEVRON_GAP - LAYOUT_CHEVRON_WIDTH,
      input.textWidth,
    );
    const textAndCaretWidth = input.textWidth(text) + LAYOUT_CHEVRON_GAP + LAYOUT_CHEVRON_WIDTH;
    buttons.push({
      type: 'layout',
      text,
      enabled: true,
      x,
      y: buttonY,
      width: resolvedLayoutWidth,
      height: BUTTON_HEIGHT,
      textX: Math.round(x + (resolvedLayoutWidth - textAndCaretWidth) / 2),
      textY,
      textColor: input.mutedTextColor,
    });
    x += resolvedLayoutWidth;
  }

  const scrollContentWidth = Math.max(visibleLaneWidth, x + HORIZONTAL_PADDING);

  buttons.sort((a, b) => a.x - b.x);

  return {
    height,
    symbol,
    symbolChevron,
    symbolHitRect,
    scrollAreaX,
    scrollContentWidth,
    buttons,
    dividers,
  };
}

export function createNativeTopBarTimeframes(input: NativeTopBarTimeframesInput): TimeframeOption[] {
  const supportedValues =
    input.supportedResolutions && input.supportedResolutions.length > 0
      ? new Set<ResolutionString>(input.supportedResolutions)
      : new Set(input.timeframes.map((timeframe) => timeframe.value));
  const selectedTimeframes = input.timeframes.filter(
    (timeframe) => input.defaultVisibleValues.has(timeframe.value) && supportedValues.has(timeframe.value),
  );
  const fallbackTimeframes =
    selectedTimeframes.length > 0
      ? selectedTimeframes
      : input.timeframes.filter((timeframe) => supportedValues.has(timeframe.value));
  const activeTimeframe = input.timeframes.find((timeframe) => timeframe.value === input.interval) ?? {
    value: input.interval,
    label: input.interval,
    shortLabel: input.interval,
    group: 'minutes',
  };

  if (fallbackTimeframes.some((timeframe) => timeframe.value === activeTimeframe.value)) {
    return fallbackTimeframes;
  }

  return [activeTimeframe, ...fallbackTimeframes.filter((timeframe) => timeframe.value !== activeTimeframe.value)];
}
