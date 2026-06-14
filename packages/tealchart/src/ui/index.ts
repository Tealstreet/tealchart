/**
 * UI module - Vanilla DOM components for the chart
 *
 * Provides framework-agnostic UI components that can be used
 * without React or any other framework.
 */

// Base component system
export { Component, TemplateComponent, type ComponentOptions } from './Component';

// DOM utilities
export {
  h,
  div,
  span,
  button,
  input,
  select,
  label,
  clear,
  append,
  setCssVars,
  applyStyles,
  toggleClass,
  svg,
  icons,
  type ElementProps,
} from './dom';

// Modal components
export { Modal, type ModalOptions, type ModalState } from './Modal';
export { IndicatorsModal, type IndicatorsModalOptions } from './IndicatorsModal';
export {
  IndicatorSettingsModal,
  type IndicatorSettingsModalOptions,
  type ActiveIndicator,
} from './IndicatorSettingsModal';

// Context menu
export { ContextMenu, showContextMenu, type ContextMenuOptions } from './ContextMenu';

// Toolbar components
export { ChartTopBar, type ChartTopBarOptions } from './ChartTopBar';
export { UserDrawingObjectTreePanel, type UserDrawingObjectTreePanelOptions } from './UserDrawingObjectTreePanel';
export { UserDrawingPropertiesPanel, type UserDrawingPropertiesPanelOptions } from './UserDrawingPropertiesPanel';

// Legend component
export {
  ChartLegend,
  type ChartLegendOptions,
  type ActiveIndicator as LegendActiveIndicator,
  type IndicatorPaneInfo as LegendIndicatorPaneInfo,
} from './ChartLegend';

// Core chart component
export { ChartCore, type ChartCoreOptions, type IndicatorPaneInfo } from './ChartCore';
