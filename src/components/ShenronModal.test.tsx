import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ShenronModal from './ShenronModal';

describe('ShenronModal component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ShenronModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders gathering sequence when open and allows skipping to wish state', async () => {
    const user = userEvent.setup();
    render(<ShenronModal isOpen={true} onClose={vi.fn()} weeklyHours="40.0" targetHours="40.0" />);

    expect(screen.getByText(/THE 7 DRAGON BALLS GATHER!/i)).toBeInTheDocument();

    const skipButton = screen.getByText(/Skip Summon Animation/i);
    await user.click(skipButton);

    // After skip, Shenron should be present and ask for wish
    expect(screen.getByText(/SHENRON, THE ETERNAL DRAGON/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose a Warrior's Wish:/i)).toBeInTheDocument();
  });

  it('allows making a preset wish and reveals fortune cookie response', async () => {
    const user = userEvent.setup();
    render(<ShenronModal isOpen={true} onClose={vi.fn()} />);

    // Skip to summoned
    await user.click(screen.getByText(/Skip Summon Animation/i));

    // Select first preset wish
    const presetButton = screen.getAllByRole('button', { name: /Make my code completely bug-free forever!/i })[0];
    await user.click(presetButton);

    // Granting stage reveals fortune
    expect(await screen.findByText(/The Sacred Fortune:/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/Copy Fortune/i)).toBeInTheDocument();
  });
});
