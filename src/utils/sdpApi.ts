import type { SdpConfig, Worklog } from '../db';
import { calculateDuration } from './ganttMath';

export type TicketType = 'CH' | 'SR';

export function detectTicketType(ticketId: string): TicketType {
  return ticketId.toUpperCase().startsWith('CH-') ? 'CH' : 'SR';
}

export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function buildSdpWorklogPayload(
  worklog: {
    date: string;
    startTime: number;
    endTime: number;
    description: string;
    worklogType: string;
  },
  sdpConfig: SdpConfig,
  ownerId?: string
) {
  // Convert to hours and minutes for Manage Engine payload
  const durationTotalMins = calculateDuration(worklog.startTime, worklog.endTime);
  const timeSpentHours = Math.floor(durationTotalMins / 60);
  const timeSpentMins = durationTotalMins % 60;
  // Create start time in MS
  // We need to parse worklog.date (YYYY-MM-DD) and add startTime (minutes)
  const [year, month, day] = worklog.date.split('-').map(Number);
  const startHours = Math.floor(worklog.startTime / 60);
  const startMins = worklog.startTime % 60;
  
  // We assume local timezone since that's what the UI uses
  const startTimeObj = new Date(year, month - 1, day, startHours, startMins, 0, 0);
  const startTimeMs = startTimeObj.getTime();

  // Create end time in MS
  const endHours = Math.floor(worklog.endTime / 60);
  const endMins = worklog.endTime % 60;
  const endTimeObj = new Date(year, month - 1, day, endHours, endMins, 0, 0);
  const endTimeMs = endTimeObj.getTime();

  // Find worklog type ID if mapping exists
  const worklogTypeId = sdpConfig.worklogTypeMap?.[worklog.worklogType];

  const payload: any = {
    worklog: {
      description: worklog.description || "Worklog entry",
      time_spent: {
        hours: timeSpentHours.toString(),
        minutes: timeSpentMins.toString()
      },
      start_time: {
        value: startTimeMs
      },
      end_time: {
        value: endTimeMs
      },
      include_nonoperational_hours: true
    }
  };

  // Optional fields
  if (ownerId) {
    payload.worklog.owner = { id: ownerId };
  }
  
  if (worklogTypeId) {
    payload.worklog.worklog_type = { id: worklogTypeId };
  }

  return payload;
}

