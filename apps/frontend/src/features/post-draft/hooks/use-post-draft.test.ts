import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ApiError } from '@/lib/http-client';
import { useCreatePostDraft, usePublishPostDraft } from './use-post-draft';

const mockSetQueryData = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockQueryClient = {
  setQueryData: mockSetQueryData,
  invalidateQueries: mockInvalidateQueries,
};

const mockPublishPostDraft = vi.fn();
const mockCreatePostDraft = vi.fn();
vi.mock('../api-client', () => ({
  publishPostDraft: (...args: unknown[]) => mockPublishPostDraft(...args),
  createPostDraft: (...args: unknown[]) => mockCreatePostDraft(...args),
}));

// Capture the useMutation options at registration time so we can drive
// mutationFn / onSuccess / onError directly without mounting a QueryClient.
type MutationOptions = {
  mutationFn: (...args: unknown[]) => Promise<unknown>;
  retry?: number;
  onSuccess?: (data: unknown) => void;
  onError?: (err: unknown) => void;
};

const capturedMutations: MutationOptions[] = [];

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: MutationOptions) => {
    capturedMutations.push(options);
    return { mutate: vi.fn(), isPending: false, error: null };
  },
  useQueryClient: () => mockQueryClient,
  useQuery: () => ({ data: null, isLoading: false }),
}));

const draftId = 'draft-1';

describe('usePublishPostDraft', () => {
  beforeEach(() => {
    capturedMutations.length = 0;
    vi.clearAllMocks();
  });

  it('sets retry to 0 to prevent automatic re-publish on transient failures', () => {
    renderHook(() => usePublishPostDraft(draftId));
    const options = capturedMutations[0];
    expect(options.retry).toBe(0);
  });

  describe('on 409 ConflictException', () => {
    it('translates the error message to a user-actionable string', async () => {
      mockPublishPostDraft.mockRejectedValue(
        new ApiError('Post draft is already being published', 409),
      );

      renderHook(() => usePublishPostDraft(draftId));
      const options = capturedMutations[0];

      const err = await options.mutationFn({ body: 'hello' }).catch(
        (e: unknown) => e,
      );

      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(409);
      expect((err as ApiError).message).toMatch(/already published/i);
      expect((err as ApiError).message).toMatch(/refresh/i);
    });

    it('invalidates the post-draft query to refresh stale UI in this/other tabs', () => {
      renderHook(() => usePublishPostDraft(draftId));
      const options = capturedMutations[0];

      options.onError?.(new ApiError('translated msg', 409));

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['post-draft', draftId],
      });
    });
  });

  describe('on non-409 errors', () => {
    it('preserves the original error without translation', async () => {
      mockPublishPostDraft.mockRejectedValue(
        new ApiError('Threads is taking longer than usual', 500),
      );

      renderHook(() => usePublishPostDraft(draftId));
      const options = capturedMutations[0];

      const err = await options.mutationFn({ body: 'hello' }).catch(
        (e: unknown) => e,
      );

      expect((err as ApiError).status).toBe(500);
      expect((err as ApiError).message).toBe(
        'Threads is taking longer than usual',
      );
    });

    it('does NOT invalidate the post-draft query', () => {
      renderHook(() => usePublishPostDraft(draftId));
      const options = capturedMutations[0];

      options.onError?.(new ApiError('server error', 500));

      expect(mockInvalidateQueries).not.toHaveBeenCalledWith({
        queryKey: ['post-draft', draftId],
      });
    });
  });

  describe('on success', () => {
    it('writes the draft into cache and invalidates the list query', () => {
      renderHook(() => usePublishPostDraft(draftId));
      const options = capturedMutations[0];

      const draft = { id: draftId, productId: 'prod-1' };
      options.onSuccess?.(draft);

      expect(mockSetQueryData).toHaveBeenCalledWith(
        ['post-draft', draftId],
        draft,
      );
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['post-drafts-list', 'prod-1'],
      });
    });
  });
});

describe('useCreatePostDraft', () => {
  beforeEach(() => {
    capturedMutations.length = 0;
    vi.clearAllMocks();
  });

  describe('on 5xx server error', () => {
    it('translates the raw backend message to an actionable user-facing string', async () => {
      mockCreatePostDraft.mockRejectedValue(
        new ApiError('Hook generation failed', 500),
      );

      renderHook(() => useCreatePostDraft());
      const options = capturedMutations[0];

      const err = await options
        .mutationFn({ productId: 'prod-1' })
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(500);
      expect((err as ApiError).message).not.toBe('Hook generation failed');
      expect((err as ApiError).message).toMatch(/try again/i);
    });
  });

  describe('on 4xx client error', () => {
    it('preserves the original error so validation messages reach the user', async () => {
      mockCreatePostDraft.mockRejectedValue(
        new ApiError('Import your Threads voice first', 400),
      );

      renderHook(() => useCreatePostDraft());
      const options = capturedMutations[0];

      const err = await options
        .mutationFn({ productId: 'prod-1' })
        .catch((e: unknown) => e);

      expect((err as ApiError).status).toBe(400);
      expect((err as ApiError).message).toBe(
        'Import your Threads voice first',
      );
    });
  });

  describe('cancellation', () => {
    it('passes an AbortSignal to the api client', async () => {
      mockCreatePostDraft.mockResolvedValue({ id: 'draft-1' });

      renderHook(() => useCreatePostDraft());
      const options = capturedMutations[0];

      await options.mutationFn({ productId: 'prod-1' });

      const callArgs = mockCreatePostDraft.mock.calls[0];
      expect(callArgs[1]).toBeInstanceOf(AbortSignal);
    });

    it('throws a status-0 ApiError when the underlying request is aborted', async () => {
      // Resolve only after abort is triggered by the test
      mockCreatePostDraft.mockImplementation(
        (_data: unknown, signal: AbortSignal) =>
          new Promise((_, reject) => {
            signal.addEventListener('abort', () =>
              reject(
                Object.assign(new Error('aborted'), { name: 'AbortError' }),
              ),
            );
          }),
      );

      const { result } = renderHook(() => useCreatePostDraft());
      const options = capturedMutations[0];

      const promise = options
        .mutationFn({ productId: 'prod-1' })
        .catch((e: unknown) => e);
      // result.current is the mocked useMutation return; cancel was attached via Object.assign
      (result.current as unknown as { cancel: () => void }).cancel();

      const err = (await promise) as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(0);
      expect(err.message).toMatch(/cancel/i);
    });
  });
});
