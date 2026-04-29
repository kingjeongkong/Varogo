export interface HookOptionResponse {
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
  selectedHookId: string | null;
  publishedAt: string | null;
  threadsMediaId: string | null;
  permalink: string | null;
  createdAt: string;
  updatedAt: string;
  hooks: HookOptionResponse[];
}

export function toPostDraftResponse(draft: {
  id: string;
  productId: string;
  todayInput: string | null;
  body: string;
  status: string;
  selectedHookId: string | null;
  publishedAt: Date | null;
  threadsMediaId: string | null;
  permalink: string | null;
  createdAt: Date;
  updatedAt: Date;
  hookOptions: Array<{
    id: string;
    text: string;
    angleLabel: string;
  }>;
}): PostDraftResponse {
  return {
    id: draft.id,
    productId: draft.productId,
    todayInput: draft.todayInput,
    body: draft.body,
    status: draft.status,
    selectedHookId: draft.selectedHookId,
    publishedAt: draft.publishedAt ? draft.publishedAt.toISOString() : null,
    threadsMediaId: draft.threadsMediaId,
    permalink: draft.permalink,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    hooks: draft.hookOptions.map((h) => ({
      id: h.id,
      text: h.text,
      angleLabel: h.angleLabel,
      selected: h.id === draft.selectedHookId,
    })),
  };
}
