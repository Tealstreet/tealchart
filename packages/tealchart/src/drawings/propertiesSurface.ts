import type {
  UserDrawingCommand,
  UserDrawingCommandSource,
} from './commands';
import type {
  UpdateUserDrawingOptions,
} from './input';
import type {
  UserDrawing,
  UserDrawingBarsPatternDisplayMode,
  UserDrawingFontFamily,
  UserDrawingFontStyle,
  UserDrawingFontWeight,
  UserDrawingIconName,
  UserDrawingLineStyle,
  UserDrawingMeasurementLabelPosition,
  UserDrawingRiskRewardLabelAlignment,
  UserDrawingRiskRewardStatsMode,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAlign,
  UserDrawingTextMaxWidth,
  UserDrawingTrendLineExtend,
  UserDrawingVolumeProfileRowCount,
  UserDrawingVolumeProfileValueAreaRatio,
  UserDrawingVolumeProfileWidthRatio,
} from './types';

import {
  DEFAULT_USER_DRAWING_MEASUREMENT_LABEL_POSITION,
  DEFAULT_USER_DRAWING_BARS_PATTERN_DISPLAY_MODE,
  DEFAULT_USER_DRAWING_BARS_PATTERN_DOWN_COLOR,
  DEFAULT_USER_DRAWING_BARS_PATTERN_UP_COLOR,
  DEFAULT_USER_DRAWING_RISK_REWARD_STATS_MODE,
  DEFAULT_USER_DRAWING_RISK_REWARD_LABEL_ALIGNMENT,
  DEFAULT_USER_DRAWING_VOLUME_PROFILE_ROW_COUNT,
  DEFAULT_USER_DRAWING_VOLUME_PROFILE_VALUE_AREA_RATIO,
  DEFAULT_USER_DRAWING_VOLUME_PROFILE_WIDTH_RATIO,
  DEFAULT_USER_DRAWING_STYLE,
  isUserDrawingPathFamilyTool,
  normalizeUserDrawingMeasurementLabelPosition,
  normalizeUserDrawingBarsPatternDisplayMode,
  normalizeUserDrawingOpacity,
  normalizeUserDrawingRiskRewardStatsMode,
  normalizeUserDrawingRiskRewardLabelAlignment,
  normalizeUserDrawingVolumeProfileRowCount,
  normalizeUserDrawingVolumeProfileValueAreaRatio,
  normalizeUserDrawingVolumeProfileWidthRatio,
} from './types';
import {
  type UserDrawingBrushTemplateId,
  getUserDrawingLineWidthDescriptors,
  getUserDrawingBrushTemplateDescriptors,
  getUserDrawingFillOpacityDescriptors,
  getUserDrawingOpacityDescriptors,
  getSelectedUserDrawing,
  supportsUserDrawingBarsPatternColorControls,
  supportsUserDrawingBarsPatternDisplayModeControls,
  supportsUserDrawingFillColorControls,
  supportsUserDrawingFillVisibilityControls,
  supportsUserDrawingIconControls,
  supportsUserDrawingMeasurementLabelPositionControls,
  supportsUserDrawingGeneratedLabelVisibilityControls,
  supportsUserDrawingRichTextControls,
  supportsUserDrawingRiskRewardStatsModeControls,
  supportsUserDrawingRiskRewardLabelAlignmentControls,
  supportsUserDrawingTextAlignControls,
  supportsUserDrawingTextAppearanceControls,
  supportsUserDrawingTextWrapControls,
  supportsUserDrawingTrendLineExtendControls,
  supportsUserDrawingVolumeProfileGuideControls,
  supportsUserDrawingVolumeProfileRowCountControls,
  supportsUserDrawingVolumeProfileValueAreaControls,
  supportsUserDrawingVolumeProfileWidthControls,
  USER_DRAWING_BARS_PATTERN_DOWN_COLOR_DESCRIPTORS,
  USER_DRAWING_BARS_PATTERN_DISPLAY_MODE_DESCRIPTORS,
  USER_DRAWING_BARS_PATTERN_UP_COLOR_DESCRIPTORS,
  USER_DRAWING_FILL_COLOR_DESCRIPTORS,
  USER_DRAWING_FONT_FAMILY_DESCRIPTORS,
  USER_DRAWING_FONT_SIZE_DESCRIPTORS,
  USER_DRAWING_FONT_STYLE_DESCRIPTORS,
  USER_DRAWING_FONT_WEIGHT_DESCRIPTORS,
  USER_DRAWING_ICON_NAME_DESCRIPTORS,
  USER_DRAWING_MEASUREMENT_LABEL_POSITION_DESCRIPTORS,
  USER_DRAWING_LINE_COLOR_DESCRIPTORS,
  USER_DRAWING_LINE_STYLE_DESCRIPTORS,
  USER_DRAWING_RISK_REWARD_STATS_MODE_DESCRIPTORS,
  USER_DRAWING_RISK_REWARD_LABEL_ALIGNMENT_DESCRIPTORS,
  USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS,
  USER_DRAWING_TEXT_ALIGN_DESCRIPTORS,
  USER_DRAWING_TEXT_COLOR_DESCRIPTORS,
  USER_DRAWING_TEXT_DECORATION_DESCRIPTORS,
  USER_DRAWING_TEXT_MAX_WIDTH_DESCRIPTORS,
  USER_DRAWING_TEXT_WRAP_DESCRIPTORS,
  USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS,
  USER_DRAWING_VOLUME_PROFILE_ROW_COUNT_DESCRIPTORS,
  USER_DRAWING_VOLUME_PROFILE_VALUE_AREA_RATIO_DESCRIPTORS,
  USER_DRAWING_VOLUME_PROFILE_WIDTH_RATIO_DESCRIPTORS,
} from './toolbar';

