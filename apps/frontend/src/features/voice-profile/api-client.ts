import { apiFetch } from '@/lib/http-client';
import type { VoiceProfileResponse } from '@/lib/types';
import type { ImportManualPayload } from './types';

export function getVoiceProfile(): Promise<VoiceProfileResponse | null> {
  return apiFetch<VoiceProfileResponse | null>('/voice-profile');
}

export function importVoiceProfile(): Promise<VoiceProfileResponse> {
  return apiFetch<VoiceProfileResponse>('/voice-profile/import', {
    method: 'POST',
  });
}

export function importVoiceManual(payload: ImportManualPayload): Promise<VoiceProfileResponse> {
  const body: Record<string, unknown> =
    payload.method === 'paste'
      ? { method: payload.method, text_units: payload.textUnits }
      : payload.method === 'preset'
        ? { method: payload.method, preset_id: payload.presetId }
        : { method: payload.method, custom_description: payload.customDescription };

  return apiFetch<VoiceProfileResponse>('/voice-profile/import-manual', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
