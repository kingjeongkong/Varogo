import type { ProductAnalysisResult } from '../../product/types/product-analysis.type';
import type {
  ReferenceSample,
  StyleFingerprint,
} from '../../voice-profile/types/style-fingerprint.type';

export interface PostDraftOptionGenerationInput {
  analysis: ProductAnalysisResult;
  styleFingerprint: StyleFingerprint;
  referenceSamples: ReferenceSample[];
  todayInput: string | null;
}

export interface GeneratedPostDraftOption {
  text: string;
  angleLabel: string;
}

export interface PostDraftOptionGenerationResult {
  options: GeneratedPostDraftOption[];
  evaluationFeedback?: string[];
}
