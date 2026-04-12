export interface ContentResponse {
  id: string;
  strategyId: string;
  body: string;
  characterCount: number;
  lengthGuide: string;
  createdAt: Date;
}

export function toContentResponse(
  content: {
    id: string;
    strategyId: string;
    body: string;
    createdAt: Date;
  },
  lengthGuide: string,
): ContentResponse {
  return {
    id: content.id,
    strategyId: content.strategyId,
    body: content.body,
    characterCount: content.body.length,
    lengthGuide,
    createdAt: content.createdAt,
  };
}
