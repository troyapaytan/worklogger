/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import os from 'os'

function localJsonStoragePlugin(): Plugin {
  return {
    name: 'local-json-storage',
    configureServer(server) {
      const dataDir = path.join(os.homedir(), 'Documents', 'Worklogger');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const filePath = path.join(dataDir, 'worklogger_data.json');

      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/data' && req.method === 'GET') {
          try {
            if (fs.existsSync(filePath)) {
              const data = fs.readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(data);
              return;
            }
          } catch (e) {
            console.error('Error reading worklogger_data.json:', e);
          }
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'File not found' }));
          return;
        }

        if (req.url === '/api/data' && (req.method === 'POST' || req.method === 'PUT')) {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
              }
              fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, path: filePath }));
            } catch (e) {
              console.error('Error writing worklogger_data.json:', e);
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }

        if (req.url === '/api/sdp/post-worklog' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { url, payload, cookies, csrfToken, appId, nonce } = JSON.parse(body);
              const searchParams = new URLSearchParams();
              searchParams.append('input_data', JSON.stringify(payload));

              const sdpRes = await fetch(url, {
                method: 'POST',
                headers: {
                  'accept': 'application/vnd.manageengine.v3+json',
                  'accept-language': 'en-US,en;q=0.9',
                  'cache-control': 'no-cache',
                  'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                  'cookie': cookies,
                  'x-zcsrf-token': csrfToken.startsWith('sdpcsparam=') ? csrfToken : `sdpcsparam=${csrfToken}`,
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
                },
                body: searchParams.toString()
              });

              const text = await sdpRes.text();
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = sdpRes.status;
              res.end(text);
            } catch (e: any) {
              console.error('SDP Proxy Error:', e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message || 'Internal Server Error' }));
            }
          });
          return;
        }

        if (req.url === '/api/sdp/fetch-ticket' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { url, cookies, csrfToken, appId, nonce } = JSON.parse(body);

              const sdpRes = await fetch(url, {
                method: 'GET',
                headers: {
                  'accept': 'application/vnd.manageengine.v3+json',
                  'accept-language': 'en-US,en;q=0.9',
                  'cache-control': 'no-cache',
                  'cookie': cookies,
                  'x-zcsrf-token': csrfToken.startsWith('sdpcsparam=') ? csrfToken : `sdpcsparam=${csrfToken}`,
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
                }
              });

              const text = await sdpRes.text();
              console.log(`[SDP Proxy] fetch-ticket URL: ${url.substring(0, 200)}...`);
              console.log(`[SDP Proxy] fetch-ticket Response Status: ${sdpRes.status}`);
              console.log(`[SDP Proxy] fetch-ticket Response Body: ${text.substring(0, 500)}`);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = sdpRes.status;
              res.end(text);
            } catch (e: any) {
              console.error('SDP Proxy Fetch Error:', e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message || 'Internal Server Error' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    watch: {
      ignored: ['**/worklogger_data.json', '**/*.json'],
    },
  },
  plugins: [react(), tailwindcss(), localJsonStoragePlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
