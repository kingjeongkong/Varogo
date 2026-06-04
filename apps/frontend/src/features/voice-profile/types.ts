export type ImportManualPayload =
  | { method: 'paste'; textUnits: string[] }
  | { method: 'preset'; presetId: string }
  | { method: 'custom'; customDescription: string };
