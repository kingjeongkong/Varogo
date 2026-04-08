import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './use-auth';

// --- module mocks ---

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSetUser = vi.fn();
const mockClearUser = vi.fn();
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (s: {
      setUser: typeof mockSetUser;
      clearUser: typeof mockClearUser;
    }) => unknown,
  ) => selector({ setUser: mockSetUser, clearUser: mockClearUser }),
}));

const mockLogin = vi.fn();
const mockSignup = vi.fn();
const mockLogout = vi.fn();
vi.mock('../api-client', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  signup: (...args: unknown[]) => mockSignup(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

// useMutation is a thin wrapper — we test the callbacks by capturing them at
// registration time and calling them directly, which avoids standing up a full
// QueryClient while still exercising the hook's business logic.
type MutationOptions = {
  mutationFn: (...args: unknown[]) => Promise<unknown>;
  onSuccess?: (data: unknown) => void;
  onError?: () => void;
};

const capturedMutations: MutationOptions[] = [];

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: MutationOptions) => {
    capturedMutations.push(options);
    return {
      mutate: vi.fn(),
      isPending: false,
      error: null,
    };
  },
}));

// ---

describe('useAuth', () => {
  beforeEach(() => {
    capturedMutations.length = 0;
    vi.clearAllMocks();
  });

  it('registers three mutations (login, signup, logout)', () => {
    renderHook(() => useAuth());
    expect(capturedMutations).toHaveLength(3);
  });

  describe('loginMutation', () => {
    it('calls login api-client with the provided credentials', async () => {
      const user = { id: '1', email: 'a@b.com', createdAt: '' };
      mockLogin.mockResolvedValue(user);

      renderHook(() => useAuth());

      const loginOptions = capturedMutations[0];
      await loginOptions.mutationFn({
        email: 'a@b.com',
        password: 'password123',
      });

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'password123',
      });
    });

    it('calls setUser and navigates to "/" on success', async () => {
      const user = { id: '1', email: 'a@b.com', createdAt: '' };

      renderHook(() => useAuth());

      const loginOptions = capturedMutations[0];
      await act(async () => {
        loginOptions.onSuccess?.(user);
      });

      expect(mockSetUser).toHaveBeenCalledWith(user);
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('signupMutation', () => {
    it('calls signup api-client with the provided data', async () => {
      const user = { id: '2', email: 'new@b.com', createdAt: '' };
      mockSignup.mockResolvedValue(user);

      renderHook(() => useAuth());

      const signupOptions = capturedMutations[1];
      await signupOptions.mutationFn({
        email: 'new@b.com',
        password: 'password123',
        name: 'Alice',
      });

      expect(mockSignup).toHaveBeenCalledWith({
        email: 'new@b.com',
        password: 'password123',
        name: 'Alice',
      });
    });

    it('calls setUser and navigates to "/" on success', async () => {
      const user = { id: '2', email: 'new@b.com', createdAt: '' };

      renderHook(() => useAuth());

      const signupOptions = capturedMutations[1];
      await act(async () => {
        signupOptions.onSuccess?.(user);
      });

      expect(mockSetUser).toHaveBeenCalledWith(user);
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('logoutMutation', () => {
    it('calls logout api-client', async () => {
      mockLogout.mockResolvedValue(undefined);

      renderHook(() => useAuth());

      const logoutOptions = capturedMutations[2];
      await logoutOptions.mutationFn();

      expect(mockLogout).toHaveBeenCalled();
    });

    it('calls clearUser and navigates to "/login" on success', async () => {
      renderHook(() => useAuth());

      const logoutOptions = capturedMutations[2];
      await act(async () => {
        logoutOptions.onSuccess?.(undefined);
      });

      expect(mockClearUser).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('calls clearUser and navigates to "/login" on error', async () => {
      renderHook(() => useAuth());

      const logoutOptions = capturedMutations[2];
      await act(async () => {
        logoutOptions.onError?.();
      });

      expect(mockClearUser).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('returns loginMutation, signupMutation, and logoutMutation', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current).toHaveProperty('loginMutation');
    expect(result.current).toHaveProperty('signupMutation');
    expect(result.current).toHaveProperty('logoutMutation');
  });
});
