/**
 * Built-in Indicators Registry
 *
 * Defines the available indicators that can be added to charts.
 * Each indicator has a name, category, and Tealscript code (or jailbreak metadata).
 */

/**
 * Input definition for jailbreak (canvas-drawing) indicators.
 * Maps to InputDefinition from @tealstreet/tealscript for the settings UI.
 */
export interface JailbreakInputDefinition {
  id: string;
  name: string;
  type: 'int' | 'float' | 'bool' | 'string' | 'color';
  defval: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

/**
 * Jailbreak indicator metadata.
 * Jailbreak indicators render directly on canvas via BarsIndicator subclasses,
 * bypassing the tealscript worker pipeline.
 */
export interface JailbreakIndicatorMeta {
  /** Input definitions for the settings UI */
  inputs: JailbreakInputDefinition[];
  /** Default input values */
  defaults: Record<string, unknown>;
  /** Palette colors (key -> display name + default color) */
  palette?: Record<string, { name: string; defaultColor: string }>;
  /** Whether to render behind candles by default */
  behindCandles?: boolean;
}

export interface BuiltinIndicator {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Category for grouping in the UI */
  category: 'tealstreet' | 'trend' | 'momentum' | 'volatility' | 'volume' | 'other';
  /** Short description */
  description?: string;
  /** Whether this indicator overlays on the price chart */
  overlay: boolean;
  /** Fixed Y-axis range for non-overlay indicators (e.g., RSI: 0-100) */
  yAxisRange?: { min: number; max: number };
  /** Tealscript code (empty string for jailbreak indicators) */
  code: string;
  /** If set, this is a jailbreak (canvas-drawing) indicator, not a tealscript one */
  jailbreak?: JailbreakIndicatorMeta;
}

/**
 * Tealstreet custom indicators (placeholders for now)
 */
const TEALSTREET_INDICATORS: BuiltinIndicator[] = [
  {
    id: 'dwmo',
    name: 'DWMO',
    category: 'tealstreet',
    description: 'Daily / Weekly / Monthly / Yearly Opens + Monday High/Low',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [
        { id: 'globalOpacity', name: 'Global Opacity', type: 'float', defval: 1, min: 0.05, max: 1, step: 0.01 },
        { id: 'lineWidth', name: 'Line Width', type: 'float', defval: 1, min: 1, max: 5, step: 0.5 },
        { id: 'labelFontSize', name: 'Label Font Size', type: 'float', defval: 11, min: 8, max: 40, step: 1 },
        { id: 'showLabels', name: 'Show Labels', type: 'bool', defval: true },
        { id: 'showDailyOpen', name: 'Show Daily Open', type: 'bool', defval: true },
        { id: 'showWeeklyOpen', name: 'Show Weekly Open', type: 'bool', defval: true },
        { id: 'showMonthlyOpen', name: 'Show Monthly Open', type: 'bool', defval: true },
        { id: 'showYearlyOpen', name: 'Show Yearly Open', type: 'bool', defval: true },
        { id: 'showMondayHigh', name: 'Show Monday High', type: 'bool', defval: false },
        { id: 'showMondayLow', name: 'Show Monday Low', type: 'bool', defval: false },
        { id: 'showPreviousDailyOpen', name: 'Show Previous Daily Open', type: 'bool', defval: false },
        { id: 'showPreviousWeeklyOpen', name: 'Show Previous Weekly Open', type: 'bool', defval: false },
        { id: 'showPreviousMonthlyOpen', name: 'Show Previous Monthly Open', type: 'bool', defval: false },
        { id: 'showPreviousYearlyOpen', name: 'Show Previous Yearly Open', type: 'bool', defval: false },
        { id: 'behindCandles', name: 'Behind Candles', type: 'bool', defval: false },
      ],
      defaults: {
        globalOpacity: 1,
        lineWidth: 1,
        labelFontSize: 11,
        showLabels: true,
        showDailyOpen: true,
        showWeeklyOpen: true,
        showMonthlyOpen: true,
        showYearlyOpen: true,
        showMondayHigh: false,
        showMondayLow: false,
        showPreviousDailyOpen: false,
        showPreviousWeeklyOpen: false,
        showPreviousMonthlyOpen: false,
        showPreviousYearlyOpen: false,
        behindCandles: false,
      },
      palette: {
        daily: { name: 'Daily Open', defaultColor: 'rgba(56, 189, 248, 0.95)' },
        weekly: { name: 'Weekly Open', defaultColor: 'rgba(52, 211, 153, 0.95)' },
        monthly: { name: 'Monthly Open', defaultColor: 'rgba(251, 146, 60, 0.95)' },
        yearly: { name: 'Yearly Open', defaultColor: 'rgba(239, 83, 80, 0.95)' },
        mondayHigh: { name: 'Monday High', defaultColor: 'rgba(255, 112, 67, 0.95)' },
        mondayLow: { name: 'Monday Low', defaultColor: 'rgba(66, 165, 245, 0.95)' },
      },
      behindCandles: false,
    },
  },
  {
    id: 'sessionBoxes',
    name: 'Session Boxes',
    category: 'tealstreet',
    description: 'Session Boxes (Asia / Europe / London / USA)',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [
        { id: 'globalOpacity', name: 'Global Opacity', type: 'float', defval: 1, min: 0.05, max: 1, step: 0.01 },
        { id: 'borderWidth', name: 'Border Width', type: 'float', defval: 1, min: 0, max: 4, step: 0.5 },
        { id: 'showLabels', name: 'Show Labels', type: 'bool', defval: true },
        { id: 'labelFontSize', name: 'Label Font Size', type: 'float', defval: 11, min: 8, max: 28, step: 1 },
        {
          id: 'timezoneOffsetMinutes',
          name: 'Timezone Offset (minutes)',
          type: 'int',
          defval: 0,
          min: -720,
          max: 840,
        },
        { id: 'maxResolutionMinutes', name: 'Max Resolution (minutes)', type: 'int', defval: 240, min: 1, max: 1440 },
        { id: 'showAsia', name: 'Show Asia', type: 'bool', defval: true },
        { id: 'asiaStartHour', name: 'Asia Start Hour', type: 'float', defval: 0, min: 0, max: 23.75, step: 0.25 },
        { id: 'asiaEndHour', name: 'Asia End Hour', type: 'float', defval: 6, min: 0, max: 23.75, step: 0.25 },
        { id: 'showEurope', name: 'Show Europe', type: 'bool', defval: true },
        {
          id: 'europeStartHour',
          name: 'Europe Start Hour',
          type: 'float',
          defval: 6,
          min: 0,
          max: 23.75,
          step: 0.25,
        },
        {
          id: 'europeEndHour',
          name: 'Europe End Hour',
          type: 'float',
          defval: 8,
          min: 0,
          max: 23.75,
          step: 0.25,
        },
        { id: 'showLondon', name: 'Show London', type: 'bool', defval: true },
        {
          id: 'londonStartHour',
          name: 'London Start Hour',
          type: 'float',
          defval: 8,
          min: 0,
          max: 23.75,
          step: 0.25,
        },
        {
          id: 'londonEndHour',
          name: 'London End Hour',
          type: 'float',
          defval: 13.5,
          min: 0,
          max: 23.75,
          step: 0.25,
        },
        { id: 'showUsa', name: 'Show USA', type: 'bool', defval: true },
        { id: 'usaStartHour', name: 'USA Start Hour', type: 'float', defval: 13.5, min: 0, max: 23.75, step: 0.25 },
        { id: 'usaEndHour', name: 'USA End Hour', type: 'float', defval: 20, min: 0, max: 23.75, step: 0.25 },
        { id: 'behindCandles', name: 'Behind Candles', type: 'bool', defval: true },
      ],
      defaults: {
        globalOpacity: 1,
        borderWidth: 1,
        showLabels: true,
        labelFontSize: 11,
        timezoneOffsetMinutes: 0,
        maxResolutionMinutes: 240,
        showAsia: true,
        asiaStartHour: 0,
        asiaEndHour: 6,
        showEurope: true,
        europeStartHour: 6,
        europeEndHour: 8,
        showLondon: true,
        londonStartHour: 8,
        londonEndHour: 13.5,
        showUsa: true,
        usaStartHour: 13.5,
        usaEndHour: 20,
        behindCandles: true,
      },
      palette: {
        asia: { name: 'Asia Session', defaultColor: 'rgba(37, 99, 235, 0.24)' },
        europe: { name: 'Europe Session', defaultColor: 'rgba(168, 85, 247, 0.2)' },
        london: { name: 'London Session', defaultColor: 'rgba(16, 185, 129, 0.2)' },
        usa: { name: 'USA Session', defaultColor: 'rgba(245, 158, 11, 0.2)' },
      },
      behindCandles: true,
    },
  },
  {
    id: 'pnlCard',
    name: 'PnL Card',
    category: 'tealstreet',
    description: 'PnL Card overlay with position info and background images',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [
        {
          id: 'selectedTemplate',
          name: 'PnL Card Template',
          type: 'string',
          defval: 'WAIFU',
          options: [
            'none',
            'Kawaii',
            'ChromaV2Dark',
            'ChromaV2Light',
            'ScalperC',
            'Mooncake',
            'Pawnzi',
            'TheDen',
            'WG',
            'WB',
            'ZcoinScott',
            'WAIFU',
            'TheLab',
            'forCasper',
            'Unpackers',
            'Sharky',
            'Ponzi',
            'CryptoTraders',
          ],
        },
        {
          id: 'randomBackgroundIndex',
          name: 'Random Background (Kawaii only)',
          type: 'int',
          defval: 0,
          min: 0,
          max: 3,
          step: 1,
        },
        {
          id: 'gradientOpacityLeft',
          name: 'Gradient Left Opacity',
          type: 'float',
          defval: 0.01,
          min: 0,
          max: 1,
          step: 0.01,
        },
        {
          id: 'gradientOpacityRight',
          name: 'Gradient Right Opacity',
          type: 'float',
          defval: 0.5,
          min: 0,
          max: 1,
          step: 0.01,
        },
        { id: 'opacity', name: 'Background Opacity', type: 'float', defval: 0.5, min: 0, max: 1, step: 0.01 },
        { id: 'textOpacity', name: 'Text Opacity', type: 'float', defval: 1.0, min: 0, max: 1, step: 0.01 },
        { id: 'scale', name: 'Zoom', type: 'float', defval: 1.0, min: 0.1, max: 3.0, step: 0.1 },
        { id: 'showTextAboveCandles', name: 'Show Text Above Candles', type: 'bool', defval: true },
        { id: 'hideText', name: 'Hide Text', type: 'bool', defval: false },
        { id: 'alignTextRight', name: 'Align Text Right', type: 'bool', defval: false },
        {
          id: 'scalingMode',
          name: 'Image Scaling Mode',
          type: 'string',
          defval: 'auto',
          options: ['auto', 'fit', 'fill', 'crop', 'stretch'],
        },
        { id: 'enableFullscreenStretch', name: 'Auto-Stretch in Fullscreen', type: 'bool', defval: true },
      ],
      defaults: {
        selectedTemplate: 'WAIFU',
        randomBackgroundIndex: 0,
        gradientOpacityLeft: 0.01,
        gradientOpacityRight: 0.5,
        opacity: 0.5,
        textOpacity: 1.0,
        scale: 1.0,
        showTextAboveCandles: true,
        hideText: false,
        alignTextRight: false,
        scalingMode: 'auto',
        enableFullscreenStretch: true,
      },
      behindCandles: true,
    },
  },
  {
    id: 'pvsraCandles',
    name: 'PVSRA Candles',
    category: 'tealstreet',
    description: 'Price Volume Spread Range Analysis candle coloring',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [
        { id: 'length', name: 'Length', type: 'int', defval: 10, min: 1, max: 100 },
        { id: 'showWicks', name: 'Show Wicks', type: 'bool', defval: true },
        { id: 'showBorders', name: 'Show Borders', type: 'bool', defval: true },
      ],
      defaults: {
        length: 10,
        showWicks: true,
        showBorders: true,
      },
      palette: {
        candleRed: { name: 'Red Vector Color', defaultColor: '#FF0000' },
        candleGreen: { name: 'Green Vector Color', defaultColor: '#00FF00' },
        candleViolet: { name: 'Violet Vector Color', defaultColor: '#A020F0' },
        candleBlue: { name: 'Blue Vector Color', defaultColor: '#0000FF' },
        candleRegularUp: { name: 'Regular Candle Up Color', defaultColor: '#808080' },
        candleRegularDown: { name: 'Regular Candle Down Color', defaultColor: '#404040' },
        wickRed: { name: 'Red Vector Wick Color', defaultColor: '#FF0000' },
        wickGreen: { name: 'Green Vector Wick Color', defaultColor: '#00FF00' },
        wickViolet: { name: 'Violet Vector Wick Color', defaultColor: '#A020F0' },
        wickBlue: { name: 'Blue Vector Wick Color', defaultColor: '#0000FF' },
        wickRegularUp: { name: 'Regular Candle Up Wick Color', defaultColor: '#808080' },
        wickRegularDown: { name: 'Regular Candle Down Wick Color', defaultColor: '#404040' },
        borderRed: { name: 'Red Vector Border Color', defaultColor: '#FF0000' },
        borderGreen: { name: 'Green Vector Border Color', defaultColor: '#00FF00' },
        borderViolet: { name: 'Violet Vector Border Color', defaultColor: '#A020F0' },
        borderBlue: { name: 'Blue Vector Border Color', defaultColor: '#0000FF' },
        borderRegularUp: { name: 'Regular Candle Up Border Color', defaultColor: '#808080' },
        borderRegularDown: { name: 'Regular Candle Down Border Color', defaultColor: '#404040' },
      },
    },
  },
  {
    id: 'pvsraCombined',
    name: 'PVSRA Combined',
    category: 'tealstreet',
    description: 'PVSRA candle coloring with volume histogram',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [
        { id: 'length', name: 'Length', type: 'int', defval: 10, min: 1, max: 100 },
        { id: 'showVolume', name: 'Show Volume', type: 'bool', defval: true },
      ],
      defaults: {
        length: 10,
        showVolume: true,
      },
      palette: {
        barRed: { name: 'Red Vector Histogram Color', defaultColor: '#FF0000' },
        barGreen: { name: 'Green Vector Histogram Color', defaultColor: '#00FF00' },
        barViolet: { name: 'Violet Vector Histogram Color', defaultColor: '#A020F0' },
        barBlue: { name: 'Blue Vector Histogram Color', defaultColor: '#0000FF' },
        barRegularUp: { name: 'Regular Candle Up Histogram Color', defaultColor: '#808080' },
        barRegularDown: { name: 'Regular Candle Down Histogram Color', defaultColor: '#404040' },
        volumeRed: { name: 'Red Vector Volume Color', defaultColor: '#8B0000' },
        volumeGreen: { name: 'Green Vector Volume Color', defaultColor: '#228B22' },
        volumeViolet: { name: 'Violet Vector Volume Color', defaultColor: '#800080' },
        volumeBlue: { name: 'Blue Vector Volume Color', defaultColor: '#00008B' },
        volumeRegularUp: { name: 'Regular Volume Up Color', defaultColor: '#808080' },
        volumeRegularDown: { name: 'Regular Volume Down Color', defaultColor: '#404040' },
      },
    },
  },
  {
    id: 'pvsraHistogram',
    name: 'PVSRA Histogram',
    category: 'tealstreet',
    description: 'Price Volume Spread Range Analysis volume histogram',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [{ id: 'length', name: 'Length', type: 'int', defval: 10, min: 1, max: 100 }],
      defaults: {
        length: 10,
      },
      palette: {
        histogramRed: { name: 'Red Vector Histogram Color', defaultColor: '#8B0000' },
        histogramGreen: { name: 'Green Vector Histogram Color', defaultColor: '#228B22' },
        histogramViolet: { name: 'Violet Vector Histogram Color', defaultColor: '#800080' },
        histogramBlue: { name: 'Blue Vector Histogram Color', defaultColor: '#00008B' },
        histogramRegularUp: { name: 'Regular Candle Up Histogram Color', defaultColor: '#808080' },
        histogramRegularDown: { name: 'Regular Candle Down Histogram Color', defaultColor: '#404040' },
      },
    },
  },
  {
    id: 'tpo',
    name: 'TPO',
    category: 'tealstreet',
    description: 'Time Price Opportunity (Market Profile)',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [
        {
          id: 'colorScheme',
          name: 'Color Scheme',
          type: 'string',
          defval: 'Gradient',
          options: ['Gradient', 'Solid'],
        },
        { id: 'globalOpacity', name: 'Global Opacity', type: 'float', defval: 1, min: 0.05, max: 1, step: 0.01 },
        { id: 'showLabels', name: 'Show Labels', type: 'bool', defval: true },
        { id: 'showLetters', name: 'Show Letters', type: 'bool', defval: true },
        { id: 'showTpoBlocks', name: 'Show TPO Blocks', type: 'bool', defval: true },
        { id: 'showVolumeProfile', name: 'Show Volume Profile', type: 'bool', defval: false },
        { id: 'showPocLines', name: 'Show POC Lines', type: 'bool', defval: true },
        { id: 'showPocHighlight', name: 'Highlight POC', type: 'bool', defval: true },
        { id: 'showVahValLines', name: 'Show VAH/VAL Lines', type: 'bool', defval: true },
        { id: 'showNvahNval', name: 'Show Untested VAH/VAL', type: 'bool', defval: false },
        { id: 'highlightSinglePrints', name: 'Highlight Single Prints', type: 'bool', defval: true },
        { id: 'requireSurroundedSinglePrints', name: 'Require Surrounded Single Prints', type: 'bool', defval: false },
        { id: 'showUntestedSinglePrints', name: 'Show Untested Single Prints', type: 'bool', defval: false },
        { id: 'valueAreaPercent', name: 'Value Area %', type: 'int', defval: 70, min: 10, max: 100, step: 5 },
        {
          id: 'sessionType',
          name: 'Session Type',
          type: 'string',
          defval: 'Daily',
          options: ['Daily', 'Weekly', 'Monthly'],
        },
        { id: 'numSessionsBackfetch', name: 'Backfetch Sessions', type: 'int', defval: 7, min: 0, max: 100, step: 1 },
        {
          id: 'blockSize',
          name: 'Block Size',
          type: 'string',
          defval: '30m',
          options: ['5m', '10m', '15m', '30m', '1h', '2h', '4h'],
        },
        {
          id: 'rowSizeMode',
          name: 'Row Size Mode',
          type: 'string',
          defval: 'Percent',
          options: ['Percent', 'Auto', 'Fixed'],
        },
        { id: 'rowSizePercent', name: 'Row Size Percent', type: 'float', defval: 0.05, min: 0.01, max: 1, step: 0.01 },
        {
          id: 'autoRowSizeGranularity',
          name: 'Row Size Auto Granularity',
          type: 'float',
          defval: 60,
          min: 1,
          max: 500,
          step: 1,
        },
        {
          id: 'fixedRowSize',
          name: 'Row Size Fixed Value',
          type: 'float',
          defval: 1,
          min: 0.01,
          max: 1000,
          step: 0.01,
        },
        { id: 'behindCandles', name: 'Behind Candles', type: 'bool', defval: false },
        { id: 'hideCandles', name: 'Hide Candles', type: 'bool', defval: false },
        { id: 'scaleBlockWidth', name: 'Scale Block Width', type: 'float', defval: 1, min: 0.1, max: 5, step: 0.01 },
        { id: 'blockInset', name: 'Block Inset', type: 'float', defval: 0.5, min: 0, max: 2, step: 0.1 },
        {
          id: 'hideProfileWidthBelow',
          name: 'Hide Current Profile Width Below',
          type: 'float',
          defval: 40,
          min: 0,
          max: 500,
          step: 1,
        },
      ],
      defaults: {
        colorScheme: 'Gradient',
        globalOpacity: 1,
        showLabels: true,
        showLetters: true,
        showTpoBlocks: true,
        showVolumeProfile: false,
        showPocLines: true,
        showPocHighlight: true,
        showVahValLines: true,
        showNvahNval: false,
        highlightSinglePrints: true,
        requireSurroundedSinglePrints: false,
        showUntestedSinglePrints: false,
        valueAreaPercent: 70,
        sessionType: 'Daily',
        numSessionsBackfetch: 7,
        blockSize: '30m',
        rowSizeMode: 'Percent',
        rowSizePercent: 0.05,
        autoRowSizeGranularity: 60,
        fixedRowSize: 1,
        behindCandles: false,
        hideCandles: false,
        scaleBlockWidth: 1,
        blockInset: 0.5,
        hideProfileWidthBelow: 40,
      },
      palette: {
        vahvalLine: { name: 'VAH/VAL Line', defaultColor: '#ff9800' },
        background: { name: 'Background', defaultColor: '#8888880A' },
        pocHighlight: { name: 'POC Highlight', defaultColor: '#ffffff' },
        singlePrintHighlight: { name: 'Single Print Highlight', defaultColor: '#4a148c' },
        singlePrintExtension: { name: 'Single Print Extension', defaultColor: '#4a148c33' },
        extremeSinglePrintHighlight: { name: 'Extreme Single Print', defaultColor: '#ff6b00' },
        solid: { name: 'Solid', defaultColor: '#22ab94cc' },
        volumeProfile: { name: 'Volume Profile', defaultColor: '#88888866' },
      },
      behindCandles: false,
    },
  },
  {
    id: 'risk',
    name: 'Risk',
    category: 'tealstreet',
    description: 'Crosshair tooltip showing position risk, side, size, and PnL',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [],
      defaults: {},
    },
  },
  {
    id: 'depthChart',
    name: 'Depth Chart',
    category: 'tealstreet',
    description: 'Depth chart overlay showing orderbook depth from multiple exchanges',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [
        { id: 'globalOpacity', name: 'Global Opacity', type: 'float', defval: 1, min: 0.1, max: 1, step: 0.1 },
        {
          id: 'mode',
          name: 'Mode',
          type: 'string',
          defval: 'Cumulative',
          options: ['Cumulative', 'Individual', 'Combined'],
        },
        { id: 'widthPercent', name: 'Width %', type: 'int', defval: 10, min: 1, max: 100 },
        { id: 'granularity', name: 'Granularity', type: 'int', defval: 1000, min: 100, max: 5000 },
        { id: 'minRepaintInterval', name: 'Repaint Interval (ms)', type: 'int', defval: 200, min: 0, max: 2000 },
        { id: 'binanceSpot', name: 'Binance Spot', type: 'bool', defval: true },
        { id: 'binanceFutures', name: 'Binance Futures', type: 'bool', defval: false },
        { id: 'activeExchange', name: 'Active Exchange', type: 'bool', defval: true },
        { id: 'allActiveExchanges', name: 'All Active Exchanges', type: 'bool', defval: true },
        { id: 'scale', name: 'Scale', type: 'bool', defval: true },
        { id: 'showOutline', name: 'Show Outline', type: 'bool', defval: true },
        { id: 'smoothSteps', name: 'Smooth Steps', type: 'bool', defval: true },
        { id: 'alignBooks', name: 'Align Books', type: 'bool', defval: true },
        { id: 'showHoverTooltip', name: 'Show Hover Tooltip', type: 'bool', defval: true },
        { id: 'showAmountsInUsd', name: 'Show Amounts in USD', type: 'bool', defval: false },
      ],
      defaults: {
        globalOpacity: 1,
        mode: 'Cumulative',
        widthPercent: 10,
        granularity: 1000,
        minRepaintInterval: 200,
        binanceSpot: true,
        binanceFutures: false,
        activeExchange: true,
        allActiveExchanges: true,
        scale: true,
        showOutline: true,
        smoothSteps: true,
        alignBooks: true,
        showHoverTooltip: true,
        showAmountsInUsd: false,
      },
      palette: {
        binanceBid: { name: 'Binance Futures Bid', defaultColor: 'rgba(14, 203, 129, 0.3)' },
        binanceAsk: { name: 'Binance Futures Ask', defaultColor: 'rgba(246, 70, 93, 0.3)' },
        binanceBidLine: { name: 'Binance Futures Bid Line', defaultColor: 'rgba(14, 203, 129, 0.8)' },
        binanceAskLine: { name: 'Binance Futures Ask Line', defaultColor: 'rgba(246, 70, 93, 0.8)' },
        binanceSpotBid: { name: 'Binance Spot Bid', defaultColor: 'rgba(14, 203, 129, 0.3)' },
        binanceSpotAsk: { name: 'Binance Spot Ask', defaultColor: 'rgba(246, 70, 93, 0.3)' },
        binanceSpotBidLine: { name: 'Binance Spot Bid Line', defaultColor: 'rgba(14, 203, 129, 0.8)' },
        binanceSpotAskLine: { name: 'Binance Spot Ask Line', defaultColor: 'rgba(246, 70, 93, 0.8)' },
        activeExchangeBid: { name: 'Active Exchange Bid', defaultColor: 'rgba(14, 203, 129, 0.3)' },
        activeExchangeAsk: { name: 'Active Exchange Ask', defaultColor: 'rgba(246, 70, 93, 0.3)' },
        activeExchangeBidLine: { name: 'Active Exchange Bid Line', defaultColor: 'rgba(14, 203, 129, 0.8)' },
        activeExchangeAskLine: { name: 'Active Exchange Ask Line', defaultColor: 'rgba(246, 70, 93, 0.8)' },
      },
      behindCandles: false,
    },
  },
  {
    id: 'heatmap',
    name: 'Heatmap',
    category: 'tealstreet',
    description: 'Order book heatmap overlay from multiple exchanges',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [
        { id: 'globalOpacity', name: 'Global Opacity', type: 'float', defval: 1, min: 0.05, max: 1, step: 0.01 },
        { id: 'minVol', name: 'Minimum Volume USD', type: 'int', defval: 75000 },
        { id: 'maxVol', name: 'Maximum Volume USD', type: 'int', defval: 6000000 },
        { id: 'numRows', name: 'Total Rows for Grouping', type: 'int', defval: 300, min: 10, max: 1000 },
        { id: 'minRepaintInterval', name: 'Repaint Interval (ms)', type: 'int', defval: 500, min: 50, max: 10000 },
        {
          id: 'colorSteepness',
          name: 'Color Distribution Steepness',
          type: 'float',
          defval: 1.5,
          min: 0.1,
          max: 3,
          step: 0.1,
        },
        { id: 'binanceSpot', name: 'Binance Spot', type: 'bool', defval: true },
        { id: 'binanceFutures', name: 'Binance Futures', type: 'bool', defval: false },
        { id: 'activeExchange', name: 'Active Exchange', type: 'bool', defval: true },
        { id: 'allActiveExchanges', name: 'All Active Exchanges', type: 'bool', defval: true },
        { id: 'scaleVolumeByBooks', name: 'Scale Volume by Number of Books', type: 'bool', defval: false },
        { id: 'showHoverTooltip', name: 'Show Hover Tooltip', type: 'bool', defval: true },
        { id: 'showAmountsInUsd', name: 'Show Amounts in USD', type: 'bool', defval: false },
        { id: 'alignBooks', name: 'Align Books', type: 'bool', defval: true },
      ],
      defaults: {
        globalOpacity: 1,
        minVol: 75000,
        maxVol: 6000000,
        numRows: 300,
        minRepaintInterval: 500,
        colorSteepness: 1.5,
        binanceSpot: true,
        binanceFutures: false,
        activeExchange: true,
        allActiveExchanges: true,
        scaleVolumeByBooks: false,
        showHoverTooltip: true,
        showAmountsInUsd: false,
        alignBooks: true,
      },
      palette: {
        0: { name: '1', defaultColor: 'rgba(124,77,255,0.28)' },
        1: { name: '2', defaultColor: 'rgba(66,135,245,0.34)' },
        2: { name: '3', defaultColor: 'rgba(38,198,218,0.42)' },
        3: { name: '4', defaultColor: 'rgba(161,218,57,0.55)' },
        4: { name: '5', defaultColor: 'rgba(255,232,84,0.72)' },
      },
      behindCandles: true,
    },
  },
  {
    id: 'heatmapAlt',
    name: 'Heatmap Alt',
    category: 'tealstreet',
    description: 'Liquidation-level heatmap with order book weighting',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [
        { id: 'globalOpacity', name: 'Global Opacity', type: 'float', defval: 1, min: 0.05, max: 1, step: 0.01 },
        { id: 'leverages', name: 'Leverages (CSV)', type: 'string', defval: '100,50,25,10' },
        { id: 'step', name: 'Price Step', type: 'float', defval: 25, min: 0.0000001, step: 0.1 },
        { id: 'autoStep', name: 'Auto Step (Price Relative)', type: 'bool', defval: true },
        {
          id: 'stepPercent',
          name: 'Auto Step Percent',
          type: 'float',
          defval: 0.035,
          min: 0.0001,
          max: 5,
          step: 0.0001,
        },
        { id: 'length', name: 'Strength SMA Length', type: 'int', defval: 60, min: 2, max: 2000 },
        { id: 'threshold', name: 'Activation Threshold', type: 'float', defval: 2, min: 0, max: 50, step: 0.1 },
        {
          id: 'opacity',
          name: 'Strength Opacity Multiplier',
          type: 'float',
          defval: 0.16,
          min: 0.01,
          max: 1,
          step: 0.01,
        },
        { id: 'minAlpha', name: 'Minimum Alpha', type: 'float', defval: 0.08, min: 0, max: 1, step: 0.01 },
        { id: 'log', name: 'Use Log Strength', type: 'bool', defval: true },
        { id: 'logScale', name: 'Log Scale', type: 'float', defval: 2, min: 0.1, max: 20, step: 0.1 },
        { id: 'maxActiveLevels', name: 'Max Active Levels', type: 'int', defval: 600, min: 50, max: 5000 },
        { id: 'minRepaintInterval', name: 'Repaint Interval (ms)', type: 'int', defval: 250, min: 0, max: 5000 },
        { id: 'useOrderBookWeighting', name: 'Use Order Book Weighting', type: 'bool', defval: true },
        { id: 'orderBookWeight', name: 'Order Book Weight', type: 'float', defval: 0.35, min: 0, max: 1, step: 0.01 },
        { id: 'orderBookDepthLevels', name: 'Order Book Depth Levels', type: 'int', defval: 200, min: 10, max: 2000 },
      ],
      defaults: {
        globalOpacity: 1,
        leverages: '100,50,25,10',
        step: 25,
        autoStep: true,
        stepPercent: 0.035,
        length: 60,
        threshold: 2,
        opacity: 0.16,
        minAlpha: 0.08,
        log: true,
        logScale: 2,
        maxActiveLevels: 600,
        minRepaintInterval: 250,
        useOrderBookWeighting: true,
        orderBookWeight: 0.35,
        orderBookDepthLevels: 200,
      },
      palette: {
        buy: { name: 'Buy Liquidity', defaultColor: 'rgba(38, 166, 154, 0.9)' },
        sell: { name: 'Sell Liquidity', defaultColor: 'rgba(239, 83, 80, 0.9)' },
      },
      behindCandles: true,
    },
  },
  {
    id: 'footprint',
    name: 'Footprints',
    category: 'tealstreet',
    description: 'Footprint chart showing bid/ask volume at each price level',
    overlay: true,
    code: '',
    jailbreak: {
      inputs: [
        { id: 'globalOpacity', name: 'Global Opacity', type: 'float', defval: 1, min: 0.05, max: 1, step: 0.01 },
        { id: 'showDelta', name: 'Show Delta', type: 'bool', defval: true },
        { id: 'showVolumeLabels', name: 'Show Volume Labels', type: 'bool', defval: true },
        { id: 'showBidAskImbalance', name: 'Show Bid/Ask Imbalance', type: 'bool', defval: false },
        { id: 'showAmountsInUsd', name: 'Show Amounts in USD', type: 'bool', defval: false },
        { id: 'drawSideCandle', name: 'Draw Side Candle', type: 'bool', defval: false },
        { id: 'hideCandles', name: 'Hide Candles', type: 'bool', defval: true },
        { id: 'alignCenter', name: 'Align Center', type: 'bool', defval: true },
        { id: 'animateChanges', name: 'Animate Changes', type: 'bool', defval: true },
        { id: 'xOffset', name: 'X Offset (bars)', type: 'int', defval: 0, min: -100, max: 100 },
        { id: 'yOffset', name: 'Y Offset (rows)', type: 'int', defval: 0, min: -100, max: 100 },
        {
          id: 'timeframe',
          name: 'Timeframe',
          type: 'string',
          defval: 'Auto',
          options: ['Auto', '30m', '1h', '2h', '4h', '12h', '1d'],
        },
        {
          id: 'rowSizeMode',
          name: 'Row Size Mode',
          type: 'string',
          defval: 'Auto',
          options: ['Percent', 'Auto', 'Fixed'],
        },
        { id: 'rowSizePercent', name: 'Row Size Percent', type: 'float', defval: 0.02, min: 0.01, max: 1, step: 0.01 },
        {
          id: 'autoRowSizeGranularity',
          name: 'Row Size Auto Granularity',
          type: 'float',
          defval: 140,
          min: 1,
          max: 500,
          step: 1,
        },
        {
          id: 'fixedRowSize',
          name: 'Row Size Fixed Value',
          type: 'float',
          defval: 1,
          min: 0.01,
          max: 1000,
          step: 0.01,
        },
        {
          id: 'imbalanceThreshold',
          name: 'Imbalance Threshold',
          type: 'float',
          defval: 3,
          min: 1.5,
          max: 10,
          step: 0.5,
        },
      ],
      defaults: {
        globalOpacity: 1,
        showDelta: true,
        showVolumeLabels: true,
        showBidAskImbalance: false,
        showAmountsInUsd: false,
        drawSideCandle: false,
        hideCandles: true,
        alignCenter: true,
        animateChanges: true,
        xOffset: 0,
        yOffset: 0,
        timeframe: 'Auto',
        rowSizeMode: 'Auto',
        rowSizePercent: 0.02,
        autoRowSizeGranularity: 140,
        fixedRowSize: 1,
        imbalanceThreshold: 3,
      },
      palette: {
        bid: { name: 'Bid Volume', defaultColor: 'rgba(239, 83, 80, 1)' },
        ask: { name: 'Ask Volume', defaultColor: 'rgba(38, 166, 154, 1)' },
        buyImbalance: { name: 'Buy Imbalance', defaultColor: 'rgba(38, 166, 154, 0.45)' },
        sellImbalance: { name: 'Sell Imbalance', defaultColor: 'rgba(239, 83, 80, 0.45)' },
        deltaPositive: { name: 'Delta Positive', defaultColor: 'rgba(38, 166, 154, 1)' },
        deltaNegative: { name: 'Delta Negative', defaultColor: 'rgba(239, 83, 80, 1)' },
        text: { name: 'Text Color', defaultColor: 'rgba(255, 255, 255, 0.35)' },
        border: { name: 'Border Color', defaultColor: 'rgba(128, 128, 128, 0.3)' },
      },
    },
  },
];

