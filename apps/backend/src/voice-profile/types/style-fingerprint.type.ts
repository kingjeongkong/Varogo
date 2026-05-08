export interface StyleFingerprint {
  tonality: string;
  openingPatterns: string[];
  signaturePhrases: string[];
}

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
