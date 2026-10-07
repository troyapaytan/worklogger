import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const PORT = 8081;

// Paths
const currentDir = process.cwd();
const packageJsonPath = path.join(currentDir, 'package.json');
const zipPath = path.join(currentDir, 'dist-installer', 'WORKLOGGER.zip');

if (!fs.existsSync(packageJsonPath)) {
  console.error("Error: package.json not found. Run this script from the WORKLOGGER root directory.");
  process.exit(1);
}

if (!fs.existsSync(zipPath)) {
  console.error("Error: dist-installer/WORKLOGGER.zip not found. Please build the installer first.");
  process.exit(1);
}

// Read version
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = pkg.version;

// Create hosting directory
const hostDir = path.join(currentDir, 'ota-host');
if (!fs.existsSync(hostDir)) {
  fs.mkdirSync(hostDir, { recursive: true });
}

// Copy the latest zip
const hostedZipPath = path.join(hostDir, 'WORKLOGGER.zip');
fs.copyFileSync(zipPath, hostedZipPath);

// Write version.json
const versionInfo = {
  version: version,
  releaseDate: new Date().toISOString()
};
fs.writeFileSync(path.join(hostDir, 'version.json'), JSON.stringify(versionInfo, null, 2));

console.log(`[OTA Host] Prepared version ${version} for deployment.`);

// Start Server
const app = express();
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.ip} - ${req.method} ${req.url}`);
  next();
});

// Serve static files from ota-host
app.use(express.static(hostDir));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[OTA Host] Update server running on http://0.0.0.0:${PORT}`);
  console.log(`[OTA Host] Clients will fetch http://<YOUR_IP_OR_HOSTNAME>:${PORT}/version.json to check for updates.`);
  console.log(`[OTA Host] Press Ctrl+C to stop the server when you are done deploying.`);
});
