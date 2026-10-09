import type { AnalysisTimeRange } from './types';

export interface AnalysisRequestIntent {
  action: 'describe' | 'similar';
  range?: AnalysisTimeRange;
}

export interface AnalysisSelectionFrame {
  identity: string;
  scaleIdentity?: string;
  priceRange?: { from: number; to: number };
  timeRange: AnalysisTimeRange;
  projectionLeft: number;
  projectionRight: number;
  plot: { left: number; top: number; width: number; height: number };
  timeAnchors?: readonly { readonly time: number; readonly x: number }[];
}

export interface AnalysisSelectionState {
  active: boolean;
  range?: AnalysisTimeRange;
  message?: string;
}

export function analysisSelectionTimeAtX(frame: AnalysisSelectionFrame, x: number): number {
  'worklet';
  const clamped = Math.max(frame.plot.left, Math.min(frame.plot.left + frame.plot.width, x));
  if (frame.timeAnchors) return analysisAnchorValueAt(frame.timeAnchors, clamped, false);
  return (
    frame.timeRange.from +
    ((clamped - frame.projectionLeft) / (frame.projectionRight - frame.projectionLeft)) *
      (frame.timeRange.to - frame.timeRange.from)
  );
}

export function analysisSelectionXAtTime(frame: AnalysisSelectionFrame, time: number): number {
  'worklet';
  if (frame.timeAnchors) return analysisAnchorValueAt(frame.timeAnchors, time, true);
  return (
    frame.projectionLeft +
    ((time - frame.timeRange.from) / (frame.timeRange.to - frame.timeRange.from)) *
      (frame.projectionRight - frame.projectionLeft)
  );
}

function analysisAnchorValueAt(
  anchors: NonNullable<AnalysisSelectionFrame['timeAnchors']>,
  value: number,
  fromTime: boolean,
): number {
  'worklet';
  if (!Number.isFinite(value) || anchors.length < 2) return NaN;
  const from = fromTime ? 'time' : 'x';
  const to = fromTime ? 'x' : 'time';
  let left = 0;
  let right = anchors.length - 1;
  if (value <= anchors[left][from]) return anchors[left][to];
  if (value >= anchors[right][from]) return anchors[right][to];
  while (right - left > 1) {
    const middle = Math.floor((left + right) / 2);
    if (anchors[middle][from] <= value) left = middle;
    else right = middle;
  }
  const span = anchors[right][from] - anchors[left][from];
  if (!Number.isFinite(span) || span <= 0) return NaN;
  return anchors[left][to] + ((value - anchors[left][from]) / span) * (anchors[right][to] - anchors[left][to]);
}

export function validAnalysisSelectionFrame(frame: AnalysisSelectionFrame | null): frame is AnalysisSelectionFrame {
  return (
    !!frame &&
    [
      frame.timeRange.from,
      frame.timeRange.to,
      frame.projectionLeft,
      frame.projectionRight,
      frame.plot.left,
      frame.plot.top,
      frame.plot.width,
      frame.plot.height,
      frame.timeRange.to - frame.timeRange.from,
      frame.projectionRight - frame.projectionLeft,
      frame.plot.left + frame.plot.width,
      frame.plot.top + frame.plot.height,
    ].every(Number.isFinite) &&
    frame.timeRange.to > frame.timeRange.from &&
    frame.projectionRight > frame.projectionLeft &&
    frame.plot.width > 0 &&
    frame.plot.height > 0 &&
    validAnalysisTimeAnchors(frame.timeAnchors)
  );
}

function validAnalysisTimeAnchors(anchors: AnalysisSelectionFrame['timeAnchors']): boolean {
  if (anchors === undefined) return true;
  if (!Array.isArray(anchors) || anchors.length < 2) return false;
  for (let index = 0; index < anchors.length; index++) {
    const anchor = anchors[index];
    if (!anchor || !Number.isFinite(anchor.time) || anchor.time < 0 || !Number.isFinite(anchor.x)) return false;
    if (
      index > 0 &&
      (anchor.time <= anchors[index - 1].time ||
        anchor.x <= anchors[index - 1].x ||
        !Number.isFinite(anchor.time - anchors[index - 1].time) ||
        !Number.isFinite(anchor.x - anchors[index - 1].x))
    )
      return false;
  }
  return true;
}

