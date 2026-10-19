# Implementation Plan: Worklogger, Non-ManageEngine Logging (Brownfield v2.1)

## 1. Goal

Introduce a dedicated **Non-ManageEngine (Non-ME) logging workspace** to Worklogger that syncs time entries into a designated **SharePoint Excel workbook**, operating alongside the existing ManageEngine (SDP) workflow.

- **ManageEngine (Default)**: Existing workflow remains 100% intact, posting worklogs to ServiceDesk Plus.
- **Non-ManageEngine**: A separate workspace with its own dedicated Gantt timeline, customized entry form matching the Worklogger aesthetic, profile/list management, and single/batch posting to a 5-day work week SharePoint Excel table.
- **Strict Timeline Separation**: ManageEngine and Non-ManageEngine worklogs **do not share the same Gantt chart**. Switching between workspaces filters the timeline, targets, and active modal accordingly.

---

## 2. Architectural Rules (Preserving Current ME System)

1. **Zero Impact on Existing ME Code**: No edits to existing ManageEngine endpoints, SDP proxy logic, SDP formatting, or ManageEngine worklog data structures.
2. **Shared UI & Design System**: The Non-ME form and views reuse existing Worklogger primitives (`AppleSegmentedControl`, modal styles, time steppers, toast notifications, color pickers, and Gantt math utilities).
3. **ManageEngine Default**: On app startup, the workspace defaults to ManageEngine.
4. **Local Persistence First**: Non-ME worklogs are saved locally in `worklogger_data.json` (tagged with `logSource: 'non-me'`) so users retain full offline Gantt scheduling, conflict detection, and weekly target calculation.
5. **No Auto-Sync (Manual/Batch Posting Only)**: Like ManageEngine, saving a worklog does not immediately write to SharePoint. The user triggers posting via a **"Post to Excel"** button in the modal or **"Batch Post to Excel"** on the Gantt chart.
6. **Isolated New Files**: All Non-ME specific business logic, Graph clients, mock providers, and standalone components reside in dedicated files under `src/nonme/` and `src/components/`.

---

## 3. Detailed Feature Specifications

### 3.1 Workspace Mode Switcher (Header)

- **Control**: An `AppleSegmentedControl` placed in the main app header: `ManageEngine | Non-ManageEngine`.
- **Behavior**:
  - Toggles the active workspace timeline.
  - When in **ManageEngine**: The Gantt chart renders only ManageEngine logs (`logSource !== 'non-me'`), showing SDP post statuses and ticket links.
  - When in **Non-ManageEngine**: The Gantt chart renders only Non-ME logs (`logSource === 'non-me'`), showing Excel post statuses and Task Type color coding.
  - Clicking on the Gantt canvas to create a worklog automatically opens the form corresponding to the active workspace.
  - The modal itself also includes an `AppleSegmentedControl` header toggle, allowing switching mode per entry if opened accidentally.

### 3.2 Dedicated Non-ManageEngine Gantt Timeline

- **Separate View**: ManageEngine and Non-ME worklogs do not appear together on the same canvas.
- **Color Coding**: Worklog blocks on the Non-ME timeline are color-coded by **Task Type** (customizable in Non-ME Settings).
- **Block Appearance**:
  - Title: Selected **Task Type**.
  - Subtitle / Preview: **Remarks** text.
  - Status Badge: Displays **"Posted to Excel"** (emerald) when `excelPosted === true`, or **"Pending"** when unposted.
- **Weekly Target Integration**: Non-ME hours count toward the user's standard daily (8h) and weekly (40h) work targets for that workspace.
- **Batch Posting**: A **"Batch Post to Excel"** button on the Weekly Gantt view iterates through unposted logs for the selected week and executes upsert logic in SharePoint Excel.

---

### 3.3 Worklog Form & Field Mapping (`NonMeWorklogModal`)

The Non-ME modal adopts the squircle card design, header accent bar, and fluid spring animations of the ManageEngine modal, but maps its fields to the 10-column SharePoint Excel schema:

| Excel Column | UI Field Control | Mapping & Behavior |
|---|---|---|
| **Task Type \*** | Dropdown | Configurable list (defaults: Development, Support, Analysis, Bug Fixing, Documentation, Meeting, Admin). |
| **Service Line Group \*** | Dropdown | Configurable list (defaults: Retail Applications, Infrastructure, Data & Analytics, QA, Security). |
| **Employee Name \*** | Read-only input / Profile badge | Auto-populated from profile settings (simulated M365 sign-in). |
| **Employee No. \*** | Read-only input / Profile badge | Auto-populated from profile settings. |
| **Role \*** | Auto-filled + Dropdown override | Default set in profile settings; selectable from predefined Role list. |
| **Reviewed By** | *None (Hidden)* | Written as empty string `""` to Excel. |
| **Start Date \*** | Auto-calculated (5-day work week) | Displays the **Monday** date (`YYYY-MM-DD`) of the selected worklog's week. |
| **End Date \*** | Auto-calculated (5-day work week) | Displays the **Friday** date (`YYYY-MM-DD`) of the selected worklog's week. |
| **Actual Hours \*** | Gantt time steppers & Duration badge | Start/End time steppers (+/- 15 mins) matching ME. `Actual Hours = (endTime - startTime) / 60`. In Excel, accumulated for the work week. |
| **Remarks \*** | Textarea + Autocomplete Dropdown | Freeform notes ("What did you work on?"). Features **autocomplete suggestions** from previous entries. Deduplicated to prevent variations. |

