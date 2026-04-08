import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './Header';

// next/link renders a plain <a> tag in jsdom
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const mockLogoutMutate = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseAuthStore = vi.fn();

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(() => mockUseAuthStore()),
}));

const defaultLogoutMutation = {
  mutate: mockLogoutMutate,
  isPending: false,
  error: null,
};

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      logoutMutation: { ...defaultLogoutMutation },
    });
  });

  describe('loading state (isLoading: true)', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({ user: null, isLoading: true });
    });

    it('renders a skeleton element while auth state is loading', () => {
      render(<Header />);
      expect(screen.getByLabelText('사용자 정보 로딩 중')).toBeInTheDocument();
    });

    it('does not render user info or logout button while loading', () => {
      render(<Header />);
      expect(
        screen.queryByRole('button', { name: /로그아웃/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('logged in state (user present)', () => {
    const user = {
      id: '1',
      email: 'user@example.com',
      name: 'Alice',
      createdAt: '',
    };

    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({ user, isLoading: false });
    });

    it('renders the user name when user has a name', () => {
      render(<Header />);
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('renders the user email when user has no name', () => {
      const userWithoutName = {
        id: '1',
        email: 'user@example.com',
        createdAt: '',
      };
      mockUseAuthStore.mockReturnValue({
        user: userWithoutName,
        isLoading: false,
      });
      render(<Header />);
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('renders the logout button', () => {
      render(<Header />);
      expect(
        screen.getByRole('button', { name: /로그아웃/i }),
      ).toBeInTheDocument();
    });

    it('calls logoutMutation.mutate when logout button is clicked', async () => {
      render(<Header />);
      await userEvent.click(screen.getByRole('button', { name: /로그아웃/i }));
      expect(mockLogoutMutate).toHaveBeenCalledOnce();
    });

    it('disables the logout button while logout is pending', () => {
      mockUseAuth.mockReturnValue({
        logoutMutation: {
          mutate: mockLogoutMutate,
          isPending: true,
          error: null,
        },
      });
      render(<Header />);
      expect(
        screen.getByRole('button', { name: /로그아웃 중/i }),
      ).toBeDisabled();
    });

    it('does not render the skeleton while logged in', () => {
      render(<Header />);
      expect(
        screen.queryByLabelText('사용자 정보 로딩 중'),
      ).not.toBeInTheDocument();
    });
  });

  describe('logged out state (no user, not loading)', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({ user: null, isLoading: false });
    });

    it('does not render the skeleton', () => {
      render(<Header />);
      expect(
        screen.queryByLabelText('사용자 정보 로딩 중'),
      ).not.toBeInTheDocument();
    });

    it('does not render the logout button', () => {
      render(<Header />);
      expect(
        screen.queryByRole('button', { name: /로그아웃/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('brand link', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({ user: null, isLoading: false });
    });

    it('always renders a link to "/"', () => {
      render(<Header />);
      expect(screen.getByRole('link', { name: /varogo/i })).toHaveAttribute(
        'href',
        '/',
      );
    });
  });
});