export type UserDrawingPropertiesSurfaceCommand =
  | { type: 'updateStyle'; style: Partial<UserDrawingStyle> }
  | { type: 'setTextAlign'; textAlign: UserDrawingTextAlign }
  | { type: 'setTrendLineExtend'; extend: UserDrawingTrendLineExtend }
  | { type: 'setIconName'; iconName: UserDrawingIconName };

interface UserDrawingPropertiesSurfaceControlBase {
  id: string;
  label: string;
  selected: boolean;
  enabled?: boolean;
  command: UserDrawingPropertiesSurfaceCommand;
}

type ResolvedUserDrawingPropertiesSurfaceControl = UserDrawingPropertiesSurfaceControl & { enabled: boolean };

export type UserDrawingPropertiesSurfaceControl =
  | (UserDrawingPropertiesSurfaceControlBase & {
      type: 'swatch';
      value: string;
    })
  | (UserDrawingPropertiesSurfaceControlBase & {
      type: 'option';
      icon?: string;
      value:
        | number
        | boolean
        | UserDrawingFontFamily
        | UserDrawingFontStyle
        | UserDrawingFontWeight
        | UserDrawingIconName
        | UserDrawingLineStyle
        | UserDrawingMeasurementLabelPosition
        | UserDrawingRiskRewardLabelAlignment
        | UserDrawingBrushTemplateId
        | UserDrawingBarsPatternDisplayMode
        | UserDrawingRiskRewardStatsMode
        | UserDrawingTextAlign
        | UserDrawingTextMaxWidth
        | UserDrawingTrendLineExtend
        | UserDrawingVolumeProfileRowCount
        | UserDrawingVolumeProfileValueAreaRatio
        | UserDrawingVolumeProfileWidthRatio;
    });

type UserDrawingPropertiesSurfaceControlDraft = Omit<UserDrawingPropertiesSurfaceControl, 'enabled'>;

export interface UserDrawingPropertiesSurfaceGroup {
  id: 'template' | 'line' | 'fill' | 'text' | 'geometry' | 'labels' | 'pattern' | 'position' | 'icon';
  label: string;
  controls: readonly UserDrawingPropertiesSurfaceControl[];
}

