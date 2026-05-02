export interface PostDraftOptionResponse {
  id: string;
  text: string;
  angleLabel: string;
  selected: boolean;
}

export interface PostDraftResponse {
  id: string;
  productId: string;
  todayInput: string | null;
  body: string;
  status: string;
  selectedOptionId: string | null;
  publishedAt: string | null;
  threadsMediaId: string | null;
  permalink: string | null;
  createdAt: string;
  updatedAt: string;
  options: PostDraftOptionResponse[];
  evaluationFeedback?: string[];
}

export function toPostDraftResponse(
  draft: {
    id: string;
    productId: string;
    todayInput: string | null;
    body: string;
    status: string;
    selectedOptionId: string | null;
    publishedAt: Date | null;
    threadsMediaId: string | null;
    permalink: string | null;
    createdAt: Date;
    updatedAt: Date;
    options: Array<{
      id: string;
      text: string;
      angleLabel: string;
    }>;
  },
  extras?: { evaluationFeedback?: string[] },
): PostDraftResponse {
  return {
    id: draft.id,
    productId: draft.productId,
    todayInput: draft.todayInput,
    body: draft.body,
    status: draft.status,
    selectedOptionId: draft.selectedOptionId,
    publishedAt: draft.publishedAt ? draft.publishedAt.toISOString() : null,
    threadsMediaId: draft.threadsMediaId,
    permalink: draft.permalink,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    options: draft.options.map((o) => ({
      id: o.id,
      text: o.text,
      angleLabel: o.angleLabel,
      selected: o.id === draft.selectedOptionId,
    })),
    ...(extras?.evaluationFeedback && extras.evaluationFeedback.length > 0
      ? { evaluationFeedback: extras.evaluationFeedback }
      : {}),
  };
}
