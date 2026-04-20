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
  createdAt: Date;
  updatedAt: Date;
  hooks: HookOptionResponse[];
}

export function toPostDraftResponse(draft: {
  id: string;
  productId: string;
  todayInput: string | null;
  body: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  hookOptions: Array<{
    id: string;
    text: string;
    angleLabel: string;
    selected: boolean;
  }>;
}): PostDraftResponse {
  return {
    id: draft.id,
    productId: draft.productId,
    todayInput: draft.todayInput,
    body: draft.body,
    status: draft.status,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    hooks: draft.hookOptions.map((h) => ({
      id: h.id,
      text: h.text,
      angleLabel: h.angleLabel,
      selected: h.selected,
    })),
  };
}