interface UserDrawingPropertiesSurfaceGroupDraft {
  id: UserDrawingPropertiesSurfaceGroup['id'];
  label: string;
  controls: readonly UserDrawingPropertiesSurfaceControlDraft[];
}

export interface UserDrawingPropertiesSurface {
  drawing: UserDrawing | null;
  editable: boolean;
  groups: readonly UserDrawingPropertiesSurfaceGroup[];
}

export interface ResolveUserDrawingPropertiesSurfaceCommandOptions extends UpdateUserDrawingOptions {
  source?: Extract<UserDrawingCommandSource, 'api' | 'toolbar'>;
}

function normalizeSurfaceColor(value: string | undefined): string {
  return (value ?? '').toLowerCase().replace(/\s+/g, '');
}

function colorsMatch(a: string | undefined, b: string): boolean {
  return normalizeSurfaceColor(a) === normalizeSurfaceColor(b);
}

function styleMatchesTemplate(drawing: UserDrawing, style: Partial<UserDrawingStyle>): boolean {
  return (
    (style.lineColor === undefined || colorsMatch(drawing.style.lineColor, style.lineColor)) &&
    (style.lineWidth === undefined || drawing.style.lineWidth === style.lineWidth) &&
    (style.lineStyle === undefined || drawing.style.lineStyle === style.lineStyle) &&
    (style.opacity === undefined || normalizeUserDrawingOpacity(drawing.style.opacity ?? 1) === style.opacity)
  );
}

function enablePropertiesSurfaceControl(
  control: UserDrawingPropertiesSurfaceControlDraft,
  enabled: boolean,
): UserDrawingPropertiesSurfaceControl {
  return { ...control, enabled } as ResolvedUserDrawingPropertiesSurfaceControl;
}

export function resolveUserDrawingPropertiesSurfaceCommand(
  command: UserDrawingPropertiesSurfaceCommand,
  options: ResolveUserDrawingPropertiesSurfaceCommandOptions = {},
): UserDrawingCommand {
  const { source = 'toolbar', ...updateOptions } = options;
  const meta = { source };

  if (command.type === 'updateStyle') {
    return { type: 'updateStyle', style: command.style, options: updateOptions, meta };
  }
  if (command.type === 'setTextAlign') {
    return { type: 'setTextAlign', textAlign: command.textAlign, options: updateOptions, meta };
  }
  if (command.type === 'setTrendLineExtend') {
    return { type: 'setTrendLineExtend', extend: command.extend, options: updateOptions, meta };
  }
  return { type: 'setIconName', iconName: command.iconName, options: updateOptions, meta };
}

