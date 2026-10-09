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
}

export interface AnalysisSelectionState {
  active: boolean;
  range?: AnalysisTimeRange;
  message?: string;
}

export function analysisSelectionTimeAtX(frame: AnalysisSelectionFrame, x: number): number {
  'worklet';
  const clamped = Math.max(frame.plot.left, Math.min(frame.plot.left + frame.plot.width, x));
  return (
    frame.timeRange.from +
    ((clamped - frame.projectionLeft) / (frame.projectionRight - frame.projectionLeft)) *
      (frame.timeRange.to - frame.timeRange.from)
  );
}

export function analysisSelectionXAtTime(frame: AnalysisSelectionFrame, time: number): number {
  'worklet';
  return (
    frame.projectionLeft +
    ((time - frame.timeRange.from) / (frame.timeRange.to - frame.timeRange.from)) *
      (frame.projectionRight - frame.projectionLeft)
  );
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
    ].every(Number.isFinite) &&
    frame.timeRange.to > frame.timeRange.from &&
    frame.projectionRight > frame.projectionLeft &&
    frame.plot.width > 0 &&
    frame.plot.height > 0
  );
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
    this.currentFrame = frame;
    if (!this.state.active && this.state.range && frame?.identity !== this.selectedIdentity)
      this.cancel('Selection cleared because the chart changed.');
    if (this.state.active && JSON.stringify(frame) !== JSON.stringify(this.frozenFrame))
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
    this.startTime = analysisSelectionTimeAtX(frame, x);
    this.setState({ active: true });
    return true;
  }

  move(x: number): void {
    if (this.startTime === undefined || !this.frozenFrame || !Number.isFinite(x)) return;
    const time = analysisSelectionTimeAtX(this.frozenFrame, x);
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