export async function postWorklogToSdp(
  worklog: {
    date: string;
    startTime: number;
    endTime: number;
    description: string;
    worklogType: string;
    ticketId: string;
    urlTicketId: string;
  },
  sdpConfig: SdpConfig,
  ownerId?: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  try {
    if (!worklog.urlTicketId) {
      throw new Error('URL Ticket ID is required to post to Manage Engine.');
    }
    if (!sdpConfig.cookieString) {
      throw new Error('Manage Engine authentication is not configured. Please set cookies in Manage Engine Settings.');
    }

    const ticketType = detectTicketType(worklog.ticketId);
    const endpoint = ticketType === 'CH' ? 'changes' : 'requests';
    
    // e.g. https://servicedeskplus.smretailinc.com/api/v3/changes/108026001133988859/worklogs
    const sdpUrl = `https://servicedeskplus.smretailinc.com/api/v3/${endpoint}/${worklog.urlTicketId}/worklogs`;
    
    const payload = buildSdpWorklogPayload(worklog, sdpConfig, ownerId);

    const res = await fetch('/api/sdp/post-worklog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: sdpUrl,
        payload,
        cookies: sdpConfig.cookieString,
        csrfToken: sdpConfig.csrfToken,
        appId: sdpConfig.appId || '696655712',
        nonce: generateNonce()
      })
    });

    if (!res.ok) {
      const text = await res.text();
      let errorMsg = `Server returned ${res.status}`;
      try {
        const json = JSON.parse(text);
        if (json.response_status?.messages?.[0]?.message) {
          errorMsg = json.response_status.messages[0].message;
        } else {
          errorMsg = text;
        }
      } catch (e) {
        errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    const data = await res.json();
    
    // Check if Manage Engine API returned a logical error even with 200 OK
    if (data.response_status?.status === 'failed') {
       const msg = data.response_status.messages?.[0]?.message || 'Manage Engine API returned failure status';
       throw new Error(msg);
    }
    
    return { success: true, response: data };
  } catch (e: any) {
    console.error('Error posting to Manage Engine:', e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchTicketDetails(
  ticketId: string,
  sdpConfig: SdpConfig,
  knownUrlTicketId?: string
): Promise<{ urlTicketId?: string; ownerId?: string; subject?: string; status?: string; error?: string }> {
  try {
    if (!sdpConfig.cookieString) {
      throw new Error('Manage Engine authentication is not configured.');
    }

    const ticketType = detectTicketType(ticketId);
    const endpoint = ticketType === 'CH' ? 'changes' : 'requests';
    const displayId = ticketId.replace(/^(CH-|SR-)/i, '').trim();

    // Priority 1: Direct endpoint lookup if knownUrlTicketId or displayId is already an internal ID
    const directId = (knownUrlTicketId && knownUrlTicketId.trim().length > 10)
      ? knownUrlTicketId.trim()
      : (/^\d+$/.test(displayId) && displayId.length > 14)
        ? displayId
        : null;

    if (directId) {
      try {
        const sdpUrl = `https://servicedeskplus.smretailinc.com/api/v3/${endpoint}/${directId}`;
        const res = await fetch('/api/sdp/fetch-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: sdpUrl,
            cookies: sdpConfig.cookieString,
            csrfToken: sdpConfig.csrfToken,
            appId: sdpConfig.appId || '696655712',
            nonce: generateNonce()
          })
        });

        if (res.ok) {
          const json = await res.json();
          const ticket = ticketType === 'CH' ? json.change : json.request;
          if (ticket && ticket.id) {
            return {
              urlTicketId: String(ticket.id),
              ownerId: ticket.technician?.id || ticket.owner?.id || undefined,
              subject: typeof ticket.subject === 'object' ? (ticket.subject?.name || ticket.subject?.value || ticket.subject?.display_value) : (ticket.subject || ticket.title || undefined),
              status: typeof ticket.status === 'object' ? (ticket.status?.name || ticket.status?.internal_name || '') : (ticket.status || undefined)
            };
          }
        }
      } catch {
        // Fallback to displayId lookup if directId failed
      }
    }

    // Priority 2: Direct lookup with displayId for Service Requests
    if (ticketType === 'SR') {
      try {
        const sdpUrl = `https://servicedeskplus.smretailinc.com/api/v3/requests/${displayId}`;
        const res = await fetch('/api/sdp/fetch-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: sdpUrl,
            cookies: sdpConfig.cookieString,
            csrfToken: sdpConfig.csrfToken,
            appId: sdpConfig.appId || '696655712',
            nonce: generateNonce()
          })
        });

        if (res.ok) {
          const json = await res.json();
          const ticket = json.request;
          if (ticket && ticket.id) {
            return {
              urlTicketId: String(ticket.id),
              ownerId: ticket.technician?.id || ticket.owner?.id || undefined,
              subject: typeof ticket.subject === 'object' ? (ticket.subject?.name || ticket.subject?.value || ticket.subject?.display_value) : (ticket.subject || ticket.title || undefined),
              status: typeof ticket.status === 'object' ? (ticket.status?.name || ticket.status?.internal_name || '') : (ticket.status || undefined)
            };
          }
        }
      } catch {}
    }

    // Priority 3: Search criteria query (only 1 clean query)
    const searchPayload = {
      list_info: {
        row_count: 1,
        search_criteria: {
          field: "display_id",
          condition: "is",
          value: displayId
        }
      }
    };

    try {
      const sdpUrl = `https://servicedeskplus.smretailinc.com/api/v3/${endpoint}?input_data=${encodeURIComponent(JSON.stringify(searchPayload))}`;
      const res = await fetch('/api/sdp/fetch-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: sdpUrl,
          cookies: sdpConfig.cookieString,
          csrfToken: sdpConfig.csrfToken,
          appId: sdpConfig.appId || '696655712',
          nonce: generateNonce()
        })
      });

      if (res.ok) {
        const json = await res.json();
        const items = ticketType === 'CH' ? json.changes : json.requests;
        if (items && items.length > 0) {
          const ticket = items[0];
          return {
            urlTicketId: String(ticket.id),
            ownerId: ticket.technician?.id || ticket.owner?.id || undefined,
            subject: typeof ticket.subject === 'object' ? (ticket.subject?.name || ticket.subject?.value || ticket.subject?.display_value) : (ticket.subject || ticket.title || undefined),
            status: typeof ticket.status === 'object' ? (ticket.status?.name || ticket.status?.internal_name || '') : (ticket.status || undefined)
          };
        }
      }
    } catch {}

    return { error: `Ticket "${ticketId}" not found in Manage Engine.` };
  } catch (e: any) {
    return { error: e.message || 'Failed to fetch ticket' };
  }
}

