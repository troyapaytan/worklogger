import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MinecraftIntroAnimation from './MinecraftIntroAnimation';

describe('MinecraftIntroAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the skip hint text', () => {
    render(<MinecraftIntroAnimation onComplete={vi.fn()} />);

    expect(screen.getByText(/Click or press ESC to skip/i)).toBeInTheDocument();
  });

  it('renders Steve speech bubble after animation starts', () => {
    render(<MinecraftIntroAnimation onComplete={vi.fn()} />);

    // Advance past the 200ms init delay + rAF
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // The speech bubble text should be present
    expect(screen.getByText(/Building your Gantt/i)).toBeInTheDocument();
  });

  it('calls onComplete when Escape key is pressed', () => {
    const onCompleteMock = vi.fn();
    render(<MinecraftIntroAnimation onComplete={onCompleteMock} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onCompleteMock).toHaveBeenCalled();
  });

  it('calls onComplete when clicking the overlay', () => {
    const onCompleteMock = vi.fn();
    const { container } = render(<MinecraftIntroAnimation onComplete={onCompleteMock} />);

    // Click the overlay
    const overlay = container.firstChild as HTMLElement;
    if (overlay) {
      fireEvent.click(overlay);
    }

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onCompleteMock).toHaveBeenCalled();
  });

  it('shows achievement toast after walk completes', () => {
    render(<MinecraftIntroAnimation onComplete={vi.fn()} />);

    // Advance past init (200ms) + walk (4200ms) + achievement delay (500ms)
    act(() => {
      vi.advanceTimersByTime(5200);
    });

    expect(screen.getByText(/Achievement Get!/i)).toBeInTheDocument();
  });
});
