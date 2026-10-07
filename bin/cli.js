#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import open from 'open';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
let currentDir = process.cwd();
try {
  if (typeof __dirname !== 'undefined') {
    currentDir = __dirname;
  } else if (typeof import.meta !== 'undefined' && import.meta.url) {
    currentDir = path.dirname(fileURLToPath(import.meta.url));
  }
} catch {
  currentDir = process.cwd();
}

const app = express();
app.use(cors());
app.use(express.json());

const dataDir = path.join(os.homedir(), 'Documents', 'Worklogger');
const filePath = path.join(dataDir, 'worklogger_data.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Data Endpoints
app.get('/api/data', (req, res) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return res.status(200).json(JSON.parse(data));
    }
  } catch (e) {
    console.error('Error reading worklogger_data.json:', e);
  }
  return res.status(404).json({ error: 'File not found' });
});

app.post('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
    return res.status(200).json({ success: true, path: filePath });
  } catch (e) {
    console.error('Error writing worklogger_data.json:', e);
    return res.status(400).json({ error: 'Invalid JSON' });
  }
});

app.put('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
    return res.status(200).json({ success: true, path: filePath });
  } catch (e) {
    console.error('Error writing worklogger_data.json:', e);
    return res.status(400).json({ error: 'Invalid JSON' });
  }
});

// SDP Proxy Endpoints
app.post('/api/sdp/post-worklog', async (req, res) => {
  try {
    const { url, payload, cookies, csrfToken, appId, nonce } = req.body;
    const searchParams = new URLSearchParams();
    searchParams.append('input_data', JSON.stringify(payload));

    const headers = {
      'accept': 'application/vnd.manageengine.v3+json',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'cookie': cookies,
      'x-sdpod-appid': appId || '696655712',
      'x-requested-with': 'XMLHttpRequest',
      'origin': 'https://servicedeskplus.smretailinc.com',
      'referer': 'https://servicedeskplus.smretailinc.com/app/itdesk/',
      'nonce': nonce || '',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'priority': 'u=1, i'
    };
    
    if (csrfToken) {
      headers['x-zcsrf-token'] = csrfToken.startsWith('sdpcsparam=') ? csrfToken : `sdpcsparam=${csrfToken}`;
    }

    const sdpRes = await fetch(url, {
      method: 'POST',
      headers,
      body: searchParams.toString()
    });

    const text = await sdpRes.text();
    res.status(sdpRes.status).send(text);
  } catch (e) {
    console.error('SDP Proxy Error:', e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
});

app.post('/api/sdp/fetch-ticket', async (req, res) => {
  try {
    const { url, cookies, csrfToken, appId, nonce } = req.body;

    const headers = {
      'accept': 'application/vnd.manageengine.v3+json',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      'cookie': cookies,
      'x-sdpod-appid': appId || '696655712',
      'x-requested-with': 'XMLHttpRequest',
      'origin': 'https://servicedeskplus.smretailinc.com',
      'referer': 'https://servicedeskplus.smretailinc.com/app/itdesk/',
      'nonce': nonce || '',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'priority': 'u=1, i'
    };
    
    if (csrfToken) {
      headers['x-zcsrf-token'] = csrfToken.startsWith('sdpcsparam=') ? csrfToken : `sdpcsparam=${csrfToken}`;
    }

    const sdpRes = await fetch(url, {
      method: 'GET',
      headers
    });

    const text = await sdpRes.text();
    console.log(`[SDP Proxy] fetch-ticket URL: ${url.substring(0, 200)}...`);
    console.log(`[SDP Proxy] fetch-ticket Response Status: ${sdpRes.status}`);
    res.status(sdpRes.status).send(text);
  } catch (e) {
    console.error('SDP Proxy Fetch Error:', e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
});

// OTA Update Endpoint
app.post('/api/apply-update', (req, res) => {
  try {
    const { hostUrl } = req.body;
    const updateHost = hostUrl || 'http://LT-9472:8081';
    
    const psScript = `
$ErrorActionPreference = "Stop"
Start-Transcript -Path "$env:TEMP\\worklogger_update.log" -Force

try {
    $hostUrl = "${updateHost}"
    $tempZip = Join-Path $env:TEMP "WORKLOGGER_UPDATE.zip"
    $tempExtract = Join-Path $env:TEMP "WORKLOGGER_UPDATE_EXTRACT"

    Write-Host "Downloading update from $hostUrl/WORKLOGGER.zip..."
    Invoke-WebRequest -Uri "$hostUrl/WORKLOGGER.zip" -OutFile $tempZip -UseBasicParsing

    if (Test-Path $tempExtract) { Remove-Item -Path $tempExtract -Recurse -Force }
    New-Item -ItemType Directory -Path $tempExtract -Force | Out-Null

    Write-Host "Extracting update..."
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($tempZip, $tempExtract)

    $installDir = Join-Path $env:LOCALAPPDATA "Programs\\Worklogger"

    Write-Host "Stopping existing Worklogger processes..."
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3

    Write-Host "Applying update..."
    Copy-Item -Path "$tempExtract\\*" -Destination $installDir -Recurse -Force

    Write-Host "Restarting Worklogger..."
    Start-Process -FilePath "$installDir\\worklogger.cmd"
} catch {
    Write-Error $_
}

Stop-Transcript
`;
    
    const scriptPath = path.join(os.tmpdir(), 'apply-update.ps1');
    fs.writeFileSync(scriptPath, psScript, 'utf8');
    
    // Spawn detached PowerShell script to apply update
    const child = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    
    res.json({ success: true, message: 'Update started. The application will now restart.' });
    
    // Exit current process so files can be overwritten
    setTimeout(() => {
      process.exit(0);
    }, 1000);
    
  } catch (e) {
    console.error('Update Error:', e);
    res.status(500).json({ error: e.message || 'Failed to start update process' });
  }
});

// Serve frontend build files
const distCandidates = [
  process.env.WORKLOGGER_DIST_PATH,
  path.join(currentDir, '..', 'dist'),
  path.join(currentDir, 'dist'),
  path.join(process.cwd(), 'dist')
].filter(Boolean);

const distPath = distCandidates.find((dir) => fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))) || path.join(currentDir, '..', 'dist');
app.use(express.static(distPath));

// Fallback for React Router (if using browser routing)
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Server
let PORT = parseInt(process.env.PORT || '8080', 10);

function startServer(port) {
  const server = app.listen(port, async () => {
    console.log(`[Worklogger] Server started on http://localhost:${port}`);
    console.log(`[Worklogger] Launching browser...`);
    
    try {
      await open(`http://localhost:${port}`);
    } catch (err) {
      console.error('[Worklogger] Failed to launch browser. Please open the URL manually.');
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[Worklogger] Port ${port} is already in use. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
}

startServer(PORT);
