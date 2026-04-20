import type { ProductAnalysisResult } from '../../product/types/product-analysis.type';
import type {
  ReferenceSample,
  StyleFingerprint,
} from '../../voice-profile/types/style-fingerprint.type';

export interface HookGenerationInput {
  analysis: ProductAnalysisResult;
  styleFingerprint: StyleFingerprint;
  referenceSamples: ReferenceSample[];
  todayInput: string | null;
}

export interface GeneratedHook {
  text: string;
  angleLabel: string;
}

export interface HookGenerationResult {
  hooks: GeneratedHook[];
}
