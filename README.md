# AirGuard Pro

**Smart Air Quality Monitoring and Ventilation Control**

A production-ready IoT dashboard for real-time CO₂ monitoring and ventilation control, built as a mechatronics engineering final project. Designed for ESP32 integration with a robust, scalable frontend architecture.

---

## Overview

AirGuard Pro monitors indoor and outdoor CO₂ concentrations and controls a ventilation system (exhaust fan + motorised damper) using hysteresis-based on-off control logic.

### Control Logic (Hysteresis)

| Condition | Action |
|---|---|
| Indoor CO₂ < 900 ppm | Fan OFF, Damper CLOSED |
| 900 ≤ Indoor CO₂ ≤ 1000 ppm | Maintain previous state |
| Indoor CO₂ > 1000 ppm & outdoor air is better | Fan ON, Damper OPEN |
| Outdoor air is worse | Protect indoor — keep closed |

---

## Features

- **Real-time Monitoring** — Polls service layer at configurable intervals for latest sensor data
- **Heartbeat-based Device Status** — Offline if no heartbeat within configurable timeout
- **Role-based Access** — `admin` (full), `operator` (control), `viewer` (read-only)
- **Control Panel** — AUTO/MANUAL toggle, fan ON/OFF, damper slider (0–90°) with confirmation
- **Command Locking** — Prevents duplicate rapid commands; only one active command at a time
- **Centralized Device State** — `DeviceContext` single source of truth with multi-device ready architecture
- **API Retry & Timeout** — Configurable retry attempts with exponential backoff and request timeouts
- **Payload Validation** — Runtime validators reject malformed API responses before state update
- **Seeded Historical Data** — 50 pre-generated readings; new readings appended with deduplication
- **History Size Limit** — Configurable max history entries to prevent memory growth
- **Activity Logging** — Control actions logged as alerts with timestamps
- **Clear Logs** — Bulk delete with confirmation dialog
- **Settings Management** — CO₂ thresholds, refresh interval, device config with validation
- **System Design Docs** — Built-in page showing software flow and control logic
- **Centralized Configuration** — All timeouts, intervals, and URLs in one config file
- **Multi-Device Ready** — State management keyed by deviceId for future expansion
- **Dark Industrial Theme** — Professional engineering-grade UI

---

## Architecture

### Configuration Layer (`src/config/index.ts`)

Centralized configuration with environment-based defaults and runtime override support:

| Setting | Development | Production |
|---|---|---|
| Polling Interval | 5s | 5s |
| Request Timeout | 8s | 10s |
| Max Retries | 2 | 3 |
| Retry Base Delay | 1s | 2s |
| Heartbeat Timeout | 15s | 15s |
| Max History Size | 500 | 1000 |

Override at runtime via `window.__AIRGUARD_CONFIG__` or build-time via `VITE_APP_ENV`.

### API Layer (`src/services/api.ts`)

All API calls use `fetchWithRetry()` which provides:
- **Timeout**: AbortController-based request cancellation
- **Retry**: Configurable attempts with linear backoff
- **Validation**: Response payloads validated via `src/services/validators.ts`
- **Fallback**: Mock data returned when no backend is connected

### Payload Validation (`src/services/validators.ts`)

Runtime validators for `SensorReading`, `SystemStatus`, and `ControlCommand`:
- Type checking (string, number, boolean)
- Enum validation (fan status, control mode, ventilation status)
- Range sanity checks (CO₂: 0–10000 ppm, damper: 0–90°)
- Returns `null` for invalid payloads (never throws)

### State Management (`src/context/DeviceContext.tsx`)

- **Multi-device ready**: `deviceId` stored in state with `setDeviceId()` for switching
- **Command locking**: `commandLockRef` prevents concurrent control commands
- **Deduplication**: `appendUnique()` ensures no duplicate readings in history
- **History cap**: Oldest entries trimmed when exceeding `maxHistorySize`
- **Heartbeat detection**: Periodic check marks device offline if no data received

---

## Pages

### Login (`/`)
Mock authentication with three users: `admin`, `operator`, `viewer`. Any password accepted.

### Dashboard (`/dashboard`)
- Indoor CO₂ (highlighted primary card with status badge)
- Outdoor CO₂, Fan Status, Damper Angle, Ventilation Status, Control Mode
- CO₂ trend chart (historical data)
- System Status panel (online/offline, heartbeat, uptime, firmware, WiFi signal)
- Alerts panel (info/warning/critical with timestamps)

### Control (`/control`)
- AUTO/MANUAL mode toggle
- Manual fan ON/OFF switch and damper angle slider
- Confirmation dialog before applying commands
- Command lock — button disabled and shows "Applying…" while pending
- Role-restricted (admin/operator only)

### Data Logs (`/logs`)
Historical sensor readings with search, pagination, and bulk clear.

### System Design (`/design`)
Software flow diagram and on-off control logic documentation.

### Settings (`/settings`)
CO₂ thresholds (validated), refresh interval, device name, location, endpoint URL.

---

## Data Flow

