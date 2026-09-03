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
    measuredBy: 'MobileIndicatorManager + supplied WebView-backed createWorker fixture',
    notes: 'Mobile preserves caller study metadata and hands TealScript execution to the bundled compiled WebView host.',
  },
  {
    capability: 'drawing render handoff',
    mobileStatus: 'supported',
    webStatus: 'supported',
    measuredBy: 'MobileIndicatorManager worker-result handoff',
    notes: 'Mobile stores drawing payloads emitted by the compiled WebView host for the native Skia renderer.',
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
    measuredBy: 'MobileIndicatorManager requestData adapter fixture',
    notes: 'Mobile adapts its RequestDatafeed seam to the same worker requestData messages web resolves.',
  },
  {
    capability: 'imported Pine libraries',
    mobileStatus: 'supported',
    webStatus: 'supported',
    measuredBy: 'MobileIndicatorManager getLibraries provider passed to TealscriptManager',
    notes: 'Mobile passes host-registered Pine library ASTs into the bundled compiled WebView host.',
  },
];
