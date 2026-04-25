import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from '@/components/ui/Tooltip';

describe('Tooltip', () => {
  describe('trigger rendering', () => {
    it('renders the child button with its accessible name', () => {
      render(
        <Tooltip content="Helpful hint">
          <button type="button">Open settings</button>
        </Tooltip>,
      );

      expect(
        screen.getByRole('button', { name: 'Open settings' }),
      ).toBeInTheDocument();
    });

    it('does not render the tooltip content by default', () => {
      render(
        <Tooltip content="Helpful hint">
          <button type="button">Open settings</button>
        </Tooltip>,
      );

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(screen.queryByText('Helpful hint')).not.toBeInTheDocument();
    });
  });

  describe('open behavior', () => {
    it('shows the tooltip content when the trigger is focused', async () => {
      render(
        <Tooltip content="Helpful hint">
          <button type="button">Open settings</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button', { name: 'Open settings' });
      trigger.focus();

      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'Helpful hint',
      );
    });

    it('shows the tooltip content when the user tabs to the trigger', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Helpful hint">
          <button type="button">Open settings</button>
        </Tooltip>,
      );

      await user.tab();

      expect(
        screen.getByRole('button', { name: 'Open settings' }),
      ).toHaveFocus();
      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'Helpful hint',
      );
    });

    it('shows the tooltip content when the trigger is hovered', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Helpful hint">
          <button type="button">Open settings</button>
        </Tooltip>,
      );

      await user.hover(screen.getByRole('button', { name: 'Open settings' }));

      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'Helpful hint',
      );
    });
  });

  describe('close behavior', () => {
    it('hides the tooltip content when the trigger is blurred', async () => {
      render(
        <Tooltip content="Helpful hint">
          <button type="button">Open settings</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button', { name: 'Open settings' });
      trigger.focus();

      expect(await screen.findByRole('tooltip')).toBeInTheDocument();

      trigger.blur();

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility wiring', () => {
    it('sets aria-describedby on the trigger pointing to the visible tooltip id when open', async () => {
      render(
        <Tooltip content="Helpful hint">
          <button type="button">Open settings</button>
        </Tooltip>,
      );

      const trigger = screen.getByRole('button', { name: 'Open settings' });
      trigger.focus();

      const tooltip = await screen.findByRole('tooltip');
      const describedBy = trigger.getAttribute('aria-describedby');

      expect(describedBy).toBeTruthy();
      expect(tooltip.id).toBeTruthy();
      expect(describedBy).toBe(tooltip.id);
    });
  });

  describe('content types', () => {
    it('accepts ReactNode content and renders its text', async () => {
      render(
        <Tooltip
          content={
            <span>
              <strong>Bold</strong> hello
            </span>
          }
        >
          <button type="button">Open settings</button>
        </Tooltip>,
      );

      screen.getByRole('button', { name: 'Open settings' }).focus();

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent('Bold hello');
      expect(tooltip.querySelector('strong')).toHaveTextContent('Bold');
    });
  });
});
