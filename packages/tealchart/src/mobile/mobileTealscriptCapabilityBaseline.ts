export type MobileTealscriptCapabilityStatus = 'supported' | 'visible-gap' | 'missing';

export interface MobileTealscriptCapabilityRow {
  capability: string;
  mobileStatus: MobileTealscriptCapabilityStatus;
  webStatus: 'supported';
  measuredBy: string;
  notes: string;
}

export const MOBILE_TEALSCRIPT_CAPABILITY_BASELINE: MobileTealscriptCapabilityRow[] = [
  {
    capability: 'custom-source save and plot handoff',
    mobileStatus: 'supported',
    webStatus: 'supported',
    measuredBy: 'MobileIndicatorManager.addTealscriptIndicator -> getPlots/getIndicatorPaneInfo',
    notes: 'Mobile parses caller source, executes through the interpreter, tags plots with the script id, and exposes pane metadata for Skia rendering.',
  },
  {
    capability: 'drawing render handoff',
    mobileStatus: 'supported',
    webStatus: 'supported',
    measuredBy: 'MobileIndicatorManager.addTealscriptIndicator -> getDrawings',
    notes: 'Mobile returns tagged drawing outputs for native rendering.',
  },
  {
    capability: 'parse and runtime diagnostics',
    mobileStatus: 'supported',
    webStatus: 'supported',
    measuredBy: 'MobileIndicatorManager.onErrorSubscribe',
    notes: 'Mobile emits parse/runtime failures as severity=error through onTealscriptError.',
  },
  {
    capability: 'request-backed scripts',
    mobileStatus: 'supported',
    webStatus: 'supported',
    measuredBy: 'MobileIndicatorManager request.security fixture',
    notes: 'Mobile hosts can supply a synchronous RequestDatafeed to the interpreter path; without one, request-backed scripts still emit a nonfatal request-data-unavailable warning.',
  },
  {
    capability: 'imported Pine libraries',
    mobileStatus: 'supported',
    webStatus: 'supported',
    measuredBy: 'MobileIndicatorManager import fixture',
    notes: 'Mobile hosts can supply a deterministic Pine library registry to the interpreter path, so imported scripts resolve and render without compiled execution.',
  },
  {
    capability: 'on-device closure execution proof',
    mobileStatus: 'visible-gap',
    webStatus: 'supported',
    measuredBy: 'Closure cutover gate plus mobile:tealscript-closure-smoke',
    notes:
      'MobileIndicatorManager can select the no-eval closure backend through the shared selector and exposes the selected/actual backend on runtimeProfile. ' +
      'The package smoke runs corpus scripts through MobileIndicatorManager with closure forced and compares rendered output against direct web closure output. ' +
      'The remaining visible gap is proof outside this repo: a consuming mobile app still needs a Hermes/Metro simulator or device smoke plus a device performance check before mobile closure execution is fully claimed.',
  },
];
