import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useThreadsConnectionStatus,
  useThreadsConnect,
  useThreadsDisconnect,
  usePublishToThreads,
} from './use-threads-connection';

// --- module mocks ---

const mockFetchThreadsConnection = vi.fn();
const mockFetchThreadsAuthUrl = vi.fn();
const mockDeleteThreadsConnection = vi.fn();
const mockPublishToThreads = vi.fn();
vi.mock('../api-client', () => ({
  fetchThreadsConnection: (...args: unknown[]) => mockFetchThreadsConnection(...args),
  fetchThreadsAuthUrl: (...args: unknown[]) => mockFetchThreadsAuthUrl(...args),
  deleteThreadsConnection: (...args: unknown[]) => mockDeleteThreadsConnection(...args),
  publishToThreads: (...args: unknown[]) => mockPublishToThreads(...args),
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

const mockInvalidateQueries = vi.fn();
const mockQueryClient = { invalidateQueries: mockInvalidateQueries };

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

beforeAll(() => {
  Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });
});

describe('useThreadsConnectionStatus', () => {
  beforeEach(() => {
    capturedMutations.length = 0;
    capturedQueries.length = 0;
    vi.clearAllMocks();
  });

  it('registers query with queryKey [\'threads\', \'connection\']', () => {
    renderHook(() => useThreadsConnectionStatus());
    expect(capturedQueries[0].queryKey).toEqual(['threads', 'connection']);
  });

  it('queryFn calls fetchThreadsConnection', async () => {
    mockFetchThreadsConnection.mockResolvedValue({ connected: false, username: null });
    renderHook(() => useThreadsConnectionStatus());
    await capturedQueries[0].queryFn();
    expect(mockFetchThreadsConnection).toHaveBeenCalled();
  });
});

describe('useThreadsConnect', () => {
  beforeEach(() => {
    capturedMutations.length = 0;
    capturedQueries.length = 0;
    vi.clearAllMocks();
  });

  it('mutationFn calls fetchThreadsAuthUrl', async () => {
    mockFetchThreadsAuthUrl.mockResolvedValue({ url: 'https://threads.net/oauth' });
    renderHook(() => useThreadsConnect());
    await capturedMutations[0].mutationFn();
    expect(mockFetchThreadsAuthUrl).toHaveBeenCalled();
  });

  it('onSuccess sets window.location.href to the returned url', async () => {
    renderHook(() => useThreadsConnect());
    await act(async () => {
      capturedMutations[0].onSuccess?.({ url: 'https://threads.net/oauth?state=abc' });
    });
    expect(window.location.href).toBe('https://threads.net/oauth?state=abc');
  });
});

describe('useThreadsDisconnect', () => {
  beforeEach(() => {
    capturedMutations.length = 0;
    capturedQueries.length = 0;
    vi.clearAllMocks();
  });

  it('mutationFn calls deleteThreadsConnection', async () => {
    mockDeleteThreadsConnection.mockResolvedValue(undefined);
    renderHook(() => useThreadsDisconnect());
    await capturedMutations[0].mutationFn();
    expect(mockDeleteThreadsConnection).toHaveBeenCalled();
  });

  it('onSuccess invalidates [\'threads\', \'connection\'] query', async () => {
    renderHook(() => useThreadsDisconnect());
    await act(async () => {
      capturedMutations[0].onSuccess?.(undefined);
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['threads', 'connection'],
    });
  });
});

describe('usePublishToThreads', () => {
  beforeEach(() => {
    capturedMutations.length = 0;
    capturedQueries.length = 0;
    vi.clearAllMocks();
  });

  it('mutationFn calls publishToThreads with the provided text', async () => {
    mockPublishToThreads.mockResolvedValue({ threadsMediaId: 'mid', permalink: null });
    renderHook(() => usePublishToThreads());
    await capturedMutations[0].mutationFn('Hello Threads!');
    expect(mockPublishToThreads).toHaveBeenCalledWith('Hello Threads!');
  });
});
