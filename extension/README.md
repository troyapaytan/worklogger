# Worklogger Sync Extension

This lightweight Chrome/Edge browser extension automatically extracts the required secure session cookies from your Manage Engine session (including `HttpOnly` cookies like `_iamadt`) and syncs them directly to your locally running Worklogger application.

## Installation Instructions

1. Open your browser and navigate to the Extensions page:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
2. Enable **"Developer mode"** (usually a toggle in the top-right or bottom-left corner).
3. Click the **"Load unpacked"** button.
4. Select this `extension` folder from your file system.
5. The "Worklogger Manage Engine Cookie Sync" extension will now appear in your toolbar. (You may want to pin it for easy access).

## Usage

1. Ensure your **Worklogger CLI** is running (open a terminal and type `worklogger`).
2. Log into your **Manage Engine** account in your browser (`https://servicedeskplus.smretailinc.com/`).
3. Click the Worklogger Sync extension icon in your toolbar.
4. Click **"Sync Session"**.
5. That's it! Your Worklogger app now has the necessary cookies to fetch tickets securely.
