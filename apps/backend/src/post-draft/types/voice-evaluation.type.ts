import type {
  ReferenceSample,
  StyleFingerprint,
} from '../../voice-profile/types/style-fingerprint.type';
import type { GeneratedPostDraftOption } from './post-draft-option-generation.type';

export interface VoiceEvaluationInput {
  options: GeneratedPostDraftOption[];
  styleFingerprint: StyleFingerprint;
  referenceSamples: ReferenceSample[];
  todayInput: string | null;
}

export interface PostDraftOptionEvaluation {
  optionIndex: number;
  matched: boolean;
  mismatches: string[];
}

export interface VoiceEvaluationResult {
  allMatched: boolean;
  perOptionFeedback: PostDraftOptionEvaluation[];
}
