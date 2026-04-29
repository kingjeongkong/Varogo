import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from './Sidebar';

// --- module mocks ---

let mockPathname = '/products';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/features/auth';

const mockLogoutMutate = vi.fn();

function mockUseAuthStore(overrides: Record<string, unknown> = {}) {
  vi.mocked(useAuthStore).mockReturnValue({
    user: null,
    isLoading: false,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function mockUseAuth(logoutOverrides: Record<string, unknown> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    logoutMutation: {
      mutate: mockLogoutMutate,
      isPending: false,
      ...logoutOverrides,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/products';
    mockUseAuthStore();
    mockUseAuth();
  });

  describe('navigation rendering', () => {
    it('renders both nav links with correct hrefs', () => {
      render(<Sidebar />);

      const productsLinks = screen.getAllByRole('link', { name: /products/i });
      const integrationsLinks = screen.getAllByRole('link', {
        name: /integrations/i,
      });

      // Products link appears in both desktop + mobile sidebars
      expect(productsLinks.length).toBeGreaterThan(0);
      productsLinks.forEach((link) => {
        // The Varogo logo also matches /products/i because its href is /products,
        // but we want at least one nav link pointing to /products.
        expect(link).toHaveAttribute('href', '/products');
      });

      expect(integrationsLinks.length).toBeGreaterThan(0);
      integrationsLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/integrations');
      });
    });

    it('renders the Varogo logo link to /products', () => {
      render(<Sidebar />);

      const logoLinks = screen.getAllByRole('link', { name: /varogo/i });
      expect(logoLinks.length).toBeGreaterThan(0);
      logoLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/products');
      });
    });
  });

  describe('active state', () => {
    it('marks Products active when pathname is /products', () => {
      mockPathname = '/products';
      render(<Sidebar />);

      const productsLinks = screen
        .getAllByRole('link', { name: /products/i })
        .filter((l) => l.getAttribute('href') === '/products');
      const integrationsLinks = screen.getAllByRole('link', {
        name: /integrations/i,
      });

      productsLinks.forEach((link) => {
        expect(link).toHaveAttribute('aria-current', 'page');
      });
      integrationsLinks.forEach((link) => {
        expect(link).not.toHaveAttribute('aria-current');
      });
    });

    it('marks Products active when pathname is a /product/:id/* prefix', () => {
      mockPathname = '/product/abc-123/posts';
      render(<Sidebar />);

      const productsLinks = screen
        .getAllByRole('link', { name: /products/i })
        .filter((l) => l.getAttribute('href') === '/products');
      const integrationsLinks = screen.getAllByRole('link', {
        name: /integrations/i,
      });

      productsLinks.forEach((link) => {
        expect(link).toHaveAttribute('aria-current', 'page');
      });
      integrationsLinks.forEach((link) => {
        expect(link).not.toHaveAttribute('aria-current');
      });
    });

    it('marks Integrations active when pathname is /integrations', () => {
      mockPathname = '/integrations';
      render(<Sidebar />);

      const productsLinks = screen
        .getAllByRole('link', { name: /products/i })
        .filter((l) => l.getAttribute('href') === '/products');
      const integrationsLinks = screen.getAllByRole('link', {
        name: /integrations/i,
      });

      integrationsLinks.forEach((link) => {
        expect(link).toHaveAttribute('aria-current', 'page');
      });
      productsLinks.forEach((link) => {
        expect(link).not.toHaveAttribute('aria-current');
      });
    });

    it('marks neither nav link active when pathname is unrelated', () => {
      mockPathname = '/other';
      render(<Sidebar />);

      const productsLinks = screen
        .getAllByRole('link', { name: /products/i })
        .filter((l) => l.getAttribute('href') === '/products');
      const integrationsLinks = screen.getAllByRole('link', {
        name: /integrations/i,
      });

      productsLinks.forEach((link) => {
        expect(link).not.toHaveAttribute('aria-current');
      });
      integrationsLinks.forEach((link) => {
        expect(link).not.toHaveAttribute('aria-current');
      });
    });
  });

  describe('user widget', () => {
    it('renders a loading skeleton and no logout button when isLoading=true', () => {
      mockUseAuthStore({ user: null, isLoading: true });
      render(<Sidebar />);

      expect(
        screen.getAllByLabelText('Loading user info').length,
      ).toBeGreaterThan(0);
      expect(
        screen.queryByRole('button', { name: /log out/i }),
      ).not.toBeInTheDocument();
    });

    it('shows the user email and a logout button when a user is present', () => {
      mockUseAuthStore({
        user: { id: 'u-1', email: 'a@b.com', createdAt: '' },
        isLoading: false,
      });
      render(<Sidebar />);

      expect(screen.getAllByText('a@b.com').length).toBeGreaterThan(0);
      expect(
        screen.getAllByRole('button', { name: /log out/i }).length,
      ).toBeGreaterThan(0);
    });

    it('shows the user name instead of email when name is set', () => {
      mockUseAuthStore({
        user: {
          id: 'u-1',
          email: 'a@b.com',
          name: 'Alice',
          createdAt: '',
        },
        isLoading: false,
      });
      render(<Sidebar />);

      expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
      expect(screen.queryByText('a@b.com')).not.toBeInTheDocument();
    });

    it('calls logoutMutation.mutate when the logout button is clicked', async () => {
      const user = userEvent.setup();
      mockUseAuthStore({
        user: { id: 'u-1', email: 'a@b.com', createdAt: '' },
        isLoading: false,
      });
      render(<Sidebar />);

      const buttons = screen.getAllByRole('button', { name: /log out/i });
      await user.click(buttons[0]);

      expect(mockLogoutMutate).toHaveBeenCalledTimes(1);
    });

    it('shows "Logging out...", disables the button, and sets aria-busy when logout is pending', () => {
      mockUseAuthStore({
        user: { id: 'u-1', email: 'a@b.com', createdAt: '' },
        isLoading: false,
      });
      mockUseAuth({ isPending: true });
      render(<Sidebar />);

      const buttons = screen.getAllByRole('button', { name: /logging out/i });
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('aria-busy', 'true');
      });
    });

    it('renders nothing inside the user widget when no user and not loading', () => {
      mockUseAuthStore({ user: null, isLoading: false });
      render(<Sidebar />);

      expect(
        screen.queryByRole('button', { name: /log out/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Loading user info')).not.toBeInTheDocument();
    });
  });

  describe('mobile menu interactions', () => {
    it('renders the hamburger button with aria-expanded=false initially', () => {
      render(<Sidebar />);

      const hamburger = screen.getByRole('button', {
        name: /open navigation menu/i,
      });
      expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens the menu on hamburger click and renders the backdrop', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);

      const hamburger = screen.getByRole('button', {
        name: /open navigation menu/i,
      });
      await user.click(hamburger);

      expect(hamburger).toHaveAttribute('aria-expanded', 'true');

      // Mobile slide-in sidebar exists; when open it should not be aria-hidden
      // and the close button should be exposed.
      expect(
        screen.getByRole('button', { name: /close navigation menu/i }),
      ).toBeInTheDocument();
    });

    it('closes the menu when the backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<Sidebar />);

      const hamburger = screen.getByRole('button', {
        name: /open navigation menu/i,
      });
      await user.click(hamburger);
      expect(hamburger).toHaveAttribute('aria-expanded', 'true');

      // Backdrop is rendered conditionally and is aria-hidden; query the DOM.
      const backdrop = container.querySelector('div[aria-hidden="true"]');
      expect(backdrop).not.toBeNull();
      await user.click(backdrop as Element);

      expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes the menu when Escape is pressed', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);

      const hamburger = screen.getByRole('button', {
        name: /open navigation menu/i,
      });
      await user.click(hamburger);
      expect(hamburger).toHaveAttribute('aria-expanded', 'true');

      await user.keyboard('{Escape}');

      expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes the menu when the inner close button is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);

      const hamburger = screen.getByRole('button', {
        name: /open navigation menu/i,
      });
      await user.click(hamburger);

      const closeButton = screen.getByRole('button', {
        name: /close navigation menu/i,
      });
      await user.click(closeButton);

      expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes the mobile menu when a nav link is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);

      const hamburger = screen.getByRole('button', {
        name: /open navigation menu/i,
      });
      await user.click(hamburger);
      expect(hamburger).toHaveAttribute('aria-expanded', 'true');

      // Mobile slide-in renders its own copy of the nav links; click one.
      const productsLinks = screen.getAllByRole('link', { name: /products/i });
      await user.click(productsLinks[productsLinks.length - 1]);

      expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
