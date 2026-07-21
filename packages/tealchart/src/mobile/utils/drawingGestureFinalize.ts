export type DrawingPanFinalizeAction = 'end' | 'cancel';

export function getDrawingPanFinalizeAction(success: boolean): DrawingPanFinalizeAction {
  return success ? 'end' : 'cancel';
}
