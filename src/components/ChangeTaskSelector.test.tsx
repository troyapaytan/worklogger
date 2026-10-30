import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChangeTaskSelector from './ChangeTaskSelector';
import * as sdpApi from '../utils/sdpApi';
import { isTaskOwnedByUser } from '../utils/sdpApi';
import type { SdpConfig } from '../db';

describe('ChangeTaskSelector component', () => {
  const sdpConfig: SdpConfig = {
    cookieString: 'JSESSIONID=abc;',
    csrfToken: 'csrf',
    ownerId: '108026001157415656',
    ownerName: 'Troy Andrei A. Paytan',
  };

  const sampleTasks: sdpApi.SdpChangeTask[] = [
    {
      id: '108026001143121360',
      title: 'SM Markets - BDO Debit Tender_SMCO/PSI',
      index: 1,
      changeStage: 'Define and Design',
      stageIndex: 3,
      status: 'Open',
      ownerName: 'Thomas Andre D. Gabay',
      ownerId: '108026000000006619',
    },
    {
      id: '108026001228664467',
      title: 'SM Markets - BDO Debit Tender_SMCO/PSI',
      index: 2,
      changeStage: 'Build',
      stageIndex: 5,
      status: 'In Progress',
      ownerName: 'Troy Andrei A. Paytan',
      ownerId: '108026001157415656',
    },
    {
      id: '108026001228664999',
      title: 'SM Markets - BDO Debit Tender_SVI',
      index: 1,
      changeStage: 'Close',
      stageIndex: 8,
      status: 'Closed',
      ownerName: 'Troy Andrei A. Paytan',
      ownerId: '108026001157415656',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('matches task ownership by ownerId or ownerName fallback', () => {
    expect(isTaskOwnedByUser(sampleTasks[1], sdpConfig)).toBe(true);
    expect(isTaskOwnedByUser(sampleTasks[0], sdpConfig)).toBe(false);
    expect(
      isTaskOwnedByUser(
        { ownerName: 'Troy Andrei A. Paytan' },
        { ownerName: 'troy andrei a. paytan' }
      )
    ).toBe(true);
  });

  it('renders empty label when no task is selected and loads task count', async () => {
    vi.spyOn(sdpApi, 'fetchChangeTasks').mockResolvedValue({ tasks: sampleTasks });

    render(
      <ChangeTaskSelector
        urlTicketId="108026001133988859"
        sdpConfig={sdpConfig}
        taskId=""
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Main Change Ticket (No Sub-task)')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('3 tasks')).toBeInTheDocument();
    });
  });

  it('filters by Owner: YOU toggle, combines with Open filter, and selects a task with formatted stage label', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    vi.spyOn(sdpApi, 'fetchChangeTasks').mockResolvedValue({ tasks: sampleTasks });

    render(
      <ChangeTaskSelector
        urlTicketId="108026001133988859"
        sdpConfig={sdpConfig}
        taskId=""
        onChange={handleChange}
      />
    );

    await waitFor(() => expect(screen.getByText('3 tasks')).toBeInTheDocument());

    await user.click(screen.getByRole('button'));

    // Toggle "Owner: YOU" filter button
    const youBtn = screen.getByRole('button', { name: /Owner:\s*YOU/i });
    expect(youBtn).toHaveAttribute('aria-pressed', 'false');
    await user.click(youBtn);
    expect(youBtn).toHaveAttribute('aria-pressed', 'true');

    // Thomas Andre D. Gabay's task is excluded; only the 2 YOU tasks remain
    expect(screen.queryByText('Thomas Andre D. Gabay')).not.toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);

    // Combine "Owner: YOU" + "Open" filter -> excludes Closed YOU task, leaving 1 Open YOU task
    await user.click(screen.getByRole('button', { name: /Open/i }));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    await user.click(options[0]);

    expect(handleChange).toHaveBeenCalledWith(
      '108026001228664467',
      'SM Markets - BDO Debit Tender_SMCO/PSI [Build]'
    );
  });

  it('supports filtering tasks owned by YOU via search keyword "you" or "@you"', async () => {
    const user = userEvent.setup();
    vi.spyOn(sdpApi, 'fetchChangeTasks').mockResolvedValue({ tasks: sampleTasks });

    render(
      <ChangeTaskSelector
        urlTicketId="108026001133988859"
        sdpConfig={sdpConfig}
        taskId=""
        onChange={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByText('3 tasks')).toBeInTheDocument());
    await user.click(screen.getByRole('button'));

    const searchInput = screen.getByPlaceholderText(/Search title, stage, owner, ID, or 'you'/i);
    await user.type(searchInput, 'bdo debit you');

    // Only the 2 tasks owned by YOU match "bdo debit you"
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByText('Thomas Andre D. Gabay')).not.toBeInTheDocument();
  });

  it('displays selected task details and clears back to Main Change Ticket', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    vi.spyOn(sdpApi, 'fetchChangeTasks').mockResolvedValue({ tasks: sampleTasks });

    render(
      <ChangeTaskSelector
        urlTicketId="108026001133988859"
        sdpConfig={sdpConfig}
        taskId="108026001228664467"
        taskTitle="SM Markets - BDO Debit Tender_SMCO/PSI [Build]"
        onChange={handleChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Build')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    const clearBtn = screen.getByTitle('Reset to Main Change Ticket');
    await user.click(clearBtn);
    expect(handleChange).toHaveBeenCalledWith('', '');
  });
});