#### Autocomplete Suggestions for Remarks
- While typing in the Remarks field, a dropdown displays previously entered remarks matching the input.
- Selecting an existing remark guarantees consistency across the 5-day week, enabling proper hour aggregation in Excel.

---

### 3.4 SharePoint Excel Synchronization (5-Day Week Upsert)

#### Excel Table Schema (10 Columns)
`Task Type` | `Service Line Group` | `Employee Name` | `Employee No.` | `Role` | `Reviewed By` | `Start Date` | `End Date` | `Actual Hours` | `Remarks`

#### Posting & Deduplication Logic (Option 2 Upsert)
1. When posting (single log via modal or batch via Gantt):
2. Calculate the 5-day work week range:
   - `Start Date`: Monday of that week.
   - `End Date`: Friday of that week.
3. Fetch existing rows from the configured SharePoint Excel table (`tblWorklogs`) via Microsoft Graph:
   `GET /sites/{site-id}/drive/items/{item-id}/workbook/tables/{table-name}/rows`
4. Search for an existing row matching:
   `Employee No.` **AND** `Start Date` (Monday) **AND** `End Date` (Friday) **AND** `Remarks` (case-insensitive trim).
5. **If Matching Row Found**:
   - Re-sum or increment the `Actual Hours` cell for that row.
   - Execute `PATCH /sites/{site-id}/drive/items/{item-id}/workbook/tables/{table-name}/rows/{row-id}` with updated hours.
6. **If No Matching Row Exists**:
   - Append a new row via:
     `POST /sites/{site-id}/drive/items/{item-id}/workbook/tables/{table-name}/rows/add`
   - Set `Reviewed By` to `""`.
7. Update local worklog in `worklogger_data.json`:
   - Set `excelPosted = true` and `excelPostedAt = Date.now()`.
   - Show success toast (`"Worklog successfully posted to Excel"`).

#### Deletion Handling (Hours Subtraction, No Row Deletion)
- **Zero Row Deletions**: Deleting a task in the Gantt chart **will not delete a row in the SharePoint Excel file**.
- **Hours Subtraction**:
  - If a deleted worklog was already posted to Excel (`excelPosted === true`), the system locates the matching row in the SharePoint table for that 5-day week (`Employee No.` + `Start Date`/`End Date` + `Remarks` / `Task Type`).
  - It **subtracts the deleted task's duration from the `Actual Hours` column** via a PATCH update.
  - The row remains preserved in the Excel table (even if `Actual Hours` is reduced to `0`), maintaining audit history and sheet structure.
- Locally, the task is removed from `worklogger_data.json` and immediately removed from the Gantt chart timeline.

---

### 3.5 Authentication & Connectivity (Dual-Mode)

To ensure smooth testing without mandatory tenant admin permissions while fully supporting production:

1. **Real Microsoft Graph API**:
   - Backend proxy routes (`/api/non-me/*`) handle token acquisition and Graph requests:
     - Client Credentials flow (Tenant ID, Client ID, Client Secret) with `Sites.Selected` or `Files.ReadWrite`.
     - Configurable SharePoint Site URL, Workbook Path, and Table Name (`tblWorklogs`).
2. **Simulated / Demo Mode (POC Toggle)**:
   - Configurable toggle in Settings: `"Enable Simulated SharePoint Mode"`.
   - Simulates Microsoft 365 sign-in and user profile fetch (`/me`).
   - In-memory / local storage table mock that mimics Graph table rows, upsert responses, and latency.
   - Allows full offline UAT and demonstration.

---

### 3.6 Non-ME Settings Modal (`NonMeSettingsModal`)

A dedicated modal (accessible from Header / Settings menu) managing:
- **Connection Configuration**:
  - SharePoint Site URL (e.g. `https://<tenant>.sharepoint.com/sites/<site>`).
  - File path in document library (e.g. `/Documents/Worklogs/2026_Worklogs.xlsx`).
  - Excel Table Name (default: `tblWorklogs`).
  - Entra ID Tenant ID, Client ID, and Client Secret.
  - "Test Connection" button.
- **Simulated Mode Toggle**: Quick switch between live Graph API and Mock mode.
- **Employee Profile**:
  - Employee Name, Employee No., and default Role.
  - "Simulate M365 Sign-In" button to auto-fill mock credentials.
- **List & Category Management**:
  - Add / edit / delete items in **Task Types**, **Service Line Groups**, and **Roles**.
  - Color picker per **Task Type** for timeline rendering.

---

## 4. Proposed Code Additions & Structure

