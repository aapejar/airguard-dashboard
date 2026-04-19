# AirGuard Pro

**Smart Air Quality Monitoring & Ventilation Control Dashboard**
A professional, engineering-grade IoT dashboard for ESP32-based air quality systems. Frontend-only React app, ready for backend integration.

---

## 🎯 Project Overview

AirGuard Pro is a real-time air quality monitoring and ventilation control system designed for academic/industrial mechatronics projects. It provides a complete frontend for an ESP32 + MH-Z19B (CO₂ sensor) device, with hysteresis-based on/off control logic, role-based access, and a fully API-ready architecture.

---

## ✨ Features

### Authentication & Access Control
- Structured username/password authentication via dedicated `authService` (backend-ready surface — `login`, `verify2FA`, `logout`)
- **No credentials exposed in the UI** — login screen displays "Authorized personnel only" instead of demo accounts
- **Failed-attempt protection**: max 3 attempts, then automatic 60-second lockout (configurable in `src/config`)
- **Session inactivity auto-logout** after 10 minutes of no user activity (mouse/keyboard/touch)
- **2FA simulation** for admin accounts (TOTP-style 6-digit code) — service issues a `challengeId` and validates server-side-equivalent logic, ready to swap for real Authy / Google Authenticator
- Session persistence via `localStorage` (`airguard.session`) with hydrate-on-mount
- Three roles with route-level **and** UI-level enforcement:
  - **Admin** — full access (control, settings, user management, log deletion, threshold config)
  - **Operator** — dashboard, control panel, view/clear logs, threshold config (no settings/users)
  - **User** — read-only (dashboard + logs + system design)
- **User Management** (admin only): create users, assign/change roles, delete users — every action audited
- **Audit logging** of all auth events (login success/failure, 2FA challenge, invalid 2FA, logout, inactivity timeout, user CRUD) into the unified Recent Alerts feed
- **Command attribution**: every control action and threshold change is logged with the acting username
- Logout button always accessible in the sidebar; manual vs inactivity logout distinguished in the audit log

### Dashboard
- Live indoor/outdoor CO₂ readings with status coloring (uses configurable thresholds)
- Fan, damper, ventilation, and control mode cards
- CO₂ trend chart (50 seeded historical points)
- System status panel (online/offline, uptime, firmware, WiFi signal)
- **Recent Alerts** with manual clear button
- **Ready State** banner: after 5 polling cycles, simulation pauses and waits for real device data; admin/operator can resume

### Control Panel
- View active command status (mode/fan/damper)
- **Configurable CO₂ thresholds** (warning, critical, hysteresis) — moved here from Settings
- Threshold changes apply live and propagate to System Design page
- AUTO/MANUAL mode toggle
- Manual override: fan ON/OFF switch + damper angle slider (0–90°)
- Confirmation dialog before applying commands
- Command lock prevents duplicate rapid actions

### Settings (Admin Only)
- Device configuration (name, location, API endpoint URL)
- Polling interval & request timeout
- Feature toggles (heartbeat, notifications, auto-recovery)
- CO₂ thresholds **removed from here** (moved to Control)

### Data Logs
- Paginated table of historical sensor readings
- Clear all logs (with confirmation)

### System Design
- Documents software flow (init → read → validate → process → control → send → loop)
- **Live control logic rules** that reflect current threshold values from Control page
- Threshold parameters card (warning, critical, hysteresis)

---

## 🏗️ Architecture

### State Management
- **`AuthContext`** — user, users list, login/2FA/logout, user CRUD, role checks (`hasRole`)
  - Persists session in `localStorage` (`airguard.session`)
  - Persists users in `localStorage` (`airguard.users`)
- **`DeviceContext`** — single source of truth for device data
  - `latest`, `status`, `history`, `alerts`, `thresholds`
  - `sendCommand` (locked), `clearHistory`, `clearAlerts`, `updateThresholds`, `resumeSimulation`
  - 5-second polling, 15-second heartbeat timeout for offline detection
  - Cycle counter — after 5 cycles enters "ready state" awaiting real data

### Service Layer (`src/services/api.ts`)
All API calls go through a centralized layer with:
- `fetchWithRetry` (timeout via `AbortController` + linear backoff)
- Validators (`validateSensorReading`, `validateSystemStatus`)
- Mock fallback when no backend reachable

### Configuration (`src/config/index.ts`)
Centralized config: `apiBaseUrl`, `pollingInterval`, `requestTimeout`, `maxRetries`, `heartbeatTimeout`, `maxHistorySize`, `defaultDeviceId`. Switchable via `VITE_APP_ENV` or `window.__AIRGUARD_CONFIG__`.

### API Endpoints (Frontend → Backend)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/devices/:id/readings/latest` | Latest sensor reading |
| GET | `/api/devices/:id/readings?limit=N` | Historical readings |
| DELETE | `/api/devices/:id/readings` | Clear logs |
| GET | `/api/devices/:id/status` | System status / heartbeat |
| GET | `/api/devices/:id/settings` | Device settings |
| PUT | `/api/devices/:id/settings` | Update settings |
| POST | `/api/devices/:id/control` | Send control command |
| POST | `/api/auth/login` | Authenticate user |

### ESP32 → Backend
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/device/readings` | Push sensor readings |
| POST | `/api/device/heartbeat` | Heartbeat |
| GET | `/api/device/:id/command` | Pull pending command |

---

## 📁 Project Structure

```
src/
├── components/         # Reusable UI (SensorCard, CO2Chart, AlertsPanel, …)
├── pages/              # Route pages (Dashboard, Control, Logs, Settings, Users, …)
├── context/            # AuthContext, DeviceContext
├── services/           # api.ts, validators.ts
├── config/             # Centralized configuration
├── data/               # Mock/seed data
├── types/              # Shared TS types
└── lib/                # Utilities
```

---

## 🔐 Default Accounts (Development Only)

> ⚠️ Internal credentials live in `src/services/authService.ts` and are **never** displayed in the UI.
> In production these will be removed and authentication will be delegated to the backend.

| Username   | Password      | Role     | 2FA                |
|------------|---------------|----------|--------------------|
| `admin`    | `admin123`    | admin    | required (`123456`) |
| `operator` | `operator123` | operator | –                  |
| `viewer`   | `user123`     | user     | –                  |

### Security model

| Concern                | Mechanism                                                                 |
|------------------------|---------------------------------------------------------------------------|
| Brute-force protection | Failed attempts persisted; lockout after `config.maxLoginAttempts` (3)    |
| Session theft window   | Auto-logout after `config.sessionInactivityTimeout` (10 min) of no input  |
| Privilege escalation   | RBAC enforced at route guard AND UI affordance level                      |
| Audit trail            | All auth + control events flow through `auditBus` → unified alerts feed   |
| Backend readiness      | `authService` mirrors REST shape (`login`/`verify2FA`/`logout`)           |

---

## 🛠️ Tech Stack

- React 18 · TypeScript · Vite
- Tailwind CSS + shadcn/ui
- React Router · TanStack Query
- Recharts · Framer Motion · lucide-react

---

## 🚀 Roadmap

- Connect to a real Node.js/Express backend on Ubuntu
- Real 2FA via TOTP (Authy / Google Authenticator)
- Multi-device dashboard
- CSV export for logs
- WebSocket-based push updates
