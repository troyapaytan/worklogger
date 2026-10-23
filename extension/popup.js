document.getElementById('syncBtn').addEventListener('click', async () => {
  const btn = document.getElementById('syncBtn');
  const statusEl = document.getElementById('status');
  
  btn.disabled = true;
  statusEl.textContent = "Extracting cookies...";
  statusEl.className = "";

  try {
    // 0. Extract details from the active tab if it's the Manage Engine page
    let extractedData = { ownerId: '', ownerName: 'Authenticated User', appId: '696655712', worklogTypeMap: {} };
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url.includes("servicedeskplus.smretailinc.com")) {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async () => {
            let extractedOwnerId = window.ownerId || window.user_id || window.loginUserId || window.technicianId || (window.SDP && window.SDP.user && window.SDP.user.id) || '';
            if (!extractedOwnerId && window.$CS && typeof window.$CS.getLoggedInUserId === 'function') extractedOwnerId = window.$CS.getLoggedInUserId();
            if (!extractedOwnerId) {
              const profileLink = document.querySelector('a[href*="/technicians/"]');
              if (profileLink) { const m = profileLink.href.match(/\/technicians\/(\d+)/); if (m) extractedOwnerId = m[1]; }
            }
            if (!extractedOwnerId) {
              const avatar = document.querySelector('[data-userid]');
              if (avatar) extractedOwnerId = avatar.getAttribute('data-userid');
            }
            if (!extractedOwnerId) {
              for (const s of document.querySelectorAll('script')) {
                const m = s.innerHTML.match(/["']?(?:userId|user_id|loginUserId|LOGGED_IN_USER_ID|TECHNICIAN_ID)["']?\s*[:=]\s*["'](\d+)["']/i);
                if (m) { extractedOwnerId = m[1]; break; }
              }
            }
          
            let extractedOwnerName = window.userName || window.loginUserName || (window.SDP && window.SDP.user && window.SDP.user.name) || '';
            if (!extractedOwnerName && window.$CS && typeof window.$CS.getLoggedInUserName === 'function') extractedOwnerName = window.$CS.getLoggedInUserName();
            if (!extractedOwnerName) {
              const profileLink = document.querySelector('.login-user-name, .user-name, #loginUserName, .profile-name, [data-username]');
              if (profileLink) extractedOwnerName = profileLink.textContent.trim() || profileLink.getAttribute('data-username') || '';
            }
            
            if (extractedOwnerId && !extractedOwnerName) {
              try {
                const csrfCookie = document.cookie.match(/sdpcscook=([^;]+)/);
                const csrf = csrfCookie ? csrfCookie[1] : '';
                const res = await fetch(`/api/v3/technicians/${extractedOwnerId}`, {
                  headers: {
                    'Accept': 'application/vnd.manageengine.v3+json',
                    'X-ZCSRF-TOKEN': csrf ? 'sdpcsparam=' + csrf : ''
                  }
                });
                if (res.ok) {
                  const json = await res.json();
                  extractedOwnerName = (json.technician && json.technician.name) || (json.user && json.user.name) || '';
                } else {
                  const res2 = await fetch(`/api/v3/users/${extractedOwnerId}`, {
                    headers: { 'Accept': 'application/vnd.manageengine.v3+json', 'X-ZCSRF-TOKEN': csrf ? 'sdpcsparam=' + csrf : '' }
                  });
                  if (res2.ok) {
                    const json2 = await res2.json();
                    extractedOwnerName = (json2.user && json2.user.name) || (json2.technician && json2.technician.name) || '';
                  }
                }
              } catch (e) { console.warn('Failed to fetch owner name via API', e); }
            }
          
            const data = { 
              appId: window.appId || (window.SDP && window.SDP.appId) || '696655712', 
              ownerId: extractedOwnerId,
              ownerName: extractedOwnerName,
              worklogTypeMap: {} 
            };
            
            let match = window.location.href.match(/\/requests\/(\d+)\//);
            let ticketId = match ? match[1] : null;
            let isChange = false;
            if (!ticketId) {
              match = window.location.href.match(/CHANGEID=(\d+)/);
              if (match) { ticketId = match[1]; isChange = true; }
            }
          
            if (ticketId) {
              try {
                const csrfCookie = document.cookie.match(/sdpcscook=([^;]+)/);
                const csrf = csrfCookie ? csrfCookie[1] : '';
                const endpoint = `/api/v3/${isChange ? 'changes' : 'requests'}/${ticketId}/worklogs/worklog_type?input_data=%7B%22list_info%22%3A%7B%22start_index%22%3A1%2C%22row_count%22%3A50%2C%22search_criteria%22%3A%7B%22field%22%3A%22name%22%2C%22condition%22%3A%22like%22%2C%22values%22%3A%5B%22%22%5D%7D%7D%7D`;
                const res = await fetch(endpoint, {
                  headers: { 'Accept': 'application/vnd.manageengine.v3+json', 'X-ZCSRF-TOKEN': csrf ? 'sdpcsparam=' + csrf : '' }
                });
                if (res.ok) {
                  const json = await res.json();
                  if (json.worklog_type) {
                    json.worklog_type.forEach(wt => { data.worklogTypeMap[wt.name] = wt.id; });
                  }
                }
              } catch(e) { console.warn('Could not auto-fetch worklog types:', e); }
            }
            
            return data;
          }
        });
        if (results && results[0] && results[0].result) {
          extractedData = results[0].result;
          if (!extractedData.ownerName) extractedData.ownerName = "Authenticated User";
        }
      }
    } catch (e) {
      console.log("Could not extract data from page:", e);
    }

    // 1. Get all cookies for Manage Engine domain
    const cookies = await chrome.cookies.getAll({ domain: "servicedeskplus.smretailinc.com" });
    
    if (cookies.length === 0) {
      throw new Error("No cookies found. Are you logged in to Manage Engine?");
    }

    // 2. Format cookie string and find CSRF token
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const csrfCookie = cookies.find(c => c.name === 'sdpcscook' || c.name === 'sdpcsparam');
    const csrfToken = csrfCookie ? csrfCookie.value : '';

    if (!csrfToken) {
      // Some Manage Engine versions don't use sdpcsparam, so we just silently proceed.
    }

    statusEl.textContent = "Syncing to Worklogger CLI...";

    // 3. Dynamically discover which port the CLI is running on
    const CANDIDATE_PORTS = [8080, 8081, 8082, 5173, 5174];
    let currentConfig = {};
    let targetPort = null;
    let cliApiUrl = '';

    for (const port of CANDIDATE_PORTS) {
      try {
        const res = await fetch(`http://localhost:${port}/api/data`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          currentConfig = await res.json();
          targetPort = port;
          cliApiUrl = `http://localhost:${port}/api/data`;
          break;
        }
      } catch (_) {
        // Port not responding, try next
      }
    }

    if (!targetPort) {
      throw new Error("Ensure Worklogger CLI is running (type 'worklogger' in terminal).");
    }

    // 4. Merge new tokens and extracted data with existing config.sdpConfig
    // Support both old direct config format and new FullDataPayload format
    const isFullPayload = currentConfig && (currentConfig.worklogs || currentConfig.config);
    const existingSdpConfig = isFullPayload 
      ? (currentConfig.config?.sdpConfig || {}) 
      : (currentConfig.sdpConfig || currentConfig || {});

    const updatedSdpConfig = {
      ...existingSdpConfig,
      cookieString: cookieString,
      csrfToken: csrfToken,
      appId: extractedData.appId || existingSdpConfig.appId || "696655712",
      ownerId: extractedData.ownerId || existingSdpConfig.ownerId || "",
      ownerName: extractedData.ownerName && extractedData.ownerName !== "Authenticated User" ? extractedData.ownerName : (existingSdpConfig.ownerName || ""),
      worklogTypeMap: Object.keys(extractedData.worklogTypeMap).length > 0 ? extractedData.worklogTypeMap : (existingSdpConfig.worklogTypeMap || {}),
      cookieUpdatedAt: Date.now()
    };

    let updatedConfig;
    if (isFullPayload) {
      updatedConfig = {
        ...currentConfig,
        config: {
          ...(currentConfig.config || {}),
          sdpConfig: updatedSdpConfig
        }
      };
    } else {
      updatedConfig = {
        ...currentConfig,
        sdpConfig: updatedSdpConfig
      };
    }

    // 5. Save back to CLI
    const saveRes = await fetch(cliApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedConfig)
    });

    if (!saveRes.ok) {
      throw new Error("Failed to save configuration to Worklogger.");
    }
    
    let successMsg = `Successfully synced!<br><span style="color: #60a5fa; font-weight: normal; font-size: 11px;">Welcome, ${updatedSdpConfig.ownerName || 'Authenticated User'}!</span>`;
    if (Object.keys(extractedData.worklogTypeMap).length > 0) {
       successMsg += `<br><span style="color: #a3e635; font-size: 10px;">Extracted ${Object.keys(extractedData.worklogTypeMap).length} Worklog Types.</span>`;
    }

    statusEl.innerHTML = successMsg;
    statusEl.className = "success";
    btn.textContent = "Done";

  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = "error";
    btn.disabled = false;
  }
});