export async function fetchTicketStatusesBatch(
  items: { key: string; ticketId: string; urlTicketId?: string; status?: string }[],
  sdpConfig: SdpConfig,
  onProgress?: (progressText: string, current: number, total: number) => void
): Promise<{ updates: Record<string, { status?: string; urlTicketId?: string; subject?: string }>; error?: string }> {
  if (!sdpConfig.cookieString) {
    return { updates: {}, error: 'Manage Engine authentication is not configured.' };
  }

  const updates: Record<string, { status?: string; urlTicketId?: string; subject?: string }> = {};
  const validItems = items.filter(i => i.ticketId && i.ticketId.trim() !== '');
  if (validItems.length === 0) return { updates: {} };

  const pendingKeys = new Set(validItems.map(i => i.key));

  // STEP 1: Fast bulk fetch of assigned SR and CH tickets (Only 2 requests total!)
  if (sdpConfig.ownerId) {
    try {
      onProgress?.('Fetching assigned tickets...', 0, validItems.length);
      
      const [srRes, chRes] = await Promise.allSettled([
        fetchMyAssignedTickets(sdpConfig, 'SR'),
        fetchMyAssignedTickets(sdpConfig, 'CH')
      ]);

      const assignedTickets: SdpTicketSummary[] = [];
      if (srRes.status === 'fulfilled' && srRes.value.tickets) {
        assignedTickets.push(...srRes.value.tickets);
      }
      if (chRes.status === 'fulfilled' && chRes.value.tickets) {
        assignedTickets.push(...chRes.value.tickets);
      }

      const ticketMapById = new Map<string, SdpTicketSummary>();
      const ticketMapByDisplayId = new Map<string, SdpTicketSummary>();

      for (const t of assignedTickets) {
        if (t.id) ticketMapById.set(t.id, t);
        if (t.displayId) {
          ticketMapByDisplayId.set(t.displayId.toLowerCase(), t);
          ticketMapByDisplayId.set(`ch-${t.displayId.toLowerCase()}`, t);
          ticketMapByDisplayId.set(`sr-${t.displayId.toLowerCase()}`, t);
        }
      }

      for (const item of validItems) {
        const cleanTicketId = item.ticketId.trim().toLowerCase();
        let match: SdpTicketSummary | undefined;

        if (item.urlTicketId && ticketMapById.has(item.urlTicketId)) {
          match = ticketMapById.get(item.urlTicketId);
        } else if (ticketMapByDisplayId.has(cleanTicketId)) {
          match = ticketMapByDisplayId.get(cleanTicketId);
        } else {
          const rawNum = cleanTicketId.replace(/^(ch-|sr-)/i, '');
          if (ticketMapByDisplayId.has(rawNum)) {
            match = ticketMapByDisplayId.get(rawNum);
          }
        }

        if (match) {
          updates[item.key] = {
            status: match.status || item.status,
            urlTicketId: match.id || item.urlTicketId,
            subject: match.subject
          };
          pendingKeys.delete(item.key);
        }
      }
    } catch (e) {
      console.warn('Bulk assigned tickets fetch failed, falling back to sequential fetch:', e);
    }
  }

  // STEP 2: For any remaining unassigned tickets, sync sequentially with throttle (800ms delay)
  const remainingItems = validItems.filter(i => pendingKeys.has(i.key));
  let completedCount = validItems.length - remainingItems.length;

  onProgress?.(`Synced ${completedCount}/${validItems.length} tickets`, completedCount, validItems.length);

  for (let i = 0; i < remainingItems.length; i++) {
    const item = remainingItems[i];
    
    // Throttle delay between individual requests to prevent 429 rate-limiting
    await new Promise(res => setTimeout(res, 800));

    onProgress?.(`Syncing ${item.ticketId} (${completedCount + 1}/${validItems.length})...`, completedCount, validItems.length);

    try {
      const res = await fetchTicketDetails(item.ticketId, sdpConfig, item.urlTicketId);
      
      if (!res.error && (res.status || res.urlTicketId)) {
        updates[item.key] = {
          status: res.status || item.status,
          urlTicketId: res.urlTicketId || item.urlTicketId,
          subject: res.subject
        };
      } else if (res.error && res.error.includes('429')) {
        // If 429 rate limit is encountered, back off 3 seconds
        console.warn(`Rate limit encountered on ${item.ticketId}, backing off 3s`);
        await new Promise(res => setTimeout(res, 3000));
      }
    } catch (err) {
      console.warn(`Failed to sync ticket ${item.ticketId}:`, err);
    }

    completedCount++;
    onProgress?.(`Synced ${completedCount}/${validItems.length} tickets`, completedCount, validItems.length);
  }

  return { updates };
}

