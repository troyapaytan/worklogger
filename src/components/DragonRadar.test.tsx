import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import DragonRadar from './DragonRadar';

describe('DragonRadar component', () => {
  const defaultProps = {
    weeklyHours: '25.0',
    targetHours: '40.0',
    weeklyPercent: 62.5,
    onEditTargets: vi.fn(),
    onSummonShenron: vi.fn(),
  };

  it('renders radar device and balls collected count', () => {
    render(<DragonRadar {...defaultProps} />);
    expect(screen.getByText('DRAGON RADAR')).toBeInTheDocument();
    expect(screen.getByText('25.0 / 40.0 hrs')).toBeInTheDocument();
    // 62.5% of 7 balls = floor(4.375) = 4 balls
    expect(screen.getByText(/4\/7/)).toBeInTheDocument();
    expect(screen.getByText('Edit Target')).toBeInTheDocument();
  });

  it('shows Summon Shenron button when target is reached (100% or more)', async () => {
    const user = userEvent.setup();
    const onSummon = vi.fn();

    render(
      <DragonRadar
        weeklyHours="40.0"
        targetHours="40.0"
        weeklyPercent={100}
        onEditTargets={vi.fn()}
        onSummonShenron={onSummon}
      />
    );

    const summonButton = screen.getByText(/Summon Shenron!/i);
    expect(summonButton).toBeInTheDocument();

    await user.click(summonButton);
    expect(onSummon).toHaveBeenCalledTimes(1);
  });
});
