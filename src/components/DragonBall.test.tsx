import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DragonBall from './DragonBall';

describe('DragonBall component', () => {
  it('renders a 4-star Dragon Ball with correct title and attributes', () => {
    render(<DragonBall count={4} size={50} glowing={true} />);
    const ball = screen.getByTitle('4-Star Dragon Ball');
    expect(ball).toBeInTheDocument();
  });

  it('renders stone version after wish is granted', () => {
    render(<DragonBall count={7} size={40} isStone={true} />);
    const ball = screen.getByTitle('7-Star Dragon Ball');
    expect(ball).toBeInTheDocument();
  });

  it('clamps star counts within 1 to 7 range', () => {
    render(<DragonBall count={10} />);
    expect(screen.getByTitle('7-Star Dragon Ball')).toBeInTheDocument();

    render(<DragonBall count={0} />);
    expect(screen.getByTitle('1-Star Dragon Ball')).toBeInTheDocument();
  });
});