export function parseSdpTimestamp(field: any): { time?: number; formatted?: string } {
  if (!field) return {};
  if (typeof field === 'object') {
    const rawVal = field.value ?? field.millis ?? field.time;
    const num = rawVal !== undefined && rawVal !== null && rawVal !== '' ? Number(rawVal) : NaN;
    const time = !isNaN(num) && num > 0 ? num : undefined;
    const formatted = field.display_value || (time ? new Date(time).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) : undefined);
    return { time, formatted };
  }
  if (typeof field === 'number') {
    return {
      time: field,
      formatted: new Date(field).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    };
  }
  if (typeof field === 'string') {
    const num = Number(field);
    if (!isNaN(num) && num > 1000000000) {
      return {
        time: num,
        formatted: new Date(num).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      };
    }
    const parsed = Date.parse(field);
    if (!isNaN(parsed) && parsed > 0) {
      return {
        time: parsed,
        formatted: new Date(parsed).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      };
    }
    return { formatted: field };
  }
  return {};
}

export interface SdpTicketSummary {
  id: string;           // Internal URL ticket ID
  displayId: string;    // e.g. "7318427"
  subject: string;
  status?: string;
  ticketType: 'SR' | 'CH';
  createdTime?: number;
  createdTimeFormatted?: string;
}

export async function fetchMyAssignedTickets(
  sdpConfig: SdpConfig,
  ticketType: 'SR' | 'CH' = 'SR'
): Promise<{ tickets?: SdpTicketSummary[]; error?: string }> {
  try {
    if (!sdpConfig.cookieString) {
      throw new Error('Manage Engine authentication is not configured.');
    }
    if (!sdpConfig.ownerId) {
      throw new Error('Owner ID is not configured. Set it in Manage Engine Settings.');
    }

    const endpoint = ticketType === 'CH' ? 'changes' : 'requests';
    const technicianField = ticketType === 'CH' ? 'owner' : 'technician';

    const inputData = {
      list_info: {
        row_count: "100",
        start_index: 1,
        fields_required: [
          "display_id",
          "subject",
          "technician",
          "status",
          "display_key",
          "created_time",
          "completed_time",
          "resolved_time",
          "scheduled_start_time"
        ],
        get_total_count: false,
        search_criteria: {
          field: technicianField,
          condition: "is",
          value: sdpConfig.ownerId
        },
        sort_fields: [
          { field: "display_id", order: "desc" }
        ]
      }
    };

    const sdpUrl = `https://servicedeskplus.smretailinc.com/api/v3/${endpoint}?input_data=${encodeURIComponent(JSON.stringify(inputData))}`;

    const res = await fetch('/api/sdp/fetch-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: sdpUrl,
        cookies: sdpConfig.cookieString,
        csrfToken: sdpConfig.csrfToken,
        appId: sdpConfig.appId || '696655712',
        nonce: generateNonce()
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const json = await res.json();

    if (json.response_status?.status === 'failed' || json.response_status?.[0]?.status === 'failed') {
      const msg = json.response_status?.messages?.[0]?.message || json.response_status?.[0]?.messages?.[0]?.message || 'Unknown Manage Engine error';
      throw new Error(msg);
    }

    const items = ticketType === 'CH' ? json.changes : json.requests;

    if (!items || items.length === 0) {
      return { tickets: [] };
    }

    // Filter to only tickets where technician/owner matches our ownerId
    const myTickets: SdpTicketSummary[] = items
      .filter((t: any) => {
        const tech = t.technician || t.owner;
        return tech && String(tech.id) === sdpConfig.ownerId;
      })
      .map((t: any) => {
        const timeObj = parseSdpTimestamp(t.created_time || t.scheduled_start_time || t.completed_time || t.resolved_time);
        return {
          id: String(t.id),
          displayId: String(t.display_id),
          subject: typeof t.subject === 'object' ? (t.subject?.name || t.subject?.value || '') : (t.subject || ''),
          status: typeof t.status === 'object' ? (t.status?.name || '') : (t.status || ''),
          ticketType,
          createdTime: timeObj.time,
          createdTimeFormatted: timeObj.formatted,
        };
      });

    return { tickets: myTickets };

  } catch (e: any) {
    return { error: e.message || 'Failed to fetch assigned tickets' };
  }
}
