import { render, screen, fireEvent } from '@testing-library/react';
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

  it('can open the theme menu and select a theme', async () => {
    const user = userEvent.setup();
    render(<Header {...defaultProps} />);
    
    const themeButton = screen.getByTitle('Change Theme');
    await user.click(themeButton);
    
    // The menu should open and display theme options
    const lightThemeOption = screen.getByText('light');
    expect(lightThemeOption).toBeInTheDocument();

    await user.click(lightThemeOption);
    expect(defaultProps.onSetTheme).toHaveBeenCalledWith('light');
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

  it('can select dragonball theme and shows dragonball in theme menu', async () => {
    const user = userEvent.setup();
    render(<Header {...defaultProps} />);
    
    const themeButton = screen.getByTitle('Change Theme');
    await user.click(themeButton);

    const dbThemeOption = screen.getByText('Dragon Ball 🐉');
    expect(dbThemeOption).toBeInTheDocument();

    await user.click(dbThemeOption);
    expect(defaultProps.onSetTheme).toHaveBeenCalledWith('dragonball');
  });

  it('renders Dragon Radar and summon action when theme is dragonball', async () => {
    const user = userEvent.setup();
    const onSummon = vi.fn();
    render(
      <Header
        {...defaultProps}
        theme="dragonball"
        weeklyTarget={2400}
        onSummonShenron={onSummon}
      />
    );

    expect(screen.getByText('DRAGON RADAR')).toBeInTheDocument();

    // Open theme menu to verify Summon Shenron button is available in Dragon Ball theme
    const themeButton = screen.getByTitle('Change Theme');
    await user.click(themeButton);

    const summonOption = screen.getByText(/Summon Shenron \(Wish\)/i);
    expect(summonOption).toBeInTheDocument();

    await user.click(summonOption);
    expect(onSummon).toHaveBeenCalled();
  });
});
