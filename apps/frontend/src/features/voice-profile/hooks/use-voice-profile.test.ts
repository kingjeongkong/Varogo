import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceProfile, useImportVoice } from './use-voice-profile';

// --- module mocks ---

const mockGetVoiceProfile = vi.fn();
const mockImportVoiceProfile = vi.fn();
vi.mock('../api-client', () => ({
  getVoiceProfile: (...args: unknown[]) => mockGetVoiceProfile(...args),
  importVoiceProfile: (...args: unknown[]) => mockImportVoiceProfile(...args),
}));

type MutationOptions = {
  mutationFn: (...args: unknown[]) => Promise<unknown>;
  onSuccess?: (data: unknown) => void;
};

type QueryOptions = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
};

const capturedMutations: MutationOptions[] = [];
const capturedQueries: QueryOptions[] = [];

const mockSetQueryData = vi.fn();
const mockQueryClient = { setQueryData: mockSetQueryData };

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: QueryOptions) => {
    capturedQueries.push(options);
    return { data: undefined, isLoading: false, error: null };
  },
  useMutation: (options: MutationOptions) => {
    capturedMutations.push(options);
    return { mutate: vi.fn(), isPending: false, error: null };
  },
  useQueryClient: () => mockQueryClient,
}));

// ---

describe('useVoiceProfile', () => {
  beforeEach(() => {
    capturedMutations.length = 0;
    capturedQueries.length = 0;
    vi.clearAllMocks();
  });

  it('registers query with queryKey [\'voice-profile\']', () => {
    renderHook(() => useVoiceProfile());
    expect(capturedQueries[0].queryKey).toEqual(['voice-profile']);
  });

  it('queryFn calls getVoiceProfile', async () => {
    mockGetVoiceProfile.mockResolvedValue(null);
    renderHook(() => useVoiceProfile());
    await capturedQueries[0].queryFn();
    expect(mockGetVoiceProfile).toHaveBeenCalled();
  });
});

describe('useImportVoice', () => {
  beforeEach(() => {
    capturedMutations.length = 0;
    capturedQueries.length = 0;
    vi.clearAllMocks();
  });

  it('mutationFn calls importVoiceProfile', async () => {
    mockImportVoiceProfile.mockResolvedValue({ id: 'vp1', source: 'threads_import' });
    renderHook(() => useImportVoice());
    await capturedMutations[0].mutationFn();
    expect(mockImportVoiceProfile).toHaveBeenCalled();
  });

  it('onSuccess calls queryClient.setQueryData with [\'voice-profile\'] and profile', async () => {
    const profile = { id: 'vp1', source: 'threads_import' };
    renderHook(() => useImportVoice());
    await act(async () => {
      capturedMutations[0].onSuccess?.(profile);
    });
    expect(mockSetQueryData).toHaveBeenCalledWith(['voice-profile'], profile);
  });
});
