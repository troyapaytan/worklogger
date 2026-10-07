# Worklogger

Worklogger is a standalone application designed to be installed globally on your machine, allowing you to launch it from any terminal window simply by typing `worklogger`—just like Jupyter Notebook. It helps you manage your worklogs and sync them to ServiceDesk Plus (SDP).

## Prerequisites

Before installing Worklogger, ensure your system meets the following requirements:

- **Operating System**:
  - **Windows 10 / 11** (required for automated installation via `install.ps1`).
  - *Mac / Linux*: Supported via the manual installation steps.
- **Node.js & npm**:
  - **Node.js (v18 or higher)** and **npm** are required.
  - *Automated Setup*: On Windows, `install.ps1` will automatically check for Node.js and install it for you via `winget` if it is missing.
  - *Manual Setup*: Download and install directly from [nodejs.org](https://nodejs.org/).
- **Windows Package Manager (`winget`)** *(optional)*:
  - Used by `install.ps1` to automatically install Node.js if it is not already installed on your machine.
- **Source Archive (`WORKLOGGER.zip`)** *(if installing from a zip package)*:
  - Place `WORKLOGGER.zip` in the same directory as `install.ps1` (or provide a download URL when prompted).
- **ServiceDesk Plus (SDP) Access**:
  - Network connectivity to `https://servicedeskplus.smretailinc.com/` for fetching tickets and logging work.

---

## PowerShell Execution Policy Requirements (Windows)

Windows PowerShell enforces execution policies by default (such as `Restricted` or `RemoteSigned`), which may block running downloaded `.ps1` scripts with an error like:
> *File install.ps1 cannot be loaded because running scripts is disabled on this system.*

You can run the installer using any of the following methods:

### Option A: One-Time Bypass (Recommended — No Permanent Changes)
Run PowerShell and launch the script with a temporary execution policy bypass:
```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```
Or within an already open PowerShell session:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\install.ps1
```

### Option B: Enable Scripts for Current User
Allow script execution permanently for your user account:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
.\install.ps1
```

### Option C: Unblock Downloaded Script
If you downloaded the file from a browser or network share, Windows may mark it as blocked. Unblock it by running:
```powershell
Unblock-File .\install.ps1
.\install.ps1
```
*(Alternatively: Right-click `install.ps1` → **Properties** → check **Unblock** → **Apply**).*

---

## Installation Instructions

### Option 1: Standalone Single Installer (Recommended for Windows)

The easiest way to install Worklogger is using the pre-packaged, self-contained Windows installer:

1. Download or locate `Worklogger-Setup.exe` from `dist-installer/`.
2. Double-click `Worklogger-Setup.exe` to run the setup wizard.
   - **No Node.js / npm required**: Includes bundled Node runtime and pre-compiled assets.
   - **No Admin rights needed**: Installs cleanly to `%LOCALAPPDATA%\Programs\Worklogger`.
   - **Desktop & Start Menu shortcuts**: Automatically creates launcher shortcuts and adds `worklogger` to your user `PATH`.
3. (Optional for internal machines) Run `Trust-Certificate.ps1` to trust the SMRI RPA-AI certificate and eliminate publisher warnings.

To build the installer yourself:
```bash
npm run package:installer
```
*(or run `powershell -ExecutionPolicy Bypass -File .\build-installer.ps1`)*

### Option 2: Automated Script Installation (Windows via PowerShell)

1. Open PowerShell and navigate to the project directory.
2. Run the installer script with bypass:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install.ps1
   ```
3. Follow the on-screen prompts. The installer will:
   - Check and install Node.js if missing.
   - Extract files to `%LOCALAPPDATA%\Programs\Worklogger`.
   - Build the frontend and setup the data directory at `Documents\Worklogger\worklogger_data.json`.
   - Install the global `worklogger` CLI command.
4. Once completed, restart your terminal.

### Option 2: Manual Installation (All Platforms)

1. Ensure you have **Node.js** installed by running:
   ```bash
   node -v
   ```
2. Navigate to this project folder in your terminal.
3. Build the frontend application:
   ```bash
   npm install
   npm run build
   ```
4. Install the package globally:
   ```bash
   npm install -g .
   ```

## Running Worklogger

Once installed successfully, you can launch the application from anywhere by opening a terminal and typing:

```bash
worklogger
```

This will automatically start a local API server in the background and open the Worklogger UI in your default web browser!

## Syncing SDP Session (Browser Extension)

To fetch tickets and post worklogs securely, Worklogger requires active session cookies from ServiceDesk Plus. Because of security restrictions (`HttpOnly`), you cannot manually copy these cookies using standard console scripts.

To make this seamless, this project includes a **Worklogger Sync Extension**.

### Installing the Extension
1. Open your browser and navigate to the Extensions page:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
2. Turn on **"Developer mode"** (usually a toggle in the top-right or bottom-left corner).
3. Click the **"Load unpacked"** button.
4. Select the `extension` folder located inside this project directory.
5. The extension will now appear in your toolbar.

### Using the Extension
1. Ensure your **Worklogger CLI** is running (type `worklogger` in your terminal).
2. Log into your **ServiceDesk Plus** account in your browser (`https://servicedeskplus.smretailinc.com/`).
3. Click the Worklogger Sync extension icon in your toolbar.
4. Click **"Sync Session"**.
5. Your local Worklogger application is now authenticated and ready to use!

## Troubleshooting

- **Port in Use**: If you see an `EADDRINUSE` error or multiple servers spinning up, it means port 5173 is busy. The CLI will automatically try to find the next open port (e.g., 5174).
- **Command Not Found**: Ensure that your npm global `bin` folder is in your system's PATH. On Windows, this is usually `C:\Users\<YourUsername>\AppData\Roaming\npm`.
