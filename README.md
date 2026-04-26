# AirGuard Pro

> Smart air quality monitoring & ventilation control system for ESP32-based mechatronics projects.
> A production-ready React frontend designed to integrate with a real backend running on an Ubuntu server.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement & Goals](#2-problem-statement--goals)
3. [Feature Summary](#3-feature-summary)
4. [Pages — Detailed Responsibilities](#4-pages--detailed-responsibilities)
5. [Role-Based Access Matrix](#5-role-based-access-matrix)
6. [Authentication Flow](#6-authentication-flow)
7. [Dashboard Behavior](#7-dashboard-behavior)
8. [Data Logs Behavior](#8-data-logs-behavior)
9. [Control Behavior](#9-control-behavior)
10. [System Design Behavior](#10-system-design-behavior)
11. [Settings Behavior](#11-settings-behavior)
12. [User Management Behavior](#12-user-management-behavior)
13. [Alerts vs Audit Logs](#13-alerts-vs-audit-logs)
14. [Data Lifecycle](#14-data-lifecycle)
15. [State Management](#15-state-management)
16. [Service / API Layer](#16-service--api-layer)
17. [API Contract](#17-api-contract)
18. [ESP32 Integration](#18-esp32-integration)
19. [Project Structure](#19-project-structure)
20. [Important Components](#20-important-components)
21. [Tech Stack](#21-tech-stack)
22. [Configuration System](#22-configuration-system)
23. [Current Limitations](#23-current-limitations)
24. [Production / Backend Readiness](#24-production--backend-readiness)
25. [Deployment Plan (Ubuntu Server)](#25-deployment-plan-ubuntu-server)
26. [Future Improvements Roadmap](#26-future-improvements-roadmap)

---

## 1. Project Overview

**AirGuard Pro** is a full-featured frontend for an indoor air-quality and ventilation control system built around an **ESP32 microcontroller** with an **MH-Z19B CO₂ sensor**, an exhaust fan, and a motorized damper. The frontend behaves like an industrial IoT management console: live monitoring, control, configuration, role-based access, audit logging, and a dedicated documentation page that mirrors the embedded firmware logic.

The system targets a hybrid demo + production model:
- **Demo / academic context** — Seeded historical data + simulated polling so the UI is always meaningful.
- **Production** — Designed to switch over to a real backend (Node.js/Express) and live ESP32 devices without touching the UI.

## 2. Problem Statement & Goals

Indoor CO₂ buildup degrades cognitive performance and air quality. A simple closed-loop ventilation system can mitigate this, but operators need:

- Real-time visibility into indoor vs outdoor CO₂.
- A **safe override** capability (manual fan / damper control).
- Threshold tuning that takes effect immediately and is reflected in the documented logic.
- Strict access control so only authorized people can change settings or send commands.
- A complete activity trail for security review.

**Project goals:**
1. Provide a production-grade frontend that visualizes ESP32 telemetry.
2. Implement an **IF-ELSE rule-based supervisory control** layer that selects a discrete ventilation level (0–3) before any actuator action, with hysteresis only as a transition-stabilization helper.
3. Deliver role-based UI with admin / operator / user separation.
4. Add a secure authentication layer with admin 2FA.
5. Keep all design choices documented in-app on the System Design page.

## 3. Feature Summary

- 🔐 **Authentication** — username/password + admin 2FA, brute-force lockout, inactivity auto-logout, session persistence
- 👥 **User management** — admin CRUD, role assignment, account enable/disable, 2FA toggle, password reset
- 📊 **Dashboard** — live sensor cards, CO₂ trend chart, system status, runtime snapshot, system alerts, ready-state indicator
- 🎛️ **Control console** — AUTO/MANUAL mode, manual fan + damper control, supervisory **decision-boundary editor** (safe / moderate / high / Δ-min / stabilization band), command history, restore defaults
- 📝 **Data logs** — seeded history + filters (status / mode / time range / search), pagination, expanded columns
- 📐 **System design** — supervisory control flow, IF-ELSE rule base (Levels 0–3), live decision boundaries, current evaluation snapshot, data-flow panel
- 📋 **Audit log** — admin-only activity trail (auth, control, settings, user mgmt) with filters and CSV export
- ⚙️ **Settings** — sectioned configuration: device / connectivity / security / notifications / system behavior, with save & reset
- 🔄 **Hybrid data** — seeded simulation that pauses after N cycles into a "ready state" awaiting real data
- 🌐 **API-ready service layer** — strict validation, retries, timeouts, fallbacks; ready to point at a real backend
- 🛡️ **Strict alert vs audit separation** — system-only events on the dashboard alert panel, all user/auth activity in the audit log

## 4. Pages — Detailed Responsibilities

### `/` Login (`LoginPage.tsx`)
- Username + password fields. Loading state on submit. Three failed attempts → 60-second lockout with visible countdown.
- Admin accounts trigger a 2FA challenge with a 6-digit verification field.
- No credentials are exposed in the UI ("Authorized personnel only — contact your administrator for access").

### `/dashboard` Dashboard (`DashboardPage.tsx`)
- All roles. Hero card for indoor CO₂ + secondary cards (outdoor, fan, damper, ventilation, mode).
- **Connection state banner** when device is offline — clearly notes that values shown are the *last known reading*.
- **System ready** banner when seeded simulation has completed (after `MAX_CYCLES`), with a Resume Simulation button.
- Right column: System Status, **Runtime Snapshot** (selected ventilation level, active rule, decision, recommended actuator output, decision boundaries, heartbeat age), System Alerts.

### `/logs` Data Logs (`DataLogsPage.tsx`)
- All roles. Paginated `LogsTable` with search and three filters: time range, CO₂ status, control mode.
- Columns: time, CO₂ in, CO₂ out, fan, damper angle, mode, ventilation, status badge.
- Empty state guides the user when filters return nothing.
- Admin can clear all logs (confirmation dialog).

### `/control` Control (`ControlPage.tsx`)
- Admin / operator only. Active command status panel showing currently confirmed device state.
- **Decision-boundary editor** — `safeThreshold`, `moderateThreshold`, `highThreshold`, `minOutdoorDelta`, and `hysteresis` (stabilization band) with validation rules and a *Restore default boundaries* button. Updates apply live and re-render the System Design page.
- Mode toggle — AUTO vs MANUAL.
- **Manual controls** (when MANUAL) — fan switch, damper slider (0°/45°/90°), Apply with confirm dialog, success/error feedback.
- **Recent Commands panel** — shows the last 6 commands with timestamp, actor, and result badge (`pending` / `success` / `failed`).

### `/design` System Design (`SystemDesignPage.tsx`)
- All roles. Documents:
  - Software flowchart (init → read → validate → process → decide → push → loop)
  - IF-ELSE supervisory rule base (Levels 0–3 + outdoor-not-advantageous override)
  - Live decision boundaries (safe / moderate / high / min outdoor Δ / stabilization band)
  - **Current Evaluation Snapshot** — interprets the latest reading against the active rule and shows the recommended action
  - **Data Flow** — ESP32 → Backend → Dashboard panel

### `/settings` Settings (`SettingsPage.tsx`)
- Admin only. Sectioned configuration:
  - **Device Configuration** — name, location, endpoint URL
  - **Connectivity** — polling interval, request timeout, heartbeat timeout, reconnect interval, retry attempts
  - **Security** — session timeout, max login attempts, enforce admin 2FA
  - **Notifications** — in-app, alert on critical, alert on disconnect
  - **System Behavior** — heartbeat monitoring, auto-recovery
- Validation, save with success state, reset-to-defaults button. Thresholds intentionally moved to Control.

### `/users` User Management (`UsersPage.tsx`)
- Admin only. Create user form, role permissions matrix, full user table with status, 2FA, last-login, created-date columns.
- Per-row actions: toggle 2FA, reset password (inline), enable/disable account, delete (cannot delete or demote yourself).

### `/audit` Audit Log (`AuditLogPage.tsx`)
- Admin only. Full activity trail. Filters by source (`auth` / `user` / `system` / `device`), level (`info` / `warning` / `critical`), and free-text search on message + actor. CSV export.

## 5. Role-Based Access Matrix

| Capability                          | admin | operator | user |
|-------------------------------------|:-----:|:--------:|:----:|
| Dashboard                           | ✅    | ✅       | ✅   |
| Data logs (view)                    | ✅    | ✅       | ✅   |
| System design                       | ✅    | ✅       | ✅   |
| Control panel + threshold editing   | ✅    | ✅       | ❌   |
| Settings                            | ✅    | ❌       | ❌   |
| User management                     | ✅    | ❌       | ❌   |
| Audit log                           | ✅    | ❌       | ❌   |
| Clear data logs                     | ✅    | ❌       | ❌   |
| 2FA at login                        | ✅ (forced) | optional | optional |

Route guards live in `App.tsx` (`<ProtectedRoute roles={...}>`). Sidebar items are filtered by `user.role`. UI controls also disable themselves when a role lacks permission, providing defense in depth.

## 6. Authentication Flow

1. **Login** — `POST /api/auth/login` (`authService.login`). Returns one of:
   - `success` → session created
   - `requires_2fa` → for admins with 2FA enforced; UI shows TOTP form
   - `invalid_credentials` → counted toward lockout
2. **2FA** — `POST /api/auth/2fa/verify` (`authService.verify2FA`). Demo TOTP code `123456` is internal only.
3. **Session persistence** — successful sessions are saved to `localStorage["airguard.session"]` and rehydrated on page load.
4. **Failed-attempt lockout** — after `config.maxLoginAttempts` (default 3), login is locked for `config.loginLockoutDuration` (default 60s). Persisted in localStorage so it survives reloads.
5. **Inactivity logout** — global listeners on `mousemove / keydown / click / scroll / touchstart` reset a `config.sessionInactivityTimeout` timer (default 10 min). On expiry the session is terminated and an audit entry is recorded.
6. **Logout** — manual logout calls `authService.logout()`. Both manual and inactivity logouts emit an audit event.

All auth events (success, failure, 2FA challenge, 2FA failure, inactivity logout, user CRUD) are emitted via `auditBus` and routed exclusively to the Audit Log — they never appear in the dashboard's System Alerts panel.

## 7. Dashboard Behavior

- **Sensor cards** — show the latest validated reading. Indoor CO₂ status (`normal` / `warning` / `critical`) is computed from live thresholds.
- **CO₂ Trend chart** — Recharts line chart of indoor + outdoor over the in-memory history window.
- **System Status** — device online/offline (driven entirely by heartbeat age), last update, signal strength, uptime, firmware version.
- **Runtime Snapshot** — a compact decision-explanation panel. Top row shows raw inputs (indoor, outdoor, Δ with colour-coded gate status). The middle block shows the selected **ventilation level** + **active rule**. Reasoning text and the **mapped actuator output** (Fan + Damper) follow. A footer strip exposes live decision boundaries, min Δ, heartbeat age, and the last reading timestamp.
- **Alerts panel** — only system events: threshold breaches, disconnects, reconnects, faults, ready-state notification. Manually clearable.
- **Offline banner** — surfaces when heartbeat exceeds `config.heartbeatTimeout`, explicitly tells the user that displayed values are the last known reading.
- **Ready-state banner** — after `MAX_CYCLES` polling cycles, the simulation pauses; user can resume for demo purposes.

## 8. Data Logs Behavior

- Initial seed: 50 historical readings via `generateHistoricalReadings`.
- Each appended reading is **deduplicated** by `id` and capped to `config.maxHistorySize` entries.
- Filters: time range (1h / 24h / 7d / all), CO₂ status (normal / warning / critical, derived from current decision boundaries), mode (AUTO / MANUAL), free-text search.
- Pagination at 15 rows per page. Empty-state messaging guides the user.
- Admin clear-all button is destructive and confirmed via dialog.
- Table columns are designed to map 1:1 onto a future CSV/JSON export.

## 9. Control Behavior

- **AUTO** — backend / firmware delegates to the on-device **IF-ELSE supervisory layer**: sensors are evaluated, a ventilation level (0–3) is selected from the rule base, and the chosen level is mapped to actuator targets. Hysteresis only smooths transitions between adjacent levels.
- **MANUAL** — operator overrides take effect on the device after a confirmed `POST /api/devices/:id/control`.
- **Decision-boundary editor** (supervisory IF-ELSE layer). Validation:
  - `safeThreshold` 300–5000 ppm
  - `moderateThreshold` 400–5000 ppm and `> safe`
  - `highThreshold` 500–5000 ppm and `> moderate`
  - `minOutdoorDelta` 0–1000 ppm — minimum (indoor − outdoor) required to authorise ventilation
  - `hysteresis` 0–500 ppm — stabilization band, **not** the primary control method
  - Restore-default button resets to (safe=700, moderate=900, high=1100, Δmin=50, stab=±50).
- **Command lifecycle** — every `sendCommand` is recorded as a `CommandRecord` in `commandHistory` (`pending → success | failed`). UI button shows `Applying…` while in flight. A command lock prevents concurrent submissions.
- **Audit attribution** — every command logs the actor (username) and is visible on the Audit Log page.

### 9.1 Control Methodology — IF-ELSE Supervisory Control

The system is **not** a low-level threshold-to-actuator on/off controller. It is structured as a layered supervisory control architecture, suitable for academic/mechatronics review:

1. **Input layer** — sampled values: `indoorCO2`, `outdoorCO2`, `Δ = indoorCO2 − outdoorCO2`, current `controlMode`.
   - A **positive Δ** means indoor air is worse than outdoor air.
   - `minOutdoorDelta` is the **minimum required outdoor advantage** (in ppm) before ventilation above Level 0 is authorised. If outdoor air is not sufficiently cleaner, opening the damper would be counter-productive — so the supervisor blocks ventilation.

2. **Decision layer (IF-ELSE rule base)** — indoor CO₂ is matched against **non-overlapping intervals** to select a discrete **ventilation level**:

   | Level | Label                  | Indoor interval                                  | Outdoor gate (Δ)         |
   |-------|------------------------|--------------------------------------------------|--------------------------|
   | 0     | Closed / Safe          | `indoor < safeThreshold`                         | —                        |
   | 0\*   | Blocked (override)     | `indoor ≥ safeThreshold`                         | `Δ < minOutdoorDelta`    |
   | 1     | Light Ventilation      | `safeThreshold ≤ indoor < moderateThreshold`     | `Δ ≥ minOutdoorDelta`    |
   | 2     | Medium Ventilation     | `moderateThreshold ≤ indoor < highThreshold`     | `Δ ≥ minOutdoorDelta`    |
   | 3     | Aggressive Ventilation | `indoor ≥ highThreshold`                         | `Δ ≥ minOutdoorDelta`    |

   The intervals are mutually exclusive: every reading matches exactly one level. The override (0\*) only fires when indoor is at or above safe **and** outdoor air offers no advantage.

3. **Output mapping layer** — the chosen level is translated into actuator targets:

   | Level | Damper angle | Fan |
   |-------|--------------|-----|
   | 0     | 0° (closed)  | OFF |
   | 1     | 30°          | OFF |
   | 2     | 60°          | ON  |
   | 3     | 90° (open)   | ON  |

4. **Execution layer** — actuators (relay + servo) drive to the mapped targets. MANUAL mode bypasses the decision layer and applies operator targets directly.
5. **Stabilization** — `hysteresis` is a small ±band used only to smooth transitions between adjacent levels and avoid rapid switching. It is a supporting mechanism, not the primary control method.

#### 9.1.1 Worked example

Boundaries (defaults): `safe=700`, `moderate=900`, `high=1100`, `minOutdoorDelta=50`, `hysteresis=±50`.

- **Reading A** — indoor `950`, outdoor `420` → Δ = `+530`. Indoor sits in `[900, 1100)` → **Level 2 (Medium)**. Δ ≥ 50 ✓ → mapping: **Fan ON, Damper 60°**.
- **Reading B** — indoor `950`, outdoor `920` → Δ = `+30`. Indoor would map to Level 2, but Δ < 50 → override fires → **Level 0\* (Blocked)**: Fan OFF, Damper 0°. Reasoning: opening the damper would not improve indoor quality.
- **Reading C** — indoor `620`, outdoor `400` → Δ = `+220`. Indoor < 700 → **Level 0 (Closed / Safe)** regardless of Δ. No ventilation needed.

## 10. System Design Behavior

The page intentionally mirrors the firmware's control loop so the team and reviewers can compare implementation to documentation:
- **Supervisory Control Flow** — numbered steps from boot to loop, prefaced with the three-stage architecture (Decision → Mapping → Execution).
- **IF-ELSE Rule Base — Supervisory Decision Layer** — Levels 0–3 plus the "outdoor not advantageous" override, written as **non-overlapping intervals** with separate columns for the indoor interval and the Δ gate. The currently active rule is highlighted live, and an inline Δ-explanation block (with a numeric example) is rendered above the rule cards.
- **How the decision is made / Why ventilation may be blocked** — two short reviewer-friendly notes summarise the selection rule and the blocking condition.
- **Decision Boundaries (Live)** — compact 5-cell strip (safe / moderate / high / min Δ / stabilization) re-renders the moment boundaries change on the Control page.
- **Current Evaluation Snapshot** — shows indoor / outdoor / Δ inputs, then the Decision-layer choice (level + active rule) and the Output-mapping result (fan + damper), followed by reasoning. When blocked, an explicit "Δ < minOutdoorDelta" note is shown.
- **Data Flow** — ESP32 → Backend API → Dashboard with endpoint hints.

## 11. Settings Behavior

Sections, all admin-gated:
- **Device** — name, location, endpoint URL.
- **Connectivity** — polling interval (1–300 s), request timeout (1–60 s), heartbeat timeout (5–300 s), reconnect interval (1–60 s), retry attempts (0–10).
- **Security** — session timeout (1–120 min), max login attempts (1–10), enforce-admin-2FA toggle.
- **Notifications** — in-app, alert on critical, alert on disconnect.
- **System Behavior** — heartbeat monitoring, auto-recovery (beta).
- Save validates and persists; Reset reverts to defaults.

The supervisory decision boundaries intentionally live on the **Control** page — never duplicated here.

## 12. User Management Behavior

- Backed by `authService` which keeps an in-memory user list (replaceable with a real `/api/users` endpoint).
- Each user has: id, username, role (`admin` / `operator` / `user`), status (`active` / `disabled`), `twoFactorEnabled`, `lastLogin`, `createdAt`.
- Actions per row: change role, toggle 2FA, reset password (inline), enable/disable, delete.
- Self-protections: cannot delete, demote, or disable the currently signed-in user.
- Permissions matrix is rendered alongside the list as a permanent reference.

## 13. Alerts vs Audit Logs

Two separate streams live in `DeviceContext`:

| Stream      | Sources                          | Examples                                                                 | UI                                  |
|-------------|----------------------------------|--------------------------------------------------------------------------|-------------------------------------|
| `alerts`    | `system`, `device`               | Threshold breach, disconnect, reconnect, ready-state, sensor fault       | Dashboard "System Alerts" panel     |
| `auditLog`  | `auth`, `user`                   | Login success/failure, 2FA, logout, command applied, threshold updated, user created/disabled | `/audit` page (admin only)         |

Routing is enforced by `logEvent()` and the `auditBus` subscriber in `DeviceContext`.

## 14. Data Lifecycle

1. **Boot** — `seededHistory` (50 readings) seeded so the chart and logs are immediately meaningful.
2. **Polling** — `DeviceContext.refresh()` runs every `config.pollingInterval` ms. It calls `api.getLatestReading` + `api.getSystemStatus`, validates them, dedupes by id, appends to history (capped at `config.maxHistorySize`), and updates `lastHeartbeatRef`.
3. **Ready State** — after `MAX_CYCLES` (5) successful cycles, polling pauses and a system-info alert is emitted: "Seeded simulation completed — system ready, awaiting real device data." This avoids flooding the UI with synthetic data while still demonstrating the full pipeline.
4. **Resume** — `resumeSimulation()` clears the flag and restarts polling.
5. **Heartbeat watchdog** — separate 2 s interval compares `lastHeartbeatRef` with `config.heartbeatTimeout`. Transitions emit `online` / `offline` system alerts.

## 15. State Management

Two contexts, both above `BrowserRouter`:

### `AuthContext`
- Holds `user`, `users`, `failedAttempts`, `lockedUntil`.
- Exposes `login`, `verify2FA`, `logout`, `createUser`, `deleteUser`, `updateUserRole`, `setUserStatus`, `setUser2FA`, `resetUserPassword`, `hasRole`.
- Persists session and lockout state via `localStorage` keys `airguard.session`, `airguard.loginAttempts`, `airguard.loginLockedUntil`.
- Emits all auth/admin events via `auditBus`.

### `DeviceContext`
- Holds `latest`, `status`, `history`, `alerts`, `auditLog`, `commandHistory`, `thresholds`, `cycleCount`, `isReadyState`, `heartbeatAge`.
- Exposes `sendCommand`, `clearHistory`, `clearAlerts`, `clearAuditLog`, `refresh`, `updateThresholds`, `resetThresholds`, `resumeSimulation`, `logEvent`, `getEvaluation`.
- Persists thresholds via `localStorage["airguard.thresholds"]`.

### `auditBus`
- Tiny pub/sub used so `AuthContext` (which sits above `DeviceContext`) can publish events that `DeviceContext` consumes into the unified audit log.

## 16. Service / API Layer

- `services/api.ts` — every backend call goes through `fetchWithRetry()` which adds `AbortController` timeouts and linear backoff retries (`config.maxRetries`, `config.retryBaseDelay`). On failure each method **falls back to mock data** so the UI never breaks during local development.
- `services/authService.ts` — public surface (`login`, `verify2FA`, `logout`, user CRUD) maps 1:1 onto the planned backend (`/api/auth/*`, `/api/users/*`). Today it runs in-memory; swapping in HTTP calls is a one-file change.
- `services/validators.ts` — runtime guards for `SensorReading` and `SystemStatus`. Anything malformed never enters state.
- `services/auditBus.ts` — pub/sub bridge between contexts.

## 17. API Contract

### Frontend → Backend

| Method | Path                                          | Purpose                                |
|--------|-----------------------------------------------|----------------------------------------|
| GET    | `/api/devices/:id/readings/latest`            | Latest validated `SensorReading`       |
| GET    | `/api/devices/:id/readings?limit=N`           | Last N readings                        |
| DELETE | `/api/devices/:id/readings`                   | Clear stored history                   |
| GET    | `/api/devices/:id/status`                     | `SystemStatus`                         |
| GET    | `/api/devices/:id/settings`                   | `SystemSettings`                       |
| PUT    | `/api/devices/:id/settings`                   | Update settings                        |
| POST   | `/api/devices/:id/control`                    | Send `ControlCommand`                  |
| POST   | `/api/auth/login`                             | `{ status, user? \| pendingUser?, ... }` |
| POST   | `/api/auth/2fa/verify`                        | TOTP verification                      |
| POST   | `/api/auth/logout`                            | Tear down session                      |

### ESP32 → Backend

| Method | Path                                          | Body                                    |
|--------|-----------------------------------------------|-----------------------------------------|
| POST   | `/api/device/readings`                        | `DeviceReadingPayload` (with `apiKey`)  |
| POST   | `/api/device/heartbeat`                       | `DeviceHeartbeatPayload`                |
| GET    | `/api/device/:id/command`                     | `DeviceCommandResponse` (latest desired state) |

### Payload shapes (see `src/types/sensor.ts`)

```ts
SensorReading      { id, deviceId, indoorCO2, outdoorCO2, fanStatus, damperAngle, ventilationStatus, controlMode, timestamp }
SystemStatus       { deviceOnline, lastHeartbeat, uptime, firmwareVersion, wifiSignal }
ControlCommand     { controlMode, fanStatus, damperAngle }
CommandRecord      { id, timestamp, actor?, command, result, error? }
EvaluationSnapshot { rule, ventilationLevel, ventilationLabel, ruleLabel, decision, recommendation, recommendedDamperAngle, notes }
User               { id, username, role, status?, lastLogin?, twoFactorEnabled?, createdAt? }
```

## 18. ESP32 Integration

Recommended firmware loop:

1. Connect to WiFi → POST `/api/device/heartbeat` (uptime, signal, firmware).
2. Read MH-Z19B every `refreshInterval` seconds.
3. Validate range (0–5000 ppm).
4. Run the **IF-ELSE supervisory layer**: classify indoor CO₂ into Level 0–3, gate any non-zero level by `(indoor − outdoor) ≥ minOutdoorDelta`, then map the selected level to actuator targets (damper angle + fan state). Hysteresis only smooths level transitions. The same rule base is documented on the System Design page.
5. POST `/api/device/readings` with the new sample + current actuator state.
6. GET `/api/device/:id/command` — if a manual override is pending, apply it.
7. Loop.

The backend mediates between dashboard commands and the device. This gives the dashboard authoritative confirmation (no optimistic updates) and lets the device run autonomously even if the dashboard disconnects.

## 19. Project Structure

```
src/
├── components/        # Reusable UI building blocks
│   ├── ui/            # shadcn/ui primitives
│   ├── AlertsPanel.tsx
│   ├── AppSidebar.tsx
│   ├── CO2Chart.tsx
│   ├── DashboardLayout.tsx
│   ├── LogsTable.tsx
│   ├── RuntimeSnapshot.tsx
│   ├── SensorCard.tsx
│   ├── SystemStatusPanel.tsx
│   └── …
├── pages/             # One file per route
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── DataLogsPage.tsx
│   ├── ControlPage.tsx
│   ├── SystemDesignPage.tsx
│   ├── SettingsPage.tsx
│   ├── UsersPage.tsx
│   └── AuditLogPage.tsx
├── context/           # Global state providers
│   ├── AuthContext.tsx
│   └── DeviceContext.tsx
├── services/          # API + auth + validation
│   ├── api.ts
│   ├── authService.ts
│   ├── auditBus.ts
│   └── validators.ts
├── data/              # Seeded mock data
├── types/             # Shared TypeScript types
├── config/            # Centralized environment config
└── hooks/             # React hooks
```

## 20. Important Components

| Component             | Responsibility                                                         |
|-----------------------|------------------------------------------------------------------------|
| `AppSidebar`          | Role-filtered navigation, collapsible, signed-in user + logout         |
| `DashboardLayout`     | Sidebar + main content frame for all authenticated pages               |
| `SensorCard`          | Single metric with status badge, highlight variant for primary metric  |
| `CO2Chart`            | Indoor/outdoor trend line chart                                        |
| `SystemStatusPanel`   | Online/offline, signal, uptime, firmware                               |
| `RuntimeSnapshot`     | Live evaluation summary on the dashboard                               |
| `AlertsPanel`         | System-only events (threshold breach, disconnect, reconnect)           |
| `LogsTable`           | Sortable, filterable, paginated sensor history                         |
| `ProtectedRoute`      | Auth + role guard for routes (in `App.tsx`)                            |

## 21. Tech Stack

**Frontend**
- React 18, TypeScript 5, Vite 5
- Tailwind CSS v3 (HSL-based design tokens)
- Recharts (charts), lucide-react (icons), framer-motion (transitions)
- shadcn/ui primitives (Radix under the hood)
- React Router v6, TanStack Query (configured but not heavily used yet)

**Tooling**
- Vite for dev/build, Vitest + Playwright for tests
- ESLint, TypeScript strict mode

**Targeted backend**
- Node.js + Express on Ubuntu (planned)
- ESP32 firmware in C++ via Arduino or PlatformIO

## 22. Configuration System

`src/config/index.ts` holds a single frozen config object selected by `import.meta.env.MODE` (or `VITE_APP_ENV`). Runtime override via `window.__AIRGUARD_CONFIG__` makes Docker / runtime injection possible.

Tunables: `apiBaseUrl`, `pollingInterval`, `requestTimeout`, `maxRetries`, `retryBaseDelay`, `heartbeatTimeout`, `maxHistorySize`, `defaultDeviceId`, `sessionInactivityTimeout`, `maxLoginAttempts`, `loginLockoutDuration`.

## 23. Current Limitations

- Pure frontend — credentials and user list still live in `authService`. **Replace with backend before any real deployment.**
- No real-time transport yet (no WebSocket / SSE) — uses polling.
- Settings page persists changes only in component state (not yet wired through to a backend `PUT /settings`).
- 2FA is a static demo code (`123456`) — backend should enforce a real TOTP secret per user.
- Audit log is in-memory; not persisted across full reloads (alerts seeded from mockData are).
- No Lovable Cloud / Supabase backend wired yet.

## 24. Production / Backend Readiness

The frontend is intentionally ready to swap to a real backend with minimal code change:

- All HTTP calls already pass through `fetchWithRetry` with timeout + retry semantics.
- Strict `validateSensorReading` / `validateSystemStatus` reject malformed payloads.
- No optimistic UI updates — confirmed device state from API drives `latest`.
- Command lock prevents duplicate submissions.
- `authService` exposes the exact public surface a real backend would.
- Configuration is centralized and environment-aware.
- Audit events are emitted via `auditBus` so server-side audit forwarding is a one-line subscription.

## 25. Deployment Plan (Ubuntu Server)

Suggested topology for the production deployment:

1. **Backend** — Node.js + Express service exposing the API surface in §17, backed by SQLite/PostgreSQL.
2. **Frontend** — `npm run build` produces a static bundle served by Nginx.
3. **Reverse proxy** — Nginx terminates TLS, proxies `/api/*` to Node on `127.0.0.1:3000`.
4. **Auth** — replace `authService` with a JWT-based backend; persist refresh tokens; add real TOTP via `otplib`.
5. **Devices** — ESP32s authenticate with per-device API keys (`DeviceReadingPayload.apiKey`).
6. **Process management** — `systemd` or `pm2` for the Node service; `ufw` to lock the firewall to 22/80/443.
7. **Observability** — pipe audit + system events to a log file mounted into a log shipper.

## 26. Future Improvements Roadmap

**UI/UX**
- Threshold reference lines on the CO₂ chart
- Inactivity countdown toast with "Stay signed in" action
- Per-page CSV/JSON export buttons
- Dark/light theme toggle

**Performance**
- Move polling to WebSocket / SSE for sub-second updates
- Virtualize the data logs table for large datasets
- Memoize chart computations and split heavy panels into their own React Query queries

**Scalability**
- Multi-device device picker (state already keyed by `deviceId`)
- Per-device thresholds and roles
- Per-tenant data isolation in the backend

**IoT integration**
- OTA firmware updates from the dashboard
- Calibration workflow for the MH-Z19B
- Per-device alert routing (email / push / webhook)
- Historical analytics: hourly/daily aggregates, exposure dashboards

**Security**
- Real TOTP secrets (server-side `otplib`)
- Hashed passwords (bcrypt/argon2 server-side)
- Audit-log shipping to a SIEM
- Rate-limiting middleware on the backend
