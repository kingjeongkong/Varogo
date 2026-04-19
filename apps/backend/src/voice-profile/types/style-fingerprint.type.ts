export interface StyleFingerprint {
  tonality: string;
  avgLength: number;
  openingPatterns: string[];
  emojiDensity: number;
  hashtagUsage: number;
}

export type QualitativeFingerprint = Pick<
  StyleFingerprint,
  'tonality' | 'openingPatterns'
>;

export type QuantitativeStats = Pick<
  StyleFingerprint,
  'avgLength' | 'emojiDensity' | 'hashtagUsage'
>;

export interface ReferenceSample {
  text: string;
  date: string;
}

export interface VoiceAnalysisResult {
  source: 'threads_import';
  sampleCount: number;
  styleFingerprint: StyleFingerprint;
  referenceSamples: ReferenceSample[];
}