/**
 * Trend-following indicators
 */
const TREND_INDICATORS: BuiltinIndicator[] = [
  {
    id: 'sma',
    name: 'Moving Average',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("SMA", overlay=true)
length = input.int(20, "Length", minval=1)
plot(ta.sma(close, length), "SMA", color=color.blue, linewidth=2)`,
  },
  {
    id: 'ema',
    name: 'Moving Average Exponential',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("EMA", overlay=true)
length = input.int(20, "Length", minval=1)
plot(ta.ema(close, length), "EMA", color=color.orange, linewidth=2)`,
  },
  {
    id: 'wma',
    name: 'Weighted Moving Average',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("WMA", overlay=true)
length = input.int(20, "Length", minval=1)
plot(ta.wma(close, length), "WMA", color=color.purple, linewidth=2)`,
  },
  {
    id: 'hma',
    name: 'Hull Moving Average',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("HMA", overlay=true)
length = input.int(20, "Length", minval=1)
plot(ta.hma(close, length), "HMA", color=color.teal, linewidth=2)`,
  },
  {
    id: 'supertrend',
    name: 'SuperTrend',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("SuperTrend", overlay=true)
factor = input.float(3.0, "Factor", minval=0.1)
atrLength = input.int(10, "ATR Length", minval=1)
[st, dir] = ta.supertrend(factor, atrLength)
stColor = dir == 1 ? color.green : color.red
plot(st, "SuperTrend", color=stColor, linewidth=2)`,
  },
  {
    id: 'sma-cross',
    name: 'MA Cross',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("SMA Cross", overlay=true)
fastLen = input.int(10, "Fast Length", minval=1)
slowLen = input.int(20, "Slow Length", minval=1)
fastSMA = ta.sma(close, fastLen)
slowSMA = ta.sma(close, slowLen)
plot(fastSMA, "Fast SMA", color=color.blue, linewidth=1)
plot(slowSMA, "Slow SMA", color=color.red, linewidth=1)`,
  },
  {
    id: 'ema-ribbon',
    name: 'EMA Ribbon',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("EMA Ribbon", overlay=true)
plot(ta.ema(close, 8), "EMA 8", color=color.new(color.blue, 60))
plot(ta.ema(close, 13), "EMA 13", color=color.new(color.blue, 50))
plot(ta.ema(close, 21), "EMA 21", color=color.new(color.blue, 40))
plot(ta.ema(close, 34), "EMA 34", color=color.new(color.blue, 30))
plot(ta.ema(close, 55), "EMA 55", color=color.new(color.blue, 20))`,
  },
  {
    id: 'vwap',
    name: 'VWAP',
    category: 'trend',
    overlay: true,
    code: `//@version=6
indicator("VWAP", overlay=true)
plot(ta.vwap(), "VWAP", color=color.purple, linewidth=2)`,
  },
  {
    id: 'ma-cross-signals',
    name: 'MA Cross Signals',
    category: 'trend',
    description: 'Moving average crossover with buy/sell signals',
    overlay: true,
    code: `//@version=6
indicator("MA Cross Signals", overlay=true)
fastLen = input.int(10, "Fast Length", minval=1)
slowLen = input.int(20, "Slow Length", minval=1)
fastMA = ta.ema(close, fastLen)
slowMA = ta.ema(close, slowLen)
bullCross = ta.crossover(fastMA, slowMA)
bearCross = ta.crossunder(fastMA, slowMA)
plot(fastMA, "Fast MA", color=color.blue, linewidth=1)
plot(slowMA, "Slow MA", color=color.orange, linewidth=1)
plotshape(bullCross, title="Buy", style=shape.triangleup, location=location.belowbar, color=color.green, size=size.small)
plotshape(bearCross, title="Sell", style=shape.triangledown, location=location.abovebar, color=color.red, size=size.small)`,
  },
  {
    id: 'bb-filled',
    name: 'Bollinger Bands (Filled)',
    category: 'trend',
    description: 'Bollinger Bands with filled area',
    overlay: true,
    code: `//@version=6
indicator("Bollinger Bands (Filled)", overlay=true)
length = input.int(20, "Length", minval=1)
mult = input.float(2.0, "StdDev Multiplier", minval=0.1)
basis = ta.sma(close, length)
dev = mult * ta.stdev(close, length)
upper = basis + dev
lower = basis - dev
p1 = plot(upper, "Upper", color=color.blue)
p2 = plot(lower, "Lower", color=color.blue)
plot(basis, "Basis", color=color.orange, linewidth=1)
fill(p1, p2, color=color.new(color.blue, 80))`,
  },
];

/**
 * Momentum indicators
 */
const MOMENTUM_INDICATORS: BuiltinIndicator[] = [
  {
    id: 'rsi',
    name: 'Relative Strength Index',
    category: 'momentum',
    overlay: false,
    yAxisRange: { min: 0, max: 100 },
    code: `//@version=6
indicator("RSI")
length = input.int(14, "Length", minval=1)
rsiValue = ta.rsi(close, length)
plot(rsiValue, "RSI", color=color.purple, linewidth=2)
hline(70, "Overbought", color=color.red)
hline(30, "Oversold", color=color.green)
hline(50, "Middle", color=color.gray)`,
  },
  {
    id: 'macd',
    name: 'MACD',
    category: 'momentum',
    overlay: false,
    code: `//@version=6
indicator("MACD")
fastLen = input.int(12, "Fast Length")
slowLen = input.int(26, "Slow Length")
signalLen = input.int(9, "Signal Length")
[macdLine, signalLine, histLine] = ta.macd(close, fastLen, slowLen, signalLen)
plot(macdLine, "MACD", color=color.blue, linewidth=2)
plot(signalLine, "Signal", color=color.orange, linewidth=2)
plot(histLine, "Histogram", style=plot.style_histogram, color=histLine >= 0 ? color.green : color.red)`,
  },
  {
    id: 'stochastic',
    name: 'Stochastic',
    category: 'momentum',
    overlay: false,
    yAxisRange: { min: 0, max: 100 },
    code: `//@version=6
indicator("Stochastic")
kLength = input.int(14, "K Length")
kSmooth = input.int(3, "K Smoothing")
dSmooth = input.int(3, "D Smoothing")
[k, d] = ta.stoch(kLength, kSmooth, dSmooth)
plot(k, "K", color=color.blue, linewidth=2)
plot(d, "D", color=color.orange, linewidth=2)
hline(80, "Overbought", color=color.red)
hline(20, "Oversold", color=color.green)`,
  },
  {
    id: 'momentum',
    name: 'Momentum',
    category: 'momentum',
    overlay: false,
    code: `//@version=6
indicator("Momentum")
length = input.int(10, "Length", minval=1)
mom = ta.mom(close, length)
plot(mom, "Momentum", color=color.teal, linewidth=2)
hline(0, "Zero", color=color.gray)`,
  },
  {
    id: 'cci',
    name: 'Commodity Channel Index',
    category: 'momentum',
    overlay: false,
    code: `//@version=6
indicator("CCI")
length = input.int(20, "Length", minval=1)
cciValue = ta.cci(close, length)
plot(cciValue, "CCI", color=color.purple, linewidth=2)
hline(100, "Overbought", color=color.red)
hline(-100, "Oversold", color=color.green)
hline(0, "Zero", color=color.gray)`,
  },
  {
    id: 'adx',
    name: 'ADX / DMI',
    category: 'momentum',
    overlay: false,
    yAxisRange: { min: 0, max: 100 },
    code: `//@version=6
indicator("ADX / DMI")
length = input.int(14, "Length", minval=1)
adxSmoothing = input.int(14, "ADX Smoothing", minval=1)
[diPlus, diMinus, adx] = ta.dmi(length, adxSmoothing)
plot(diPlus, "DI+", color=color.green, linewidth=1)
plot(diMinus, "DI-", color=color.red, linewidth=1)
plot(adx, "ADX", color=color.blue, linewidth=2)
hline(25, "Trend Threshold", color=color.gray)`,
  },
  {
    id: 'roc',
    name: 'Rate of Change',
    category: 'momentum',
    overlay: false,
    code: `//@version=6
indicator("ROC")
length = input.int(14, "Length", minval=1)
rocValue = ta.roc(close, length)
plot(rocValue, "ROC", color=color.teal, linewidth=2)
hline(0, "Zero", color=color.gray)`,
  },
  {
    id: 'sar',
    name: 'Parabolic SAR',
    category: 'momentum',
    overlay: true,
    code: `//@version=6
indicator("Parabolic SAR", overlay=true)
start = input.float(0.02, "Start", minval=0.001)
increment = input.float(0.02, "Increment", minval=0.001)
maximum = input.float(0.2, "Maximum", minval=0.01)
sarValue = ta.sar(start, increment, maximum)
sarColor = close > sarValue ? color.green : color.red
plot(sarValue, "SAR", color=sarColor, style=plot.style_circles, linewidth=1)`,
  },
  {
    id: 'rsi-signals',
    name: 'RSI with Signals',
    category: 'momentum',
    description: 'RSI with overbought/oversold signal markers',
    overlay: false,
    yAxisRange: { min: 0, max: 100 },
    code: `//@version=6
indicator("RSI with Signals")
length = input.int(14, "Length", minval=1)
overbought = input.int(70, "Overbought", minval=50, maxval=100)
oversold = input.int(30, "Oversold", minval=0, maxval=50)
rsiValue = ta.rsi(close, length)
plot(rsiValue, "RSI", color=color.purple, linewidth=2)
hline(overbought, "Overbought", color=color.red)
hline(oversold, "Oversold", color=color.green)
hline(50, "Middle", color=color.gray)
obSignal = ta.crossunder(rsiValue, overbought)
osSignal = ta.crossover(rsiValue, oversold)
plotshape(obSignal, title="OB Signal", style=shape.triangledown, location=location.top, color=color.red, size=size.tiny)
plotshape(osSignal, title="OS Signal", style=shape.triangleup, location=location.bottom, color=color.green, size=size.tiny)`,
  },
  {
    id: 'macd-signals',
    name: 'MACD with Signals',
    category: 'momentum',
    description: 'MACD with crossover signal markers',
    overlay: false,
    code: `//@version=6
indicator("MACD with Signals")
fastLen = input.int(12, "Fast Length")
slowLen = input.int(26, "Slow Length")
signalLen = input.int(9, "Signal Length")
[macdLine, signalLine, histLine] = ta.macd(close, fastLen, slowLen, signalLen)
plot(macdLine, "MACD", color=color.blue, linewidth=2)
plot(signalLine, "Signal", color=color.orange, linewidth=2)
plot(histLine, "Histogram", style=plot.style_histogram, color=histLine >= 0 ? color.green : color.red)
bullSignal = ta.crossover(macdLine, signalLine)
bearSignal = ta.crossunder(macdLine, signalLine)
plotshape(bullSignal, title="Bull Cross", style=shape.triangleup, location=location.bottom, color=color.green, size=size.tiny)
plotshape(bearSignal, title="Bear Cross", style=shape.triangledown, location=location.top, color=color.red, size=size.tiny)`,
  },
];

/**
 * Volatility indicators
 */
const VOLATILITY_INDICATORS: BuiltinIndicator[] = [
  {
    id: 'bollinger-bands',
    name: 'Bollinger Bands',
    category: 'volatility',
    overlay: true,
    code: `//@version=6
indicator("Bollinger Bands", overlay=true)
length = input.int(20, "Length", minval=1)
mult = input.float(2.0, "StdDev Multiplier", minval=0.1)
basis = ta.sma(close, length)
dev = mult * ta.stdev(close, length)
upper = basis + dev
lower = basis - dev
plot(basis, "Basis", color=color.blue, linewidth=1)
plot(upper, "Upper", color=color.red, linewidth=1)
plot(lower, "Lower", color=color.green, linewidth=1)`,
  },
  {
    id: 'atr',
    name: 'Average True Range',
    category: 'volatility',
    overlay: false,
    code: `//@version=6
indicator("ATR")
length = input.int(14, "Length", minval=1)
atrValue = ta.atr(length)
plot(atrValue, "ATR", color=color.orange, linewidth=2)`,
  },
  {
    id: 'keltner-channels',
    name: 'Keltner Channels',
    category: 'volatility',
    overlay: true,
    code: `//@version=6
indicator("Keltner Channels", overlay=true)
length = input.int(20, "Length", minval=1)
mult = input.float(2.0, "ATR Multiplier", minval=0.1)
basis = ta.ema(close, length)
atrValue = ta.atr(length)
upper = basis + mult * atrValue
lower = basis - mult * atrValue
plot(basis, "Basis", color=color.blue, linewidth=1)
plot(upper, "Upper", color=color.red, linewidth=1)
plot(lower, "Lower", color=color.green, linewidth=1)`,
  },
  {
    id: 'donchian-channels',
    name: 'Donchian Channels',
    category: 'volatility',
    overlay: true,
    code: `//@version=6
indicator("Donchian Channels", overlay=true)
length = input.int(20, "Length", minval=1)
upper = ta.highest(high, length)
lower = ta.lowest(low, length)
basis = (upper + lower) / 2
plot(basis, "Basis", color=color.blue, linewidth=1)
plot(upper, "Upper", color=color.red, linewidth=1)
plot(lower, "Lower", color=color.green, linewidth=1)`,
  },
  {
    id: 'keltner-filled',
    name: 'Keltner Channels (Filled)',
    category: 'volatility',
    description: 'Keltner Channels with filled area',
    overlay: true,
    code: `//@version=6
indicator("Keltner Channels (Filled)", overlay=true)
length = input.int(20, "Length", minval=1)
mult = input.float(2.0, "ATR Multiplier", minval=0.1)
basis = ta.ema(close, length)
atrValue = ta.atr(length)
upper = basis + mult * atrValue
lower = basis - mult * atrValue
p1 = plot(upper, "Upper", color=color.teal)
p2 = plot(lower, "Lower", color=color.teal)
plot(basis, "Basis", color=color.orange, linewidth=2)
fill(p1, p2, color=color.new(color.teal, 85))`,
  },
];

/**
 * Volume indicators
 */
const VOLUME_INDICATORS: BuiltinIndicator[] = [
  {
    id: 'obv',
    name: 'On Balance Volume',
    category: 'volume',
    overlay: false,
    code: `//@version=6
indicator("OBV")
obvValue = ta.obv()
plot(obvValue, "OBV", color=color.teal, linewidth=2)`,
  },
  {
    id: 'volume-sma',
    name: 'Volume',
    category: 'volume',
    overlay: false,
    code: `//@version=6
indicator("Volume SMA")
length = input.int(20, "MA Length", minval=1)
volColor = close >= open ? color.green : color.red
plot(volume, "Volume", style=plot.style_histogram, color=volColor)
plot(ta.sma(volume, length), "Volume MA", color=color.blue, linewidth=2)`,
  },
];

/**
 * All built-in indicators
 */
export const BUILTIN_INDICATORS: BuiltinIndicator[] = [
  ...TEALSTREET_INDICATORS,
  ...TREND_INDICATORS,
  ...MOMENTUM_INDICATORS,
  ...VOLATILITY_INDICATORS,
  ...VOLUME_INDICATORS,
];

/**
 * Get indicators by category
 */
export function getIndicatorsByCategory(category: BuiltinIndicator['category']): BuiltinIndicator[] {
  return BUILTIN_INDICATORS.filter((ind) => ind.category === category);
}

/**
 * Get indicator by ID
 */
export function getIndicatorById(id: string): BuiltinIndicator | undefined {
  return BUILTIN_INDICATORS.find((ind) => ind.id === id);
}

/**
 * Search indicators by name
 */
export function searchIndicators(query: string): BuiltinIndicator[] {
  const lowerQuery = query.toLowerCase();
  return BUILTIN_INDICATORS.filter(
    (ind) => ind.name.toLowerCase().includes(lowerQuery) || ind.description?.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Convert JailbreakInputDefinition[] to InputDefinition[] (from @tealstreet/tealscript)
 * so that IndicatorSettingsModal can render them using the same form components.
 */
export function jailbreakInputsToInputDefinitions(inputs: JailbreakInputDefinition[]): Array<{
  id: string;
  type: 'int' | 'float' | 'bool' | 'string' | 'color';
  title: string;
  defval: unknown;
  minval?: number;
  maxval?: number;
  step?: number;
  options?: string[];
  tooltip?: string;
  group?: string;
}> {
  return inputs.map((input) => ({
    id: input.id,
    type: input.type,
    title: input.name,
    defval: input.defval,
    minval: input.min,
    maxval: input.max,
    step: input.step,
    options: input.options,
  }));
}

/**
 * Check if a builtin indicator is a jailbreak (canvas-drawing) indicator
 */
export function isJailbreakIndicator(indicator: BuiltinIndicator): boolean {
  return indicator.jailbreak != null;
}

/**
 * Category display names and order
 */
export const INDICATOR_CATEGORIES: Array<{
  id: BuiltinIndicator['category'];
  name: string;
}> = [
  { id: 'tealstreet', name: 'TEALSTREET SCRIPTS' },
  { id: 'trend', name: 'TREND' },
  { id: 'momentum', name: 'MOMENTUM' },
  { id: 'volatility', name: 'VOLATILITY' },
  { id: 'volume', name: 'VOLUME' },
  { id: 'other', name: 'OTHER' },
];
