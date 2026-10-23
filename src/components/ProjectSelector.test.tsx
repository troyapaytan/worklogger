import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ProjectSelector, { type CategoryOption } from './ProjectSelector';

describe('ProjectSelector component', () => {
  const sampleCategories: CategoryOption[] = [
    {
      key: 'GCASH',
      name: 'GCash Payment Gateway',
      color: '#0080ff',
      ticketId: 'CH-4001',
      urlTicketId: '108026001',
      status: 'In Progress',
    },
    {
      key: 'MAYA',
      name: 'Maya Digital Wallet',
      color: '#00cc44',
      ticketId: 'SR-2015',
      urlTicketId: '108026002',
      status: 'Open',
    },
    {
      key: 'POS',
      name: 'POS Terminal Sync',
      color: '#ff6600',
      ticketId: 'CH-4010',
      urlTicketId: '108026003',
      status: 'Closed',
    },
    {
      key: 'INTERNAL',
      name: 'Team Sync & Grooming',
      color: '#9900ef',
      ticketId: '',
      urlTicketId: '',
      status: '',
    },
  ];

  it('renders trigger with placeholder when no value is selected', () => {
    render(
      <ProjectSelector
        value=""
        categories={sampleCategories}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('— Select Project —')).toBeInTheDocument();
  });

  it('renders selected project with ticket ID and status badge', () => {
    render(
      <ProjectSelector
        value="GCASH"
        categories={sampleCategories}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('GCash Payment Gateway')).toBeInTheDocument();
    expect(screen.getByText('CH-4001')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('opens dropdown and shows all categories and status filter pills', async () => {
    const user = userEvent.setup();
    render(
      <ProjectSelector
        value=""
        categories={sampleCategories}
        onChange={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    // Search input is present
    const searchInput = screen.getByPlaceholderText('Search by title, ticket #, or status...');
    expect(searchInput).toBeInTheDocument();

    // Status filter pills are rendered
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getAllByText('In Progress').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Open').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Closed').length).toBeGreaterThanOrEqual(1);

    // All options are visible initially
    expect(screen.getByText('GCash Payment Gateway')).toBeInTheDocument();
    expect(screen.getByText('Maya Digital Wallet')).toBeInTheDocument();
    expect(screen.getByText('POS Terminal Sync')).toBeInTheDocument();
    expect(screen.getByText('Team Sync & Grooming')).toBeInTheDocument();
  });

  it('filters tickets based on status pill selection', async () => {
    const user = userEvent.setup();
    render(
      <ProjectSelector
        value=""
        categories={sampleCategories}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button'));

    // Click 'Open' status pill
    const openPill = screen.getByRole('button', { name: /Open/i });
    await user.click(openPill);

    // Only 'Maya Digital Wallet' should be shown
    expect(screen.getByText('Maya Digital Wallet')).toBeInTheDocument();
    expect(screen.queryByText('GCash Payment Gateway')).not.toBeInTheDocument();
    expect(screen.queryByText('POS Terminal Sync')).not.toBeInTheDocument();

    // Clicking 'Open' again toggles back to 'All'
    await user.click(openPill);
    expect(screen.getByText('GCash Payment Gateway')).toBeInTheDocument();
    expect(screen.getByText('Maya Digital Wallet')).toBeInTheDocument();
    expect(screen.getByText('POS Terminal Sync')).toBeInTheDocument();
  });

  it('intuitively searches by ticket number with or without prefix and hashtags', async () => {
    const user = userEvent.setup();
    render(
      <ProjectSelector
        value=""
        categories={sampleCategories}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Search by title, ticket #, or status...');

    // Search partial number '4001'
    await user.type(searchInput, '4001');
    expect(screen.getByText(/GCash Payment Gateway/i)).toBeInTheDocument();
    expect(screen.queryByText(/Maya Digital Wallet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/POS Terminal Sync/i)).not.toBeInTheDocument();

    // Clear and search with hashtag '#2015'
    await user.clear(searchInput);
    await user.type(searchInput, '#2015');
    expect(screen.getByText(/Maya Digital Wallet/i)).toBeInTheDocument();
    expect(screen.queryByText(/GCash Payment Gateway/i)).not.toBeInTheDocument();

    // Clear and search alphanumeric without hyphen 'ch4010'
    await user.clear(searchInput);
    await user.type(searchInput, 'ch4010');
    expect(screen.getByText(/POS Terminal Sync/i)).toBeInTheDocument();
    expect(screen.queryByText(/Maya Digital Wallet/i)).not.toBeInTheDocument();
  });

  it('searches by status term directly', async () => {
    const user = userEvent.setup();
    render(
      <ProjectSelector
        value=""
        categories={sampleCategories}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Search by title, ticket #, or status...');

    await user.type(searchInput, 'closed');
    expect(screen.getByText(/POS Terminal Sync/i)).toBeInTheDocument();
    expect(screen.queryByText(/GCash Payment Gateway/i)).not.toBeInTheDocument();
  });

  it('selects a project on click and triggers onChange', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <ProjectSelector
        value=""
        categories={sampleCategories}
        onChange={handleChange}
      />
    );

    await user.click(screen.getByRole('button'));
    const gcashOption = screen.getByText('GCash Payment Gateway');
    await user.click(gcashOption);

    expect(handleChange).toHaveBeenCalledWith('GCASH');
  });

  it('supports keyboard navigation with ArrowDown and Enter', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <ProjectSelector
        value=""
        categories={sampleCategories}
        onChange={handleChange}
      />
    );

    // Open with Enter key
    const trigger = screen.getByRole('button');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });

    const searchInput = screen.getByPlaceholderText('Search by title, ticket #, or status...');
    // Navigate down to second item (MAYA)
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    // Press Enter to select
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith('MAYA');
  });
});
