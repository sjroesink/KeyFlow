export interface LoopRegion {
  start: number;  // seconds
  end: number;    // seconds
}

export type PracticeMode = 'off' | 'waitMode';

export interface EvaluationResult {
  matched: boolean;
  expectedPitchClasses: number[];
  detectedPitchClasses: number[];
  matchedCount: number;
  totalExpected: number;
}
