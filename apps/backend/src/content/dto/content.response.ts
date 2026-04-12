export interface ContentResponse {
  id: string;
  strategyId: string;
  body: string;
  characterCount: number;
  createdAt: Date;
}

export function toContentResponse(content: {
  id: string;
  strategyId: string;
  body: string;
  createdAt: Date;
}): ContentResponse {
  return {
    id: content.id,
    strategyId: content.strategyId,
    body: content.body,
    characterCount: content.body.length,
    createdAt: content.createdAt,
  };
}
