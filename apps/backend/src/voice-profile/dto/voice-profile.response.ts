import type { JsonValue } from '@prisma/client/runtime/library';
import type {
  ReferenceSample,
  StyleFingerprint,
} from '../types/style-fingerprint.type';

export interface VoiceProfileResponse {
  id: string;
  userId: string;
  source: string;
  sampleCount: number;
  styleFingerprint: StyleFingerprint;
  referenceSamples: ReferenceSample[];
  createdAt: string;
  updatedAt: string;
}

export function toVoiceProfileResponse(profile: {
  id: string;
  userId: string;
  source: string;
  sampleCount: number;
  styleFingerprint: JsonValue;
  referenceSamples: JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): VoiceProfileResponse {
  return {
    id: profile.id,
    userId: profile.userId,
    source: profile.source,
    sampleCount: profile.sampleCount,
    styleFingerprint: profile.styleFingerprint as unknown as StyleFingerprint,
    referenceSamples: profile.referenceSamples as unknown as ReferenceSample[],
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