| Scope | File Path | Purpose |
|---|---|---|
| **[NEW] Model & Types** | `src/nonme/types.ts` | Types for `NonMeConfig`, `NonMeWorklog`, Excel row payloads, and profile state. |
| **[NEW] Graph Client** | `src/nonme/sharepointClient.ts` | Graph API caller with site/item ID caching and upsert logic. |
| **[NEW] Mock Client** | `src/nonme/mockSharepointClient.ts` | In-memory simulated Excel table provider for demo mode. |
| **[NEW] Service Layer** | `src/nonme/nonMeService.ts` | High-level orchestrator: switches real vs mock, calculates 5-day week, checks deduplication. |
| **[NEW] Backend Proxy** | `src/server/nonMeProxy.ts` & update `bin/cli.js` / `vite.config.ts` | Secure proxy for Graph token exchange and Excel table operations. |
| **[NEW] Non-ME Modal** | `src/components/NonMeWorklogModal.tsx` | Dedicated entry modal with Task Type, Service Line, Remarks autocomplete, and Post button. |
| **[NEW] Settings Modal** | `src/components/NonMeSettingsModal.tsx` | UI for SharePoint config, Graph credentials, simulation toggle, profile, and list editor. |
| **[NEW] Remarks Autocomplete** | `src/components/RemarksAutocomplete.tsx` | Reusable dropdown input suggesting unique previously entered remarks. |
| **[MODIFY: Minimal]** | `src/components/Header.tsx` | Adds the workspace `AppleSegmentedControl` (`ManageEngine | Non-ManageEngine`) and Non-ME settings button. |
| **[MODIFY: Minimal]** | `src/App.tsx` | Manages `activeWorkspace` state (`'me' \| 'non-me'`), filters worklogs by `logSource`, and routes modal triggers. |
| **[MODIFY: Minimal]** | `src/db/index.ts` | Extends `Worklog` with optional `logSource`, `taskType`, `serviceLineGroup`, `role`, `excelPosted`, and adds `nonMeConfig`. |

---

## 5. Summary of Resolved Design Decisions

1. **Workspace Separation**: ManageEngine and Non-ManageEngine have distinct Gantt timelines toggled via the App Header.
2. **Work Week Scoping**: Non-ME Excel rows represent a **5-day work week** (Monday to Friday); `Start Date` and `End Date` represent this window.
3. **Hours Mapping**: Actual Hours are calculated from the worklog time slot and accumulated into the weekly row.
4. **Remarks Autocomplete**: Worklogger's description maps to Excel's Remarks column, equipped with autocomplete suggestions to prevent duplicate variations.
5. **Deduplication Strategy**: Upsert logic searches Excel by `Employee No.` + `5-day Week` + `Remarks`; matching rows have their `Actual Hours` updated rather than inserting duplicate rows.
6. **Posting Flow**: No automatic sync on save; single "Post to Excel" button in modal and "Batch Post to Excel" on the Weekly Gantt view.
7. **Profile Sourcing**: Stored in local settings (`worklogger_data.json`) with simulated M365 / Graph `/me` sign-in UX.
8. **Configurable Lists**: Dropdowns for Task Type, Service Line Group, and Role are populated from configurable defaults with a settings editor.
9. **Dual-Mode Connectivity**: Real Microsoft Graph API plus a full toggleable Simulated/Demo mode.
10. **Gantt Styling**: Non-ME blocks color-coded by Task Type and share the 8h/day (40h/week) target meter.
11. **Task Deletion & Hours Subtraction**: Deleting a task in the Gantt chart **never deletes a row in Excel**. If already posted, it locates the matching row for that 5-day week and subtracts the task duration from the `Actual Hours` column, leaving the row intact even at 0 hours.

---

## 6. Implementation Phases

| Phase | Description | Deliverable / Verification |
|---|---|---|
| **0** | Define DB schema extensions (`logSource`, `nonMeConfig`) in `src/nonme/types.ts` & `src/db/index.ts`. | Types compile, existing DB functions unaffected. |
| **1** | Build `NonMeSettingsModal` (Profile, SharePoint config, Lists editor, Simulation toggle). | User can configure profile, lists, and toggles in settings. |
| **2** | Implement `sharepointClient.ts`, `mockSharepointClient.ts`, and backend proxy in `vite.config.ts` & `bin/cli.js`. | Integration test verifying 5-day week upsert row addition and update. |
| **3** | Create `NonMeWorklogModal` with time steppers, Task Type/Service Line dropdowns, and `RemarksAutocomplete`. | Modal creates and edits Non-ME logs locally. |
| **4** | Integrate Header mode switcher and Gantt filtering in `App.tsx`. | Seamless switching between ME and Non-ME timelines without state pollution. |
| **5** | Implement single "Post to Excel" and Weekly "Batch Post to Excel". | Unposted logs successfully upsert to Excel (or mock) and show green badge. |
| **6** | Run full test suite & regression checks on ManageEngine. | All existing Vitest suites pass; ManageEngine flow 100% intact. |
