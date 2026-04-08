import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from './SignupForm';

const mockSignupMutate = vi.fn();

vi.mock('../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/use-auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockUseAuth(overrides: Record<string, any> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    loginMutation: { mutate: vi.fn(), isPending: false, error: null },
    signupMutation: { mutate: mockSignupMutate, isPending: false, error: null },
    logoutMutation: { mutate: vi.fn(), isPending: false, error: null },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth();
  });

  describe('rendering', () => {
    it('renders name, email and password fields', () => {
      render(<SignupForm />);
      expect(screen.getByLabelText(/이름/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument();
    });

    it('renders the submit button', () => {
      render(<SignupForm />);
      expect(
        screen.getByRole('button', { name: /회원가입/i }),
      ).toBeInTheDocument();
    });

    it('does not show validation errors on initial render', () => {
      render(<SignupForm />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows email validation error when submitting with no email', async () => {
      render(<SignupForm />);
      await userEvent.click(screen.getByRole('button', { name: /회원가입/i }));
      expect(
        await screen.findByText(/유효한 이메일을 입력해주세요/i),
      ).toBeInTheDocument();
    });

    it('shows email validation error when email format is invalid', async () => {
      render(<SignupForm />);
      await userEvent.type(screen.getByLabelText(/이메일/i), 'not-an-email');
      await userEvent.click(screen.getByRole('button', { name: /회원가입/i }));
      expect(
        await screen.findByText(/유효한 이메일을 입력해주세요/i),
      ).toBeInTheDocument();
    });

    it('shows password validation error when password is too short', async () => {
      render(<SignupForm />);
      await userEvent.type(screen.getByLabelText(/이메일/i), 'valid@email.com');
      await userEvent.type(screen.getByLabelText(/비밀번호/i), 'short');
      await userEvent.click(screen.getByRole('button', { name: /회원가입/i }));
      expect(
        await screen.findByText(/비밀번호는 8자 이상이어야 합니다/i),
      ).toBeInTheDocument();
    });

    it('shows password validation error when password is empty', async () => {
      render(<SignupForm />);
      await userEvent.type(screen.getByLabelText(/이메일/i), 'valid@email.com');
      await userEvent.click(screen.getByRole('button', { name: /회원가입/i }));
      expect(
        await screen.findByText(/비밀번호는 8자 이상이어야 합니다/i),
      ).toBeInTheDocument();
    });

    it('does not call signupMutation when form is invalid', async () => {
      render(<SignupForm />);
      await userEvent.click(screen.getByRole('button', { name: /회원가입/i }));
      await screen.findByText(/유효한 이메일을 입력해주세요/i);
      expect(mockSignupMutate).not.toHaveBeenCalled();
    });
  });

  describe('valid submission', () => {
    it('calls signupMutation.mutate with email and password when name is omitted', async () => {
      render(<SignupForm />);
      await userEvent.type(
        screen.getByLabelText(/이메일/i),
        'newuser@example.com',
      );
      await userEvent.type(
        screen.getByLabelText(/비밀번호/i),
        'securepassword',
      );
      await userEvent.click(screen.getByRole('button', { name: /회원가입/i }));
      expect(mockSignupMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          password: 'securepassword',
        }),
      );
    });

    it('calls signupMutation.mutate with name when name is provided', async () => {
      render(<SignupForm />);
      await userEvent.type(screen.getByLabelText(/이름/i), 'Alice');
      await userEvent.type(
        screen.getByLabelText(/이메일/i),
        'alice@example.com',
      );
      await userEvent.type(
        screen.getByLabelText(/비밀번호/i),
        'securepassword',
      );
      await userEvent.click(screen.getByRole('button', { name: /회원가입/i }));
      expect(mockSignupMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Alice',
          email: 'alice@example.com',
          password: 'securepassword',
        }),
      );
    });
  });

  describe('loading state', () => {
    it('disables submit button while isPending is true', () => {
      mockUseAuth({
        signupMutation: {
          mutate: mockSignupMutate,
          isPending: true,
          error: null,
        },
      });
      render(<SignupForm />);
      expect(screen.getByRole('button', { name: /가입 중/i })).toBeDisabled();
    });

    it('shows loading text while isPending is true', () => {
      mockUseAuth({
        signupMutation: {
          mutate: mockSignupMutate,
          isPending: true,
          error: null,
        },
      });
      render(<SignupForm />);
      expect(
        screen.getByRole('button', { name: /가입 중/i }),
      ).toBeInTheDocument();
    });
  });

  describe('api error', () => {
    it('displays error message when mutation returns an error', () => {
      mockUseAuth({
        signupMutation: {
          mutate: mockSignupMutate,
          isPending: false,
          error: new Error('이미 사용 중인 이메일입니다'),
        },
      });
      render(<SignupForm />);
      expect(screen.getByRole('alert')).toHaveTextContent(
        '이미 사용 중인 이메일입니다',
      );
    });
  });
});
