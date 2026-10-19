import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Header from './Header';

describe('Header component', () => {
  const defaultProps = {
    weekStart: new Date('2026-08-17T00:00:00Z'), // Monday
    viewMode: 'weekly' as const,
    weeklyWorklogs: [],
    dailyTarget: 480,
    weeklyTarget: 2400,
    theme: 'dark' as const,
    onPrevWeek: vi.fn(),
    onNextWeek: vi.fn(),
    onToday: vi.fn(),
    onSaveNow: vi.fn(),
    onEditTargets: vi.fn(),
    onEditColors: vi.fn(),
    onOpenSdpSettings: vi.fn(),
    onOpenAchievements: vi.fn(),
    onSetTheme: vi.fn(),
  };

  it('renders week label and targets correctly', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText(/Weekly Target/i)).toBeInTheDocument();
    expect(screen.getByText('0.0 / 40.0 hrs')).toBeInTheDocument();
  });

  it('triggers navigation callbacks on button clicks', async () => {
    const user = userEvent.setup();
    render(<Header {...defaultProps} />);
    
    const prevButton = screen.getByTitle('Previous week');
    const nextButton = screen.getByTitle('Next week');

    await user.click(prevButton);
    expect(defaultProps.onPrevWeek).toHaveBeenCalled();

    await user.click(nextButton);
    expect(defaultProps.onNextWeek).toHaveBeenCalled();
  });

  it('can open the theme menu and select light theme', async () => {
    const user = userEvent.setup();
    render(<Header {...defaultProps} />);
    
    const themeButton = screen.getByTitle('Change Theme');
    await user.click(themeButton);
    
    const lightThemeOption = screen.getByText('light');
    expect(lightThemeOption).toBeInTheDocument();

    await user.click(lightThemeOption);
    expect(defaultProps.onSetTheme).toHaveBeenCalledWith('light');
  });

  it('can open the theme menu and select dark theme', async () => {
    const user = userEvent.setup();
    render(<Header {...defaultProps} theme="light" />);
    
    const themeButton = screen.getByTitle('Change Theme');
    await user.click(themeButton);
    
    const darkThemeOption = screen.getByText('dark');
    expect(darkThemeOption).toBeInTheDocument();

    await user.click(darkThemeOption);
    expect(defaultProps.onSetTheme).toHaveBeenCalledWith('dark');
  });

  it('can open the profile menu and click actions', async () => {
    const user = userEvent.setup();
    render(<Header {...defaultProps} sdpConfig={{ ownerName: 'Test User' }} />);
    
    const profileButton = screen.getByTitle('User Profile & Settings');
    await user.click(profileButton);

    expect(screen.getByText('Test User')).toBeInTheDocument();

    const saveButton = screen.getByTitle('Force Save all data to Disk');
    await user.click(saveButton);
    expect(defaultProps.onSaveNow).toHaveBeenCalled();
  });
});
