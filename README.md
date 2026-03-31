# AirGuard Pro

**Smart Air Quality Monitoring and Ventilation Control**

A professional IoT dashboard for real-time CO₂ monitoring and ventilation control, built as a mechatronics engineering final project. Designed for ESP32 integration with a clean, production-ready frontend architecture.

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

- **Real-time Monitoring** — Polls service layer every 5s for latest sensor data
- **Heartbeat-based Device Status** — Offline if no heartbeat within 15 seconds
- **Role-based Access** — `admin` (full), `operator` (control), `viewer` (read-only)
- **Control Panel** — AUTO/MANUAL toggle, fan ON/OFF, damper slider (0–90°) with confirmation
- **Centralized Device State** — `DeviceContext` single source of truth across all pages
- **Seeded Historical Data** — 50 pre-generated readings; new readings appended automatically
- **Activity Logging** — Control actions logged as alerts with timestamps
- **Clear Logs** — Bulk delete with confirmation dialog
- **Settings Management** — CO₂ thresholds, refresh interval, device config with validation
- **System Design Docs** — Built-in page showing software flow and control logic
- **Error Handling** — API calls with try/catch; mock fallback when no backend connected
- **Dark Industrial Theme** — Professional engineering-grade UI

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
- Current active command status from device state
- Role-restricted (admin/operator only)

### Data Logs (`/logs`)
Historical sensor readings with search, pagination, and bulk clear.

### System Design (`/design`)
Software flow diagram and on-off control logic documentation.

### Settings (`/settings`)
CO₂ thresholds (validated), refresh interval, device name, location, endpoint URL.

---

## Architecture & Data Flow

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
  ├── Polls api.getLatestReading() every 5s
  ├── Polls api.getSystemStatus() every 5s
  ├── Manages history[] (seeded + incoming, deduplicated by ID)
  ├── Manages alerts[] (seeded + control action logs)
  ├── Heartbeat timeout detection (15s → offline)
  └── sendCommand() → api.sendControlCommand() → optimistic update
       ├── DashboardPage (reads: latest, status, history, alerts)
       ├── ControlPage (reads: latest; writes: sendCommand)
       ├── DataLogsPage (reads: history; writes: clearHistory)
       └── SettingsPage (uses api.updateSettings directly)
```

---

## API Endpoints

All endpoints attempt real `fetch()` first, falling back to mock data when no backend is connected.

### Frontend → Server

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/readings/latest` | Latest sensor reading |
| GET | `/api/readings?limit=N` | Historical readings |
| DELETE | `/api/readings` | Clear all logs |
| GET | `/api/status` | System status & heartbeat |
| GET | `/api/settings` | Current settings |
| PUT | `/api/settings` | Update settings |
| POST | `/api/control` | Send control command |
| POST | `/api/auth/login` | User authentication |

### ESP32 → Server

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/device/readings` | Submit sensor reading |
| POST | `/api/device/heartbeat` | Device heartbeat |
| GET | `/api/device/:id/command` | Poll for pending commands |

---

## State Management

| Context | Purpose |
|---------|---------|
| `AuthContext` | User authentication (login/logout, role) |
| `DeviceContext` | Centralized device state: latest reading, system status, history, alerts, command dispatch |

---

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/               # shadcn/ui primitives
│   ├── SensorCard.tsx    # Metric card with status badges
│   ├── CO2Chart.tsx      # Recharts CO₂ trend chart
│   ├── LogsTable.tsx     # Paginated data table with search
│   ├── AlertsPanel.tsx   # Alert list with severity levels
│   ├── SystemStatusPanel.tsx  # Device health display
│   ├── AppSidebar.tsx    # Navigation sidebar
│   └── DashboardLayout.tsx    # Page layout wrapper
├── context/
│   ├── AuthContext.tsx    # Authentication state
│   └── DeviceContext.tsx  # Centralized device state & API orchestration
├── data/
│   └── mockData.ts       # Seed data generators & fallback values
├── pages/                # Route-level page components
├── services/
│   └── api.ts            # API abstraction (fetch with mock fallback)
├── types/
│   └── sensor.ts         # TypeScript interfaces
└── lib/
    └── utils.ts          # Utility functions
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

### Default Logins (Mock)

| Username | Role |
|----------|------|
| `admin` | Full control + settings |
| `operator` | Control panel |
| `viewer` | Read-only |

---

## ESP32 Integration

Set `API_BASE` in `src/services/api.ts` to your backend URL. The service layer automatically switches from mock fallback to real API calls.

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
- Polling (5s) — no WebSocket
- Single device support

## Future Improvements

- [ ] Node.js/Express + PostgreSQL backend
- [ ] WebSocket real-time updates
- [ ] JWT authentication
- [ ] Multi-device support
- [ ] CSV/PDF data export
- [ ] CO₂ threshold lines on chart