export function resolveUserDrawingPropertiesSurface(state: UserDrawingState, drawingId?: string): UserDrawingPropertiesSurface {
  const drawing = drawingId
    ? state.drawings.find((candidate) => candidate.id === drawingId) ?? null
    : getSelectedUserDrawing(state);
  if (!drawing) return { drawing: null, editable: false, groups: [] };

  const editable = !drawing.locked;
  const lineWidthDescriptors = getUserDrawingLineWidthDescriptors(drawing);
  const opacityDescriptors = getUserDrawingOpacityDescriptors(drawing);
  const brushTemplateDescriptors = getUserDrawingBrushTemplateDescriptors(drawing);
  const fillOpacityDescriptors = getUserDrawingFillOpacityDescriptors(drawing);
  const currentFillOpacity = normalizeUserDrawingOpacity(
    drawing.style.fillOpacity ?? DEFAULT_USER_DRAWING_STYLE.fillOpacity ?? 1,
  );
  const groups: UserDrawingPropertiesSurfaceGroupDraft[] = [
    ...(brushTemplateDescriptors.length > 0
      ? [
          {
            id: 'template' as const,
            label: 'Templates',
            controls: brushTemplateDescriptors.map((descriptor) => ({
              id: `template:${descriptor.template}`,
              type: 'option' as const,
              label: descriptor.label,
              icon: descriptor.icon,
              value: descriptor.template,
              selected: styleMatchesTemplate(drawing, descriptor.style),
              command: { type: 'updateStyle' as const, style: descriptor.style },
            })),
          },
        ]
      : []),
    {
      id: 'line',
      label: isUserDrawingPathFamilyTool(drawing.kind) ? 'Stroke' : 'Line',
      controls: [
        ...USER_DRAWING_LINE_COLOR_DESCRIPTORS.map((descriptor) => ({
          id: `lineColor:${descriptor.color}`,
          type: 'swatch' as const,
          label: descriptor.label,
          value: descriptor.color,
          selected: colorsMatch(drawing.style.lineColor, descriptor.color),
          command: { type: 'updateStyle' as const, style: { lineColor: descriptor.color } },
        })),
        ...lineWidthDescriptors.map((descriptor) => ({
          id: `lineWidth:${descriptor.width}`,
          type: 'option' as const,
          label: descriptor.label,
          value: descriptor.width,
          selected: drawing.style.lineWidth === descriptor.width,
          command: { type: 'updateStyle' as const, style: { lineWidth: descriptor.width } },
        })),
        ...USER_DRAWING_LINE_STYLE_DESCRIPTORS.map((descriptor) => ({
          id: `lineStyle:${descriptor.lineStyle}`,
          type: 'option' as const,
          label: descriptor.label,
          icon: descriptor.icon,
          value: descriptor.lineStyle,
          selected: drawing.style.lineStyle === descriptor.lineStyle,
          command: { type: 'updateStyle' as const, style: { lineStyle: descriptor.lineStyle } },
        })),
        ...opacityDescriptors.map((descriptor) => ({
          id: `opacity:${descriptor.opacity}`,
          type: 'option' as const,
          label: descriptor.label,
          value: descriptor.opacity,
          selected: drawing.style.opacity === descriptor.opacity,
          command: { type: 'updateStyle' as const, style: { opacity: descriptor.opacity } },
        })),
      ],
    },
  ];

  if (supportsUserDrawingFillColorControls(drawing) || supportsUserDrawingFillVisibilityControls(drawing)) {
    groups.push({
      id: 'fill',
      label: 'Fill',
      controls: [
        ...(supportsUserDrawingFillColorControls(drawing)
          ? USER_DRAWING_FILL_COLOR_DESCRIPTORS.map((descriptor) => ({
              id: `fillColor:${descriptor.fillColor}`,
              type: 'swatch' as const,
              label: descriptor.label,
              value: descriptor.fillColor,
              selected: colorsMatch(drawing.style.fillColor, descriptor.fillColor),
              command: { type: 'updateStyle' as const, style: { fillColor: descriptor.fillColor } },
            }))
          : []),
        ...fillOpacityDescriptors.map((descriptor) => ({
          id: `fillOpacity:${descriptor.opacity}`,
          type: 'option' as const,
          label: descriptor.label,
          value: descriptor.opacity,
          selected: currentFillOpacity === descriptor.opacity,
          command: { type: 'updateStyle' as const, style: { fillOpacity: descriptor.opacity } },
        })),
        ...USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS.map((descriptor) => ({
          id: `${descriptor.style}:${drawing.style[descriptor.style] !== false}`,
          type: 'option' as const,
          label: descriptor.label,
          icon: descriptor.icon,
          value: drawing.style[descriptor.style] !== false,
          selected: drawing.style[descriptor.style] !== false,
          command: { type: 'updateStyle' as const, style: { [descriptor.style]: drawing.style[descriptor.style] === false } },
        })),
      ],
    });
  }

  if (
    supportsUserDrawingTextAppearanceControls(drawing) ||
    supportsUserDrawingGeneratedLabelVisibilityControls(drawing)
  ) {
    groups.push({
      id: 'text',
      label: 'Text',
      controls: [
        ...(supportsUserDrawingTextAppearanceControls(drawing)
          ? [
              ...USER_DRAWING_TEXT_COLOR_DESCRIPTORS.map((descriptor) => ({
                id: `textColor:${descriptor.textColor}`,
                type: 'swatch' as const,
                label: descriptor.label,
                value: descriptor.textColor,
                selected: colorsMatch(drawing.style.textColor, descriptor.textColor),
                command: { type: 'updateStyle' as const, style: { textColor: descriptor.textColor } },
              })),
              ...USER_DRAWING_FONT_SIZE_DESCRIPTORS.map((descriptor) => ({
                id: `fontSize:${descriptor.fontSize}`,
                type: 'option' as const,
                label: descriptor.label,
                value: descriptor.fontSize,
                selected: drawing.style.fontSize === descriptor.fontSize,
                command: { type: 'updateStyle' as const, style: { fontSize: descriptor.fontSize } },
              })),
              ...USER_DRAWING_FONT_FAMILY_DESCRIPTORS.map((descriptor) => ({
                id: `fontFamily:${descriptor.fontFamily}`,
                type: 'option' as const,
                label: descriptor.label,
                icon: descriptor.icon,
                value: descriptor.fontFamily,
                selected: drawing.style.fontFamily === descriptor.fontFamily,
                command: { type: 'updateStyle' as const, style: { fontFamily: descriptor.fontFamily } },
              })),
              ...USER_DRAWING_FONT_WEIGHT_DESCRIPTORS.map((descriptor) => ({
                id: `fontWeight:${descriptor.fontWeight}`,
                type: 'option' as const,
                label: descriptor.label,
                icon: descriptor.icon,
                value: descriptor.fontWeight,
                selected: drawing.style.fontWeight === descriptor.fontWeight,
                command: { type: 'updateStyle' as const, style: { fontWeight: descriptor.fontWeight } },
              })),
              ...USER_DRAWING_FONT_STYLE_DESCRIPTORS.map((descriptor) => ({
                id: `fontStyle:${descriptor.fontStyle}`,
                type: 'option' as const,
                label: descriptor.label,
                icon: descriptor.icon,
                value: descriptor.fontStyle,
                selected: drawing.style.fontStyle === descriptor.fontStyle,
                command: { type: 'updateStyle' as const, style: { fontStyle: descriptor.fontStyle } },
              })),
              ...USER_DRAWING_TEXT_DECORATION_DESCRIPTORS.map((descriptor) => ({
                id: descriptor.textUnderline ? 'textUnderline' : 'textLineThrough',
                type: 'option' as const,
                label: descriptor.label,
                icon: descriptor.icon,
                value: descriptor.textUnderline
                  ? drawing.style.textUnderline === true
                  : drawing.style.textLineThrough === true,
                selected: descriptor.textUnderline
                  ? drawing.style.textUnderline === true
                  : drawing.style.textLineThrough === true,
                command: {
                  type: 'updateStyle' as const,
                  style: descriptor.textUnderline
                    ? { textUnderline: drawing.style.textUnderline !== true }
                    : { textLineThrough: drawing.style.textLineThrough !== true },
                },
              })),
              ...(supportsUserDrawingTextAlignControls(drawing)
                ? USER_DRAWING_TEXT_ALIGN_DESCRIPTORS.map((descriptor) => ({
                    id: `textAlign:${descriptor.textAlign}`,
                    type: 'option' as const,
                    label: descriptor.label,
                    icon: descriptor.icon,
                    value: descriptor.textAlign,
                    selected: 'textAlign' in drawing && drawing.textAlign === descriptor.textAlign,
                    command: { type: 'setTextAlign' as const, textAlign: descriptor.textAlign },
                  }))
                : []),
            ]
          : []),
        ...(supportsUserDrawingRichTextControls(drawing) && supportsUserDrawingTextWrapControls(drawing)
          ? [
              ...USER_DRAWING_TEXT_WRAP_DESCRIPTORS.map((descriptor) => ({
                id: `textWrap:${descriptor.textWrap}`,
                type: 'option' as const,
                label: descriptor.label,
                icon: descriptor.icon,
                value: descriptor.textWrap,
                selected: drawing.style.textWrap === descriptor.textWrap,
                command: { type: 'updateStyle' as const, style: { textWrap: descriptor.textWrap } },
              })),
              ...USER_DRAWING_TEXT_MAX_WIDTH_DESCRIPTORS.map((descriptor) => ({
                id: `textMaxWidth:${descriptor.textMaxWidth}`,
                type: 'option' as const,
                label: descriptor.label,
                value: descriptor.textMaxWidth,
                selected: drawing.style.textMaxWidth === descriptor.textMaxWidth,
                command: { type: 'updateStyle' as const, style: { textMaxWidth: descriptor.textMaxWidth } },
              })),
            ]
          : []),
        ...(supportsUserDrawingGeneratedLabelVisibilityControls(drawing)
          ? [
              {
                id: 'labelsVisible',
                type: 'option' as const,
                label: drawing.style.labelsVisible === false ? 'Show generated labels' : 'Hide generated labels',
                value: drawing.style.labelsVisible !== false,
                selected: drawing.style.labelsVisible !== false,
                command: {
                  type: 'updateStyle' as const,
                  style: { labelsVisible: drawing.style.labelsVisible === false },
                },
              },
            ]
          : []),
      ],
    });
  }

  if (supportsUserDrawingTrendLineExtendControls(drawing) && drawing.kind === 'trendLine') {
    groups.push({
      id: 'geometry',
      label: 'Geometry',
      controls: USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS.map((descriptor) => ({
        id: `extend:${descriptor.extend}`,
        type: 'option' as const,
        label: descriptor.label,
        icon: descriptor.icon,
        value: descriptor.extend,
        selected: drawing.extend === descriptor.extend,
        command: { type: 'setTrendLineExtend' as const, extend: descriptor.extend },
      })),
    });
  }

  if (supportsUserDrawingMeasurementLabelPositionControls(drawing)) {
    const currentMeasurementLabelPosition = normalizeUserDrawingMeasurementLabelPosition(
      drawing.style.measurementLabelPosition ?? DEFAULT_USER_DRAWING_MEASUREMENT_LABEL_POSITION,
    );
    groups.push({
      id: 'labels',
      label: 'Labels',
      controls: USER_DRAWING_MEASUREMENT_LABEL_POSITION_DESCRIPTORS.map((descriptor) => ({
        id: `measurementLabelPosition:${descriptor.position}`,
        type: 'option' as const,
        label: descriptor.label,
        value: descriptor.position,
        selected: currentMeasurementLabelPosition === descriptor.position,
        command: {
          type: 'updateStyle' as const,
          style: { measurementLabelPosition: descriptor.position },
        },
      })),
    });
  }

  if (supportsUserDrawingBarsPatternDisplayModeControls(drawing)) {
    const currentBarsPatternDisplayMode = normalizeUserDrawingBarsPatternDisplayMode(
      drawing.style.barsPatternDisplayMode ?? DEFAULT_USER_DRAWING_BARS_PATTERN_DISPLAY_MODE,
    );
    groups.push({
      id: 'geometry',
      label: 'Geometry',
      controls: USER_DRAWING_BARS_PATTERN_DISPLAY_MODE_DESCRIPTORS.map((descriptor) => ({
        id: `barsPatternDisplayMode:${descriptor.displayMode}`,
        type: 'option' as const,
        label: descriptor.label,
        value: descriptor.displayMode,
        selected: currentBarsPatternDisplayMode === descriptor.displayMode,
        command: {
          type: 'updateStyle' as const,
          style: { barsPatternDisplayMode: descriptor.displayMode },
        },
      })),
    });
  }

  if (supportsUserDrawingBarsPatternColorControls(drawing)) {
    groups.push({
      id: 'pattern',
      label: 'Bars Pattern',
      controls: [
        ...USER_DRAWING_BARS_PATTERN_UP_COLOR_DESCRIPTORS.map((descriptor) => ({
          id: `barsPatternUpColor:${descriptor.color}`,
          type: 'swatch' as const,
          label: descriptor.label,
          value: descriptor.color,
          selected: colorsMatch(
            drawing.style.barsPatternUpColor ?? DEFAULT_USER_DRAWING_BARS_PATTERN_UP_COLOR,
            descriptor.color,
          ),
          command: {
            type: 'updateStyle' as const,
            style: { barsPatternUpColor: descriptor.color },
          },
        })),
        ...USER_DRAWING_BARS_PATTERN_DOWN_COLOR_DESCRIPTORS.map((descriptor) => ({
          id: `barsPatternDownColor:${descriptor.color}`,
          type: 'swatch' as const,
          label: descriptor.label,
          value: descriptor.color,
          selected: colorsMatch(
            drawing.style.barsPatternDownColor ?? DEFAULT_USER_DRAWING_BARS_PATTERN_DOWN_COLOR,
            descriptor.color,
          ),
          command: {
            type: 'updateStyle' as const,
            style: { barsPatternDownColor: descriptor.color },
          },
        })),
      ],
    });
  }

  if (
    supportsUserDrawingRiskRewardStatsModeControls(drawing) ||
    supportsUserDrawingRiskRewardLabelAlignmentControls(drawing)
  ) {
    const currentRiskRewardStatsMode = normalizeUserDrawingRiskRewardStatsMode(
      drawing.style.riskRewardStatsMode ?? DEFAULT_USER_DRAWING_RISK_REWARD_STATS_MODE,
    );
    const currentRiskRewardLabelAlignment = normalizeUserDrawingRiskRewardLabelAlignment(
      drawing.style.riskRewardLabelAlignment ?? DEFAULT_USER_DRAWING_RISK_REWARD_LABEL_ALIGNMENT,
    );
    groups.push({
      id: 'position',
      label: 'Position',
      controls: [
        ...USER_DRAWING_RISK_REWARD_STATS_MODE_DESCRIPTORS.map((descriptor) => ({
          id: `riskRewardStatsMode:${descriptor.statsMode}`,
          type: 'option' as const,
          label: descriptor.label,
          value: descriptor.statsMode,
          selected: currentRiskRewardStatsMode === descriptor.statsMode,
          command: {
            type: 'updateStyle' as const,
            style: { riskRewardStatsMode: descriptor.statsMode },
          },
        })),
        ...USER_DRAWING_RISK_REWARD_LABEL_ALIGNMENT_DESCRIPTORS.map((descriptor) => ({
          id: `riskRewardLabelAlignment:${descriptor.alignment}`,
          type: 'option' as const,
          label: descriptor.label,
          value: descriptor.alignment,
          selected: currentRiskRewardLabelAlignment === descriptor.alignment,
          command: {
            type: 'updateStyle' as const,
            style: { riskRewardLabelAlignment: descriptor.alignment },
          },
        })),
      ],
    });
  }

  if (
    supportsUserDrawingVolumeProfileGuideControls(drawing) ||
    supportsUserDrawingVolumeProfileRowCountControls(drawing) ||
    supportsUserDrawingVolumeProfileValueAreaControls(drawing) ||
    supportsUserDrawingVolumeProfileWidthControls(drawing)
  ) {
    const currentVolumeProfileRowCount = normalizeUserDrawingVolumeProfileRowCount(
      drawing.style.volumeProfileRowCount ?? DEFAULT_USER_DRAWING_VOLUME_PROFILE_ROW_COUNT,
    );
    const currentVolumeProfileValueAreaRatio = normalizeUserDrawingVolumeProfileValueAreaRatio(
      drawing.style.volumeProfileValueAreaRatio ?? DEFAULT_USER_DRAWING_VOLUME_PROFILE_VALUE_AREA_RATIO,
    );
    const currentVolumeProfileWidthRatio = normalizeUserDrawingVolumeProfileWidthRatio(
      drawing.style.volumeProfileWidthRatio ?? DEFAULT_USER_DRAWING_VOLUME_PROFILE_WIDTH_RATIO,
    );
    groups.push({
      id: 'geometry',
      label: 'Geometry',
      controls: [
        ...(supportsUserDrawingVolumeProfileRowCountControls(drawing)
          ? USER_DRAWING_VOLUME_PROFILE_ROW_COUNT_DESCRIPTORS.map((descriptor) => ({
              id: `volumeProfileRowCount:${descriptor.rowCount}`,
              type: 'option' as const,
              label: descriptor.label,
              value: descriptor.rowCount,
              selected: currentVolumeProfileRowCount === descriptor.rowCount,
              command: {
                type: 'updateStyle' as const,
                style: { volumeProfileRowCount: descriptor.rowCount },
              },
            }))
          : []),
        ...(supportsUserDrawingVolumeProfileValueAreaControls(drawing)
          ? USER_DRAWING_VOLUME_PROFILE_VALUE_AREA_RATIO_DESCRIPTORS.map((descriptor) => ({
              id: `volumeProfileValueAreaRatio:${descriptor.valueAreaRatio}`,
              type: 'option' as const,
              label: descriptor.label,
              value: descriptor.valueAreaRatio,
              selected: currentVolumeProfileValueAreaRatio === descriptor.valueAreaRatio,
              command: {
                type: 'updateStyle' as const,
                style: { volumeProfileValueAreaRatio: descriptor.valueAreaRatio },
              },
            }))
          : []),
        ...(supportsUserDrawingVolumeProfileWidthControls(drawing)
          ? USER_DRAWING_VOLUME_PROFILE_WIDTH_RATIO_DESCRIPTORS.map((descriptor) => ({
              id: `volumeProfileWidthRatio:${descriptor.widthRatio}`,
              type: 'option' as const,
              label: descriptor.label,
              value: descriptor.widthRatio,
              selected: currentVolumeProfileWidthRatio === descriptor.widthRatio,
              command: {
                type: 'updateStyle' as const,
                style: { volumeProfileWidthRatio: descriptor.widthRatio },
              },
            }))
          : []),
        ...(supportsUserDrawingVolumeProfileGuideControls(drawing)
          ? [
              {
                id: 'volumeProfileGuidesVisible',
                type: 'option' as const,
                label:
                  drawing.style.volumeProfileGuidesVisible === false
                    ? 'Show volume profile guides'
                    : 'Hide volume profile guides',
                value: drawing.style.volumeProfileGuidesVisible !== false,
                selected: drawing.style.volumeProfileGuidesVisible !== false,
                command: {
                  type: 'updateStyle' as const,
                  style: { volumeProfileGuidesVisible: drawing.style.volumeProfileGuidesVisible === false },
                },
              },
            ]
          : []),
      ],
    });
  }

  if (supportsUserDrawingIconControls(drawing) && drawing.kind === 'icon') {
    groups.push({
      id: 'icon',
      label: 'Icon',
      controls: USER_DRAWING_ICON_NAME_DESCRIPTORS.map((descriptor) => ({
        id: `iconName:${descriptor.iconName}`,
        type: 'option' as const,
        label: descriptor.label,
        icon: descriptor.icon,
        value: descriptor.iconName,
        selected: drawing.iconName === descriptor.iconName,
        command: { type: 'setIconName' as const, iconName: descriptor.iconName },
      })),
    });
  }

  return {
    drawing,
    editable,
    groups: groups.map((group) => ({
      ...group,
      controls: group.controls.map((control) => enablePropertiesSurfaceControl(control, editable)),
    })),
  };
}
