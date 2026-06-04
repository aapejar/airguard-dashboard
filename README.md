# AirGuard Pro — Smart Air Quality Monitoring & Ventilation Control

**AirGuard Pro** is a production-oriented industrial IoT dashboard for monitoring indoor air quality and supervising automated ventilation hardware (fan + motorised damper) driven by an ESP32 controller. It uses an **IF-ELSE supervisory control** strategy that classifies indoor CO₂ into discrete ventilation levels and gates ventilation by the outdoor-vs-indoor advantage.

This document is the **single source of truth** for the project. A backend developer, ESP32 firmware developer, or a new frontend developer should be able to continue the work using **only this README**, without reading the source code first.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [State Management Architecture](#4-state-management-architecture)
5. [Service Layer Architecture](#5-service-layer-architecture)
6. [Authentication, 2FA & RBAC](#6-authentication-2fa--rbac)
7. [Role Permission Matrix](#7-role-permission-matrix)
8. [Control Logic (IF-ELSE Supervisory)](#8-control-logic-if-else-supervisory)
9. [Device Communication Flow](#9-device-communication-flow)
10. [Alert & Audit Log Flow](#10-alert--audit-log-flow)
11. [Settings & Dashboard Flow](#11-settings--dashboard-flow)
12. [Data Lifecycle](#12-data-lifecycle)
13. [API Contract Reference](#13-api-contract-reference)
14. [ESP32 Integration Guide](#14-esp32-integration-guide)
15. [Device Management & Multi-Device](#15-device-management--multi-device)
16. [System Health Monitoring](#16-system-health-monitoring)
17. [Deployment (Ubuntu)](#17-deployment-ubuntu)
18. [Developer Handoff](#18-developer-handoff)
19. [Device Lifecycle](#19-device-lifecycle)
20. [Alarm Severity System](#20-alarm-severity-system)
21. [Backup & Export Strategy](#21-backup--export-strategy)
22. [Data Retention Policy](#22-data-retention-policy)
23. [Environment Configuration Reference](#23-environment-configuration-reference)
24. [Firmware Compatibility Guide](#24-firmware-compatibility-guide)
25. [API Error Code Reference](#25-api-error-code-reference)
26. [Operational Readiness Checklists](#26-operational-readiness-checklists)
27. [Changelog](#27-changelog)

---

## 1. Project Overview

### Purpose
AirGuard Pro provides a real-time operator console for an air-quality control loop:
- Read indoor and outdoor CO₂ from sensors on an ESP32.
- Decide a ventilation level using a supervisory IF-ELSE rule base.
- Drive a fan (ON/OFF) and a motorised damper (0°–90°) accordingly.
- Surface live telemetry, alerts, audit trail, and configuration to operators and admins through a web dashboard.

### Identity
- **Theme:** dark industrial IoT.
- **Typography:** JetBrains Mono.
- **Stack:** React 18, Vite 5, TypeScript 5, Tailwind v3, shadcn/ui, Recharts, Framer Motion, React Router.
- **Runtime mode:** SPA only; the frontend talks to a REST backend that the firmware also talks to.

### Monitored Parameters
- **Indoor CO₂** (ppm) — primary control variable.
- **Outdoor CO₂** (ppm) — reference for outdoor-air advantage.
- **Δ = indoor − outdoor** — gating variable for ventilation authorisation.
- **Not monitored:** temperature, humidity, TVOC. The product is intentionally CO₂-focused.

---

## 2. System Architecture

```text
+--------------------+        HTTPS         +-----------------------+        HTTPS        +-------------------+
|                    |  POST readings/HB    |                       |  GET commands/cfg   |                   |
|   ESP32 Firmware   | -------------------> |   Backend (Node/PG)   | <------------------ |  React Frontend   |
|  (sensors + I/O)   | <------------------- |   REST API + Auth     | -------------------> |  (operator UI)    |
|                    |  GET command/config  |                       |  PUT settings, etc. |                   |
+--------------------+                      +-----------------------+                     +-------------------+
                                                       |
                                                       v
                                              +------------------+
                                              |  PostgreSQL      |
                                              |  readings, users,|
                                              |  audit, devices  |
                                              +------------------+
```

### Logical Layers
1. **Edge (ESP32):** sensor sampling, actuator drive, local safety fallback.
2. **Backend:** authentication, persistence, command queue, RBAC enforcement.
3. **Frontend:** visualization, supervisory parameter editing, operator controls, audit visibility.

---

## 3. Frontend Architecture

```text
src/
├── App.tsx                  # Router + provider tree
├── config/index.ts          # Centralized runtime config
├── types/sensor.ts          # All shared types (single source of truth)
├── services/
│   ├── api.ts               # HTTP client with retry, timeout, validation
│   ├── authService.ts       # Login / 2FA / user CRUD (backend-ready)
│   ├── auditBus.ts          # Pub/sub bridge between AuthContext and DeviceContext
│   └── validators.ts        # Runtime validation of API payloads
├── context/
│   ├── AuthContext.tsx      # Session, role, 2FA, lockout
│   └── DeviceContext.tsx    # Telemetry, alerts, audit, commands, supervisory eval
├── pages/                   # DashboardPage, ControlPage, DataLogsPage,
│                            # SystemDesignPage, UsersPage, AuditLogPage,
│                            # SettingsPage, LoginPage
├── components/              # DashboardLayout, AppSidebar, AlertsPanel,
│                            # CO2Chart, SensorCard, LogsTable,
│                            # RuntimeSnapshot, SystemStatusPanel
└── data/mockData.ts         # Seed data for fallback/demo
```

### Provider Tree
```text
<QueryClientProvider>
  <AuthProvider>             // top — session lives outside device state
    <DeviceProvider>         // telemetry + supervisory evaluation
      <Router>
        <DashboardLayout>{routes}</DashboardLayout>
      </Router>
    </DeviceProvider>
  </AuthProvider>
</QueryClientProvider>
```

`AuthContext` sits **above** `DeviceContext` so a logout cleanly tears down telemetry without ordering issues. Auth → Device communication uses the lightweight `auditBus` pub/sub.

---

## 4. State Management Architecture

### DeviceContext — single source of truth for telemetry
Fields:
- `latest: SensorReading` — most recent telemetry sample.
- `status: SystemStatus` — heartbeat, uptime, firmware, RSSI.
- `history: SensorReading[]` — bounded ring buffer (`config.maxHistorySize`).
- `alerts: AlertItem[]` — system/device events only (threshold breaches, disconnects, faults).
- `auditLog: AlertItem[]` — auth + user actions (logins, role changes, commands).
- `commandHistory: CommandRecord[]` — last N commands with `pending | success | failed`.
- `thresholds: ControlThresholds` — supervisory boundaries (persisted to `localStorage` under `airguard.thresholds`).
- `heartbeatAge: number` — ms since last successful poll, drives offline detection.
- `cycleCount`, `isReadyState` — bounded simulation seed: after `MAX_CYCLES` the UI stops auto-faking data and shows "awaiting real device data".

### Key invariants
- **No optimistic UI.** State updates only after a confirmed API response.
- Commands are **serialised** via `commandLockRef` — one in flight at a time.
- Heartbeat watchdog runs every 2 s; if `heartbeatAge ≥ config.heartbeatTimeout`, device is flagged offline and a critical alert is emitted exactly once on transition.

### AuthContext
- `user: User | null`, `pendingUser` (during 2FA), `failedAttempts`, `lockoutUntil`.
- `login()`, `verify2FA()`, `logout()` delegate to `authService`.
- Inactivity auto-logout based on `config.sessionInactivityTimeout`.
- All auth events emit via `auditBus.emit({source: 'auth', ...})`.

---

## 5. Service Layer Architecture

### `services/api.ts`
- `fetchWithRetry<T>()` — wraps `fetch` with `AbortController` timeout (`config.requestTimeout`), exponential backoff (`config.retryBaseDelay * attempt`), and up to `config.maxRetries` retries.
- Every server response is fed through a validator (`validators.ts`); invalid payloads are rejected and treated as failures.
- When the backend is unreachable, falls back to mock data so the UI stays functional during development.

### `services/validators.ts`
Runtime guards for `SensorReading`, `SystemStatus`, `ControlCommand`. Reject NaN, out-of-range values, wrong enums, etc. **Nothing reaches state without passing a validator.**

### `services/authService.ts`
Pure abstraction matching the future backend endpoints — `login`, `verify2FA`, `logout`, plus admin user CRUD. Swapping mock branches for real `fetch` calls does not change any caller.

### `services/auditBus.ts`
Tiny pub/sub used because `AuthContext` is above `DeviceContext` and cannot call `useDevice()`. AuthContext publishes, DeviceContext mirrors into the audit log.

---

## 6. Authentication, 2FA & RBAC

### Login Flow
```text
LoginPage
   │ username + password
   ▼
authService.login()
   ├── invalid_credentials ─────► increment failedAttempts, lockout if >= max
   ├── requires_2fa (admin) ────► stash pendingUser, show 2FA input
   └── success ─────────────────► AuthContext.user set, redirect to /
```

### 2FA Flow (admin only, simulated TOTP)
```text
LoginPage (2FA step)
   │ 6-digit code
   ▼
authService.verify2FA(challengeId, pendingUser, code)
   ├── invalid_code → stay on page, show error
   └── success      → AuthContext.user set
```

### Lockout
- After `config.maxLoginAttempts` failures: lock for `config.loginLockoutDuration`.
- Lockout is in-memory only (will move server-side with real backend).

### RBAC
- `UserRole = 'admin' | 'operator' | 'user'`.
- Frontend enforces via route guards in `App.tsx` and conditional rendering in pages.
- Backend MUST re-enforce — frontend RBAC is for UX, not security.

---

## 7. Role Permission Matrix

| Feature / Page          | Admin                    | Operator             | User       |
|-------------------------|--------------------------|----------------------|------------|
| Dashboard               | View                     | View                 | View       |
| Control Console         | View / Edit / Send       | View / Send          | —          |
| Thresholds (boundaries) | View / Edit / Reset      | View                 | —          |
| Data Logs               | View / Export / Clear    | View / Export        | View       |
| System Design           | View                     | View                 | View       |
| Users                   | View / Create / Edit / Delete / Reset PW / Toggle 2FA | — | — |
| Settings                | View / Edit              | View                 | —          |
| Audit Logs              | View / Export            | —                    | —          |
| Notifications/Alerts    | View / Clear             | View                 | View       |
| Device Management       | View / Configure         | View                 | —          |

Legend: **View** = read, **Edit** = mutate config, **Send** = issue control command, **Configure** = device-level admin.

---

## 8. Control Logic (IF-ELSE Supervisory)

### Decision Variables
- `indoor` — indoor CO₂ (ppm).
- `outdoor` — outdoor CO₂ (ppm).
- `Δ = indoor − outdoor` — positive Δ means outdoor air is cleaner.
- `safeThreshold` (default 700), `moderateThreshold` (900), `highThreshold` (1100).
- `minOutdoorDelta` (default 50) — minimum outdoor advantage to authorise ventilation.
- `hysteresis` (default ±50) — stabilization band only (NOT the primary control method).

### Rule Base (mutually exclusive)
| Lvl | Condition (AUTO mode)                                            | Fan | Damper |
|-----|------------------------------------------------------------------|-----|--------|
| 0   | `indoor < safeThreshold`                                         | OFF | 0°     |
| —   | `indoor ≥ safeThreshold` AND `Δ < minOutdoorDelta` (blocked)     | OFF | 0°     |
| 1   | `safe ≤ indoor < moderate` AND `Δ ≥ minOutdoorDelta`             | OFF | 30°    |
| 2   | `moderate ≤ indoor < high` AND `Δ ≥ minOutdoorDelta`             | ON  | 60°    |
| 3   | `indoor ≥ high` AND `Δ ≥ minOutdoorDelta`                        | ON  | 90°    |

### Pseudocode
```text
evaluate(indoor, outdoor, T):
  delta = indoor - outdoor
  IF indoor < T.safe:                                    return Level 0
  IF delta < T.minOutdoorDelta:                          return Level 0 (Blocked)
  IF indoor < T.moderate:                                return Level 1
  IF indoor < T.high:                                    return Level 2
  ELSE:                                                  return Level 3
```

### AUTO vs MANUAL
- **AUTO:** supervisor’s recommended (fan, damper) is applied.
- **MANUAL:** operator-issued `ControlCommand` overrides the supervisor; the dashboard still shows the supervisor’s recommendation for transparency.

### Worked Examples
| Scenario | indoor | outdoor | Δ | Level | Reason |
|----------|--------|---------|---|-------|--------|
| Safe       | 600  | 400 | 200 | 0 | Below `safe` |
| Light      | 800  | 500 | 300 | 1 | Within moderate band, Δ ok |
| Aggressive | 1300 | 500 | 800 | 3 | Above `high`, Δ ok |
| Blocked    | 1200 | 1180| 20  | 0 | Δ < `minOutdoorDelta` — outdoor not advantageous |

---

## 9. Device Communication Flow

```text
ESP32                          Backend                           Frontend
  │  POST /api/device/readings   │                                  │
  │  every 5 s ───────────────►  │                                  │
  │  POST /api/device/heartbeat  │                                  │
  │  every 10 s ──────────────►  │                                  │
  │                              │ ◄── GET /api/devices/:id/readings/latest (every 5s)
  │                              │ ◄── GET /api/devices/:id/status
  │  GET /api/device/command/:id │                                  │
  │  every 2–5 s ─────────────►  │  ◄── POST /api/devices/:id/control (operator)
  │  GET /api/device/config/:id  │                                  │
  │  every 60 s ──────────────►  │  ◄── PUT /api/devices/:id/settings
```

---

## 10. Alert & Audit Log Flow

Two strictly separated streams:

**Alerts** (`source: 'system' | 'device'`) — surfaced on the Dashboard `AlertsPanel`:
- Device offline / online transitions
- Threshold breaches
- Hardware fault reports

**Audit Log** (`source: 'auth' | 'user'`) — surfaced on Admin-only `AuditLogPage`:
- Logins, logouts, failed logins, lockouts, 2FA challenges
- Role changes, password resets, 2FA toggles, user create/delete
- Control commands, threshold edits, settings changes

Both are typed as `AlertItem` with `level: 'info' | 'warning' | 'critical'`, `source`, `actor`, `timestamp`. The Audit page supports filtering by source/level and CSV export.

---

## 11. Settings & Dashboard Flow

### Settings (`SettingsPage`)
- `co2WarningThreshold`, `co2CriticalThreshold` — display-only thresholds for chart shading.
- `refreshInterval` — desired polling frequency hint.
- `deviceName`, `location`, `deviceEndpoint` — device identity metadata.
- Save flow: `api.updateSettings()` → on success, `logEvent('user', ...)`.

### Dashboard (`DashboardPage`)
Reads from `DeviceContext`:
- `SensorCard` × N for indoor/outdoor CO₂, fan, damper.
- `CO2Chart` plots `history`.
- `RuntimeSnapshot` shows live `getEvaluation()` result (rule, level, reasoning).
- `AlertsPanel` shows recent system alerts.
- `SystemStatusPanel` shows uptime, RSSI, heartbeat age.

---

## 12. Data Lifecycle

```text
ESP32 sample ─► POST reading ─► backend persists ─► frontend GET ─► validator
   │                                                              │
   │                                          rejected? ─► dropped (error logged)
   │                                          accepted? ─► DeviceContext.latest
   │                                                              │
   │                                                              ▼
   │                                              appendUnique(history) (dedup by id)
   │                                                              │
   │                                                              ▼
   │                                              CO2Chart + RuntimeSnapshot
```

- History is bounded by `config.maxHistorySize`; oldest entries dropped first.
- Audit log capped at 500 entries in memory.
- Command history capped at 25 entries.
- Thresholds persisted to `localStorage` (`airguard.thresholds`) with legacy-schema migration.

---

## 13. API Contract Reference

All requests/responses are JSON. Authenticated routes require `Authorization: Bearer <jwt>` (future). Device routes require `apiKey` field in body (current contract).

### Auth

#### `POST /api/auth/login`
Auth: none. Roles: any.
Request:
```json
{ "username": "admin", "password": "********" }
```
Response 200 (no 2FA):
```json
{ "status": "success", "user": { "id": "1", "username": "admin", "role": "admin", "status": "active", "twoFactorEnabled": true, "lastLogin": "2026-06-04T10:00:00Z", "createdAt": "2025-01-01T00:00:00Z" } }
```
Response 200 (2FA required):
```json
{ "status": "requires_2fa", "pendingUser": { "...": "..." }, "challengeId": "chal-..." }
```
Response 401:
```json
{ "status": "invalid_credentials" }
```

#### `POST /api/auth/2fa/verify`
Request: `{ "challengeId": "chal-...", "code": "123456" }`
Response 200: `{ "status": "success", "user": { ... } }` or 401 `{ "status": "invalid_code" }`.

#### `POST /api/auth/logout`
Auth: bearer. Response 204.

### Telemetry (frontend → backend)

#### `GET /api/devices/:deviceId/readings/latest`
Auth: bearer. Roles: any.
Response 200: a `SensorReading`:
```json
{
  "id": "reading-1234",
  "deviceId": "esp32-room-01",
  "indoorCO2": 720.4,
  "outdoorCO2": 410.1,
  "fanStatus": "OFF",
  "damperAngle": 30,
  "ventilationStatus": "IDLE",
  "controlMode": "AUTO",
  "timestamp": "2026-06-04T10:00:05Z"
}
```

#### `GET /api/devices/:deviceId/readings?limit=50`
Response 200: `SensorReading[]` ordered newest→oldest.

#### `DELETE /api/devices/:deviceId/readings`
Auth: bearer (admin). Response: `{ "success": true }`.

#### `GET /api/devices/:deviceId/status`
Response 200:
```json
{ "deviceOnline": true, "lastHeartbeat": "2026-06-04T10:00:05Z", "uptime": 172800, "firmwareVersion": "v2.1.4", "wifiSignal": -42 }
```

#### `GET /api/devices/:deviceId/settings` & `PUT /api/devices/:deviceId/settings`
Body: `SystemSettings`. PUT response: `{ "success": true }`.

#### `POST /api/devices/:deviceId/control`
Auth: bearer (admin or operator).
Request (`ControlCommand`):
```json
{ "controlMode": "MANUAL", "fanStatus": "ON", "damperAngle": 60 }
```
Response: `{ "success": true }`.

### Device → Backend (ESP32)

#### `POST /api/device/readings`
Auth: `apiKey` field.
Request:
```json
{
  "deviceId": "esp32-room-01",
  "apiKey": "********",
  "indoorCO2": 720,
  "outdoorCO2": 410,
  "fanStatus": "OFF",
  "damperAngle": 30,
  "ventilationStatus": "IDLE",
  "controlMode": "AUTO",
  "timestamp": "2026-06-04T10:00:05Z"
}
```
Response: `{ "success": true }`. Frequency: every 5 s.

#### `POST /api/device/heartbeat`
Request:
```json
{ "deviceId": "esp32-room-01", "apiKey": "********", "uptime": 172800, "wifiSignal": -42, "firmwareVersion": "v2.1.4" }
```
Frequency: every 10 s.

#### `GET /api/device/:deviceId/command`
Response (current desired state issued by backend):
```json
{ "controlMode": "AUTO", "fanStatus": "ON", "damperAngle": 45, "updatedAt": "2026-06-04T10:00:00Z" }
```
Frequency: every 2–5 s.

#### `GET /api/device/:deviceId/config`
Response (supervisor thresholds + sample rates):
```json
{
  "safeThreshold": 700,
  "moderateThreshold": 900,
  "highThreshold": 1100,
  "minOutdoorDelta": 50,
  "hysteresis": 50,
  "sampleIntervalMs": 5000,
  "heartbeatIntervalMs": 10000,
  "updatedAt": "2026-06-04T09:00:00Z"
}
```
Frequency: every 60 s (or on backend push).

### Status Codes
- 200 OK, 204 No Content, 400 Bad Request (validation), 401 Unauthorized, 403 Forbidden (RBAC), 404 Not Found, 409 Conflict (command already in flight), 500 Internal Error.

---

## 14. ESP32 Integration Guide

### Connection
- Wi-Fi STA mode, NTP-synced clock (ISO 8601 timestamps required).
- HTTPS to backend host; pin cert in production.
- Authenticate every request with `apiKey` (per-device, provisioned via Users/Devices admin).

### Loop
```text
setup():
  wifi_connect()
  ntp_sync()
  load_config_from_backend()        // GET /api/device/:id/config

loop():
  every 5s:  read_sensors(); decide_or_apply_command(); POST /api/device/readings
  every 10s: POST /api/device/heartbeat
  every 5s:  GET /api/device/:id/command   // apply remote desired state
  every 60s: GET /api/device/:id/config    // refresh thresholds
```

### Field Reference (all device payloads)
| Field             | Type      | Units / Enum                           | Purpose |
|-------------------|-----------|----------------------------------------|---------|
| `deviceId`        | string    | e.g. `esp32-room-01`                   | Identity, must match registration |
| `apiKey`          | string    | opaque                                 | Auth for device routes |
| `indoorCO2`       | number    | ppm, 0–10000                           | Primary control input |
| `outdoorCO2`      | number    | ppm, 0–10000                           | Outdoor reference |
| `fanStatus`       | enum      | `"ON"` \| `"OFF"`                      | Reported fan state |
| `damperAngle`     | number    | degrees, 0–90                          | Reported damper position |
| `ventilationStatus`| enum     | `"ACTIVE"` \| `"IDLE"` \| `"FAULT"`    | Coarse actuator state |
| `controlMode`     | enum      | `"AUTO"` \| `"MANUAL"`                 | Active control regime |
| `firmwareVersion` | string    | semver, e.g. `v2.1.4`                  | For health dashboard |
| `wifiSignal`      | number    | dBm, typ. −90..−30                     | Connection quality |
| `uptime`          | number    | seconds                                | Since boot |
| `timestamp`       | string    | ISO 8601 UTC                           | Sample time on device |

### Expected Behaviour
- **Validation:** validate ranges locally before POSTing; mark `ventilationStatus = "FAULT"` if sensor returns out-of-range.
- **Retry:** exponential backoff on POST failures (1s, 2s, 4s, capped at 30s). Buffer up to N readings in RAM and flush when online.
- **Reconnect:** on Wi-Fi loss, attempt reconnect every 5 s. On backend 5xx, treat as transient.
- **Offline:** continue running the supervisor locally using the last fetched config; never lock actuators in unsafe state. Default fail-safe = fan OFF, damper CLOSED.
- **Config sync:** treat backend config as authoritative; cache last good config in flash to survive reboots without network.
- **Command application:** in AUTO mode, ignore remote `controlMode/fanStatus/damperAngle` from `command` — only echo. In MANUAL mode, apply them directly. Always echo current actuator state in the next `readings` POST.
- **Time:** if NTP fails, mark `timestamp` and continue; backend may reject — that is acceptable.

---

## 15. Device Management & Multi-Device

- `deviceId` is the **stable primary key** for telemetry, commands, and config (e.g. `esp32-<room>-<index>`).
- All API routes are parameterised by `:deviceId` (`config.defaultDeviceId` provides a single-device default).
- Frontend `DeviceContext` exposes `setDeviceId()` for future device-picker UI.
- Recommended device record:
  ```json
  {
    "deviceId": "esp32-room-01",
    "displayName": "Room 1 Controller",
    "location": "Building A / Floor 2 / Room 1",
    "firmwareVersion": "v2.1.4",
    "apiKey": "********",
    "status": "online",
    "lastSeen": "2026-06-04T10:00:05Z",
    "createdAt": "2025-12-01T00:00:00Z"
  }
  ```
- Backend should expose `GET/POST/PATCH/DELETE /api/devices` (admin) for provisioning.

---

## 16. System Health Monitoring

Future `GET /api/health` (admin) should return:
```json
{
  "api":      { "status": "up", "latencyMs": 12 },
  "database": { "status": "up", "connections": 4 },
  "devices":  [{ "deviceId": "esp32-room-01", "online": true, "heartbeatAgeMs": 3200, "rssi": -42 }],
  "uptimeSec": 864000,
  "version":   "1.0.0"
}
```
The frontend already exposes connection quality per-device via `heartbeatAge` and the offline watchdog.

---

## 17. Deployment (Ubuntu)

### Recommended Directory Structure
```text
/opt/airguard/
├── frontend/                  # built static assets from `bun run build`
│   └── dist/
├── backend/                   # Node.js service
│   ├── src/
│   ├── package.json
│   └── .env                   # NOT in repo
├── firmware/                  # ESP32 sources (PlatformIO)
└── nginx/airguard.conf        # reverse proxy
```

### Frontend Build & Deploy
```bash
bun install
bun run build
sudo rsync -a --delete dist/ /opt/airguard/frontend/dist/
```

### Backend (Node.js + PostgreSQL)
```bash
sudo apt install -y nodejs postgresql nginx
sudo -u postgres createdb airguard
cd /opt/airguard/backend
cp .env.example .env   # fill secrets
npm ci --omit=dev
node ./src/migrate.js
pm2 start ./src/server.js --name airguard-api
pm2 save
```

### Environment Variables (backend)
| Name | Purpose |
|------|---------|
| `PORT` | API port (default 8080) |
| `DATABASE_URL` | `postgres://user:pass@localhost:5432/airguard` |
| `JWT_SECRET` | Sign session tokens |
| `JWT_TTL` | e.g. `12h` |
| `DEVICE_API_KEYS` | Comma-separated valid device keys, or use DB table |
| `CORS_ORIGIN` | Frontend origin, e.g. `https://airguard.example.com` |
| `TOTP_ISSUER` | For real 2FA |

### Nginx Reverse Proxy (`/etc/nginx/sites-available/airguard`)
```nginx
server {
  listen 443 ssl http2;
  server_name airguard.example.com;

  ssl_certificate     /etc/letsencrypt/live/airguard.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/airguard.example.com/privkey.pem;

  root /opt/airguard/frontend/dist;
  index index.html;

  location /api/ {
    proxy_pass         http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
  }

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### Frontend Runtime Config Override (no rebuild)
Inject before the SPA loads:
```html
<script>
  window.__AIRGUARD_CONFIG__ = {
    apiBaseUrl: 'https://airguard.example.com',
    pollingInterval: 5000,
    heartbeatTimeout: 15000
  };
</script>
```

---

## 18. Developer Handoff

### For Frontend Developers
- **Responsibilities:** UI, RBAC gating, validation, UX of alerts/audit/control. No business-critical control logic lives here.
- **Required APIs:** all of Section 13.
- **Expected behaviour:** never mutate state on optimistic assumptions; always reflect server-confirmed values. Use `DeviceContext` and `AuthContext` — do not call `api.*` from components directly except for one-shot mutations.
- **Integration points:** `services/api.ts` (HTTP), `validators.ts` (payload guards), `config/index.ts` (env config).

### For Backend Developers
- **Responsibilities:** implement Section 13 verbatim, enforce RBAC server-side, persist readings/audit, run a command queue per device, validate device `apiKey`.
- **Required:** Postgres schema for `users`, `user_roles` (separate table — never store role on users), `devices`, `readings`, `commands`, `audit_log`, `settings`.
- **Expected behaviour:**
  - Validate every payload to the same constraints as `validators.ts`.
  - Issue JWTs; rotate refresh tokens; enforce lockout after failed attempts.
  - Apply rate limits on `/api/auth/*` and device endpoints.
  - Emit audit rows for every privileged action.
- **Integration points:** mirror the field set in Section 14 byte-for-byte; do not add or rename fields without updating this README and `types/sensor.ts`.

### For ESP32 Developers
You can build the firmware using **only this section and Sections 13–14**, without reading frontend code.

- **Goal:** sample CO₂, push readings + heartbeats, fetch commands + config, drive fan + damper.
- **Inputs:** indoor CO₂ sensor, outdoor CO₂ sensor.
- **Outputs:** fan relay (ON/OFF), damper servo (0°–90°).
- **Required endpoints (consume):**
  - `POST /api/device/readings` — every 5 s.
  - `POST /api/device/heartbeat` — every 10 s.
  - `GET /api/device/:id/command` — every 2–5 s.
  - `GET /api/device/:id/config` — every 60 s.
- **Behaviour contract:**
  - Honour Section 8 supervisor in AUTO mode using last fetched config; never violate `minOutdoorDelta` gate.
  - In MANUAL mode, apply `command` immediately and echo back.
  - Fail-safe on lost Wi-Fi: fan OFF, damper 0°, keep retrying.
  - Mark `ventilationStatus = "FAULT"` if sensor out-of-range or actuator feedback mismatches commanded state.
- **Auth:** include `apiKey` in every POST body; backend rejects unknown keys.
- **Observability:** include `firmwareVersion`, `wifiSignal`, `uptime` on every heartbeat for the System Health dashboard.

---

## 19. Changelog

### 1.0.0 — Production-readiness pass (current)
- Full README rewrite as single source of truth (architecture, API contract, ESP32 guide, deployment).
- Role permission matrix.
- ESP32 integration guide with payload field reference.
- Ubuntu deployment instructions + Nginx config + env variable table.
- Developer handoff sections (frontend / backend / firmware).

### 0.9.0 — IF-ELSE supervisory refinement
- Non-overlapping rule intervals; explicit Δ gating; worked examples.
- RuntimeSnapshot redesigned as decision-explanation panel.

### 0.8.0 — Supervisory control transition
- Replaced on/off hysteresis with 4-level IF-ELSE supervisor (`safe/moderate/high` boundaries, `minOutdoorDelta`).
- Legacy threshold schema migration in `localStorage`.

### 0.7.0 — Audit/alerts split, audit log page, CSV export
- Alerts vs audit log separation by `source`.
- Admin-only `AuditLogPage` with filter + CSV export.
- LogsTable filters; RuntimeSnapshot widget.

### 0.6.0 — Authentication hardening
- Removed credential hints from LoginPage.
- 2FA simulation for admins; lockout; inactivity timeout.
- `authService` and `auditBus` extracted.

### 0.5.0 — Auth, roles, user management
- `AuthContext`, `UsersPage`, role-gated routes.

### 0.4.0 — API contract enforcement
- `config/index.ts`, `validators.ts`, retry/timeout in `api.ts`, multi-device readiness via `deviceId`.

### 0.3.0 — Core dashboard
- Indoor/outdoor CO₂ cards, CO₂ chart, alerts panel, system status, control console, settings, data logs.

---

*Last updated: 2026-06-04.*
