import type {
  ReferenceSample,
  StyleFingerprint,
} from '../../voice-profile/types/style-fingerprint.type';
import type { GeneratedHook } from './hook-generation.type';

export interface VoiceEvaluationInput {
  hooks: GeneratedHook[];
  styleFingerprint: StyleFingerprint;
  referenceSamples: ReferenceSample[];
  todayInput: string | null;
}

export interface HookEvaluation {
  hookIndex: number;
  matched: boolean;
  mismatches: string[];
}

export interface VoiceEvaluationResult {
  allMatched: boolean;
  perHookFeedback: HookEvaluation[];
}
