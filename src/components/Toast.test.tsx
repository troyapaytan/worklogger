import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock framer-motion to bypass animations in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, className, onClick }: any) => (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    ),
  },
}));

import { ToastProvider, useToast } from './Toast';

// A helper component to trigger toasts
function ToastTestHelper() {
  const { addToast } = useToast();
  return (
    <div>
      <button onClick={() => addToast('Success message')}>Success</button>
      <button onClick={() => addToast('Error message', 'error')}>Error</button>
    </div>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children correctly', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Child Content</div>
      </ToastProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('can display a success toast', () => {
    render(
      <ToastProvider>
        <ToastTestHelper />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('can display an error toast', () => {
    render(
      <ToastProvider>
        <ToastTestHelper />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Error'));
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('auto-dismisses toasts after 3.5 seconds', async () => {
    render(
      <ToastProvider>
        <ToastTestHelper />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    act(() => {
      vi.runAllTimers();
    });

    // Run pending timers again to flush any remaining animation frame microtasks
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });
});