export class AnalysisSelection {
  private currentFrame: AnalysisSelectionFrame | null = null;
  private frozenFrame: AnalysisSelectionFrame | null = null;
  private startTime?: number;
  private selectedIdentity?: string;
  private state: AnalysisSelectionState = { active: false };

  constructor(private readonly onChange: (state: AnalysisSelectionState) => void) {}

  getState(): AnalysisSelectionState {
    return this.state;
  }
  getFrame(): AnalysisSelectionFrame | null {
    return this.frozenFrame ?? this.currentFrame;
  }

  updateFrame(frame: AnalysisSelectionFrame | null): void {
    this.currentFrame = validAnalysisSelectionFrame(frame) ? frame : null;
    if (!this.state.active && this.state.range && this.currentFrame?.identity !== this.selectedIdentity)
      this.cancel('Selection cleared because the chart changed.');
    if (this.state.active && JSON.stringify(this.currentFrame) !== JSON.stringify(this.frozenFrame))
      this.cancel('Selection cancelled because the chart changed. Select the pattern again.');
  }

  start(): boolean {
    if (!validAnalysisSelectionFrame(this.currentFrame)) {
      this.setState({ active: false, message: 'Chart data is not ready for pattern selection.' });
      return false;
    }
    this.frozenFrame = {
      ...this.currentFrame,
      timeRange: { ...this.currentFrame.timeRange },
      plot: { ...this.currentFrame.plot },
      ...(this.currentFrame.priceRange ? { priceRange: { ...this.currentFrame.priceRange } } : {}),
      ...(this.currentFrame.timeAnchors
        ? { timeAnchors: this.currentFrame.timeAnchors.map((anchor) => ({ ...anchor })) }
        : {}),
    };
    this.startTime = undefined;
    this.selectedIdentity = undefined;
    this.setState({ active: true });
    return true;
  }

  begin(x: number, y: number): boolean {
    const frame = this.frozenFrame;
    if (
      !this.state.active ||
      !frame ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < frame.plot.left ||
      x > frame.plot.left + frame.plot.width ||
      y < frame.plot.top ||
      y > frame.plot.top + frame.plot.height
    )
      return false;
    const time = analysisSelectionTimeAtX(frame, x);
    if (!Number.isFinite(time)) {
      this.cancel('Chart projection is not ready for pattern selection.');
      return false;
    }
    this.startTime = time;
    this.setState({ active: true });
    return true;
  }

  move(x: number): void {
    if (this.startTime === undefined || !this.frozenFrame || !Number.isFinite(x)) return;
    const time = analysisSelectionTimeAtX(this.frozenFrame, x);
    if (!Number.isFinite(time)) {
      this.cancel('Chart projection is not ready for pattern selection.');
      return;
    }
    this.setState({
      active: true,
      range: { from: Math.min(this.startTime, time), to: Math.max(this.startTime, time) },
    });
  }

  end(x: number): void {
    if (!this.state.active || this.startTime === undefined) return;
    this.move(x);
    this.startTime = undefined;
    if (!this.state.range || this.state.range.to <= this.state.range.from)
      this.setState({ active: true, message: 'Drag across a pattern to select its time range.' });
  }

  selectRange(range: AnalysisTimeRange): void {
    if (!this.state.active) return;
    if (!Number.isFinite(range.from) || !Number.isFinite(range.to) || range.to <= range.from) {
      this.setState({ active: true, message: 'Drag across a pattern to select its time range.' });
      return;
    }
    this.setState({ active: true, range: { ...range } });
  }

  cancel(message?: string): void {
    this.frozenFrame = null;
    this.startTime = undefined;
    this.selectedIdentity = undefined;
    this.setState({ active: false, ...(message ? { message } : {}) });
  }

  finish(): void {
    if (!this.state.active || !this.state.range) return;
    this.selectedIdentity = this.frozenFrame?.identity;
    this.frozenFrame = null;
    this.startTime = undefined;
    this.setState({ active: false, range: this.state.range });
  }

  private setState(state: AnalysisSelectionState): void {
    if (JSON.stringify(state) === JSON.stringify(this.state)) return;
    this.state = state;
    this.onChange(state);
  }
}
