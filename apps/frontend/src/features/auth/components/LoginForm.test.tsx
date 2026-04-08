import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

const mockLoginMutate = vi.fn();

vi.mock('../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/use-auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockUseAuth(overrides: Record<string, any> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    loginMutation: { mutate: mockLoginMutate, isPending: false, error: null },
    signupMutation: { mutate: vi.fn(), isPending: false, error: null },
    logoutMutation: { mutate: vi.fn(), isPending: false, error: null },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth();
  });

  describe('rendering', () => {
    it('renders email and password fields', () => {
      render(<LoginForm />);
      expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument();
    });

    it('renders the submit button', () => {
      render(<LoginForm />);
      expect(
        screen.getByRole('button', { name: /로그인/i }),
      ).toBeInTheDocument();
    });

    it('does not show validation errors on initial render', () => {
      render(<LoginForm />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows email validation error when submitting with no email', async () => {
      render(<LoginForm />);
      await userEvent.click(screen.getByRole('button', { name: /로그인/i }));
      expect(
        await screen.findByText(/유효한 이메일을 입력해주세요/i),
      ).toBeInTheDocument();
    });

    it('shows email validation error when email format is invalid', async () => {
      render(<LoginForm />);
      await userEvent.type(screen.getByLabelText(/이메일/i), 'not-an-email');
      await userEvent.click(screen.getByRole('button', { name: /로그인/i }));
      expect(
        await screen.findByText(/유효한 이메일을 입력해주세요/i),
      ).toBeInTheDocument();
    });

    it('shows password validation error when password is too short', async () => {
      render(<LoginForm />);
      await userEvent.type(screen.getByLabelText(/이메일/i), 'valid@email.com');
      await userEvent.type(screen.getByLabelText(/비밀번호/i), 'short');
      await userEvent.click(screen.getByRole('button', { name: /로그인/i }));
      expect(
        await screen.findByText(/비밀번호는 8자 이상이어야 합니다/i),
      ).toBeInTheDocument();
    });

    it('shows password validation error when password is empty', async () => {
      render(<LoginForm />);
      await userEvent.type(screen.getByLabelText(/이메일/i), 'valid@email.com');
      await userEvent.click(screen.getByRole('button', { name: /로그인/i }));
      expect(
        await screen.findByText(/비밀번호는 8자 이상이어야 합니다/i),
      ).toBeInTheDocument();
    });

    it('does not call loginMutation when form is invalid', async () => {
      render(<LoginForm />);
      await userEvent.click(screen.getByRole('button', { name: /로그인/i }));
      await screen.findByText(/유효한 이메일을 입력해주세요/i);
      expect(mockLoginMutate).not.toHaveBeenCalled();
    });
  });

  describe('valid submission', () => {
    it('calls loginMutation.mutate with email and password on valid submit', async () => {
      render(<LoginForm />);
      await userEvent.type(
        screen.getByLabelText(/이메일/i),
        'user@example.com',
      );
      await userEvent.type(screen.getByLabelText(/비밀번호/i), 'validpassword');
      await userEvent.click(screen.getByRole('button', { name: /로그인/i }));
      expect(mockLoginMutate).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'validpassword',
      });
    });
  });

  describe('loading state', () => {
    it('disables submit button while isPending is true', () => {
      mockUseAuth({
        loginMutation: {
          mutate: mockLoginMutate,
          isPending: true,
          error: null,
        },
      });
      render(<LoginForm />);
      expect(screen.getByRole('button', { name: /로그인 중/i })).toBeDisabled();
    });

    it('shows loading text while isPending is true', () => {
      mockUseAuth({
        loginMutation: {
          mutate: mockLoginMutate,
          isPending: true,
          error: null,
        },
      });
      render(<LoginForm />);
      expect(
        screen.getByRole('button', { name: /로그인 중/i }),
      ).toBeInTheDocument();
    });
  });

  describe('api error', () => {
    it('displays error message when mutation returns an error', () => {
      mockUseAuth({
        loginMutation: {
          mutate: mockLoginMutate,
          isPending: false,
          error: new Error('이메일 또는 비밀번호가 올바르지 않습니다'),
        },
      });
      render(<LoginForm />);
      expect(screen.getByRole('alert')).toHaveTextContent(
        '이메일 또는 비밀번호가 올바르지 않습니다',
      );
    });
  });
});