```
┌─────────────┐     POST /readings     ┌──────────────┐     GET /latest      ┌──────────────┐
│   ESP32      │ ──────────────────────▶│   Backend    │◀────────────────────│   Frontend   │
│  (Device)    │     POST /heartbeat    │   (Server)   │     GET /status     │  (React App) │
│              │◀──────────────────────│              │     POST /control   │              │
│              │     GET /command       │              │──────────────────▶  │              │
└─────────────┘                        └──────────────┘                     └──────────────┘
```

### Frontend Internal Flow

```
DeviceContext (Provider)
  ├── deviceId state (multi-device ready)
  ├── Polls api.getLatestReading(deviceId) every N ms
  ├── Polls api.getSystemStatus(deviceId) every N ms
  ├── Validates responses before state update
  ├── Deduplicates & caps history[]
  ├── Heartbeat timeout detection → offline
  └── sendCommand() → locked → api.sendControlCommand() → confirmed update
       ├── DashboardPage (reads: latest, status, history, alerts)
       ├── ControlPage (reads: latest, isCommandPending; writes: sendCommand)
       ├── DataLogsPage (reads: history; writes: clearHistory)
       └── SettingsPage (uses api.updateSettings with deviceId)
```

---

## API Endpoints

All endpoints include `deviceId` for multi-device support. Mock fallback when no backend is connected.

### Frontend → Server

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices/:id/readings/latest` | Latest sensor reading |
| GET | `/api/devices/:id/readings?limit=N` | Historical readings |
| DELETE | `/api/devices/:id/readings` | Clear all logs |
| GET | `/api/devices/:id/status` | System status & heartbeat |
| GET | `/api/devices/:id/settings` | Current settings |
| PUT | `/api/devices/:id/settings` | Update settings |
| POST | `/api/devices/:id/control` | Send control command |
| POST | `/api/auth/login` | User authentication |

### ESP32 → Server

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/device/readings` | Submit sensor reading |
| POST | `/api/device/heartbeat` | Device heartbeat |
| GET | `/api/device/:id/command` | Poll for pending commands |

---

## Error Handling & Retry

| Scenario | Behavior |
|---|---|
| Network failure | Retry up to `maxRetries` with linear backoff |
| Request timeout | AbortController cancels after `requestTimeout` ms |
| Invalid payload | Validator returns null → falls back to mock data |
| Duplicate command | Command lock rejects with warning |
| Device offline | Heartbeat timeout sets `deviceOnline: false` |

---

## Project Structure

```
src/
├── config/
│   └── index.ts              # Centralized configuration (env-based)
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   ├── SensorCard.tsx         # Metric card with status badges
│   ├── CO2Chart.tsx           # Recharts CO₂ trend chart
│   ├── LogsTable.tsx          # Paginated data table with search
│   ├── AlertsPanel.tsx        # Alert list with severity levels
│   ├── SystemStatusPanel.tsx  # Device health display
│   ├── AppSidebar.tsx         # Navigation sidebar
│   └── DashboardLayout.tsx    # Page layout wrapper
├── context/
│   ├── AuthContext.tsx         # Authentication state
│   └── DeviceContext.tsx       # Centralized device state (multi-device ready)
├── data/
│   └── mockData.ts            # Seed data generators & fallback values
├── pages/                     # Route-level page components
├── services/
│   ├── api.ts                 # API abstraction (fetch with retry + timeout)
│   └── validators.ts          # Runtime payload validation
├── types/
│   └── sensor.ts              # TypeScript interfaces
└── lib/
    └── utils.ts               # Utility functions
```

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 |
| UI Components | shadcn/ui (Radix) |
| Charts | Recharts |
| Animation | Framer Motion |
| Routing | React Router 6 |
| State | React Context |

---

## Getting Started

```bash
npm install
npm run dev
```

### Environment Configuration

Set `VITE_APP_ENV=production` for production defaults, or override at runtime:

```html
<script>
  window.__AIRGUARD_CONFIG__ = {
    apiBaseUrl: 'http://your-server:3001',
    pollingInterval: 10000,
  };
</script>
```

### Default Logins (Mock)

| Username | Role |
|----------|------|
| `admin` | Full control + settings |
| `operator` | Control panel |
| `viewer` | Read-only |

---

## ESP32 Integration

Set `apiBaseUrl` in config to your backend URL. The service layer automatically switches from mock fallback to real API calls.

```cpp
HTTPClient http;
http.begin("http://YOUR_SERVER/api/device/readings");
http.addHeader("Content-Type", "application/json");
http.POST("{\"deviceId\":\"esp32-room-01\",\"indoorCO2\":650}");
```

---

## Current Limitations

- No persistent backend — data resets on refresh
- Mock authentication — no JWT
- Polling-based — no WebSocket
- Single device active (multi-device state ready but UI shows one)

## Future Improvements

- [ ] Node.js/Express + PostgreSQL backend
- [ ] WebSocket real-time updates
- [ ] JWT authentication
- [ ] Multi-device UI (device switcher)
- [ ] CSV/PDF data export
- [ ] CO₂ threshold lines on chart
