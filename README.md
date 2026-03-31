# AirGuard Pro

**Smart Air Quality Monitoring and Ventilation Control**

A professional industrial IoT dashboard for monitoring indoor air quality and controlling ventilation systems. Built as a mechatronics final project with future ESP32 hardware integration in mind.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![Tailwind](https://img.shields.io/badge/Tailwind-3-cyan)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Pages](#pages)
- [Components](#components)
- [UI/UX Structure](#uiux-structure)
- [Data Flow & Architecture](#data-flow--architecture)
- [State Management](#state-management)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [ESP32 Integration Guide](#esp32-integration-guide)
- [Self-Hosting on Ubuntu Server](#self-hosting-on-ubuntu-server)
- [Current Limitations](#current-limitations)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## Project Overview

AirGuard Pro is a web-based dashboard application designed to monitor indoor air quality through CO₂ concentration levels and control a ventilation system (exhaust fan + motorized damper). The system implements **hysteresis-based on-off control logic** to regulate ventilation based on the difference between indoor and outdoor CO₂ readings.

### Main Purpose

- **Monitor** real-time indoor and outdoor CO₂ levels from an ESP32 sensor node
- **Control** ventilation actuators (fan relay and damper servo) via AUTO or MANUAL mode
- **Log** historical sensor readings for analysis and reporting
- **Alert** operators when CO₂ levels exceed configurable thresholds
- **Document** the system design and control logic for academic presentation

The application currently runs with mock data but is architecturally prepared for seamless integration with a real ESP32 device over HTTP.

---

## Features

### Authentication & Role-Based Access Control

- Three user roles: **Admin**, **Operator**, and **Viewer**
- Role-based UI restrictions:
  - **Admin / Operator**: Full access to control panel and settings
  - **Viewer**: Read-only access to dashboard and logs
- Mock login system (accepts `admin`, `operator`, or `viewer` as username with any password)
- Protected routes — unauthenticated users are redirected to the login page
- Session managed via React Context (client-side only, no persistence)

### Dashboard Monitoring

- **Indoor CO₂** highlighted as the primary metric with status-based coloring (normal / warning / critical)
- **Outdoor CO₂**, **Fan Status** (ON/OFF), **Damper Angle** (0–90°), **Ventilation Status** (ACTIVE/IDLE), and **Control Mode** (AUTO/MANUAL) displayed in sensor cards
- **CO₂ Trend Chart** — line chart showing indoor vs outdoor CO₂ over time using Recharts
- **System Status Panel** — device online/offline status, last heartbeat timestamp, WiFi signal strength, uptime, and firmware version
- **Alerts Panel** — recent alerts with severity levels (info, warning, critical), relative timestamps, and color-coded badges
- Smooth entrance animations via Framer Motion

### Ventilation Control

- **AUTO / MANUAL** mode toggle with clear visual feedback
- In MANUAL mode:
  - Fan ON/OFF toggle switch (Radix UI Switch)
  - Damper angle slider (0° to 90°, Radix UI Slider)
- Active command status display showing current mode, fan state, and damper angle
- **Confirmation dialog** before applying manual override commands
- Success feedback after command application
- Role-restricted: viewers see a warning banner and cannot modify controls

### Data Logs

- Historical sensor readings displayed in a paginated table (15 rows per page)
- Columns: Time, CO₂ Indoor, CO₂ Outdoor, Fan Status, Damper Angle, Status
- Row highlighting based on CO₂ severity (warning = yellow tint, critical = red tint)
- Search/filter functionality across timestamps, fan status, and ventilation status
- **Clear All Logs** button with confirmation dialog
- Currently populated with 100 mock entries on page load

### Settings

- Configurable CO₂ thresholds:
  - Warning threshold (default: 600 ppm)
  - Critical threshold (default: 1000 ppm)
- Refresh interval (1–300 seconds)
- Device name and location labels
- Device endpoint URL placeholder for ESP32 connection
- **Validation**: warning threshold must be less than critical threshold, minimum values enforced
- Save confirmation with success feedback and loading state

### System Design Documentation

- **Software Flow** section: step-by-step visualization of the ESP32 processing loop (Initialization → Sensor Reading → Validation → Processing → Control Decision → Send to Server → Loop)
- **On-Off Control Logic** section: hysteresis-based rules with dead-band zone to prevent relay chatter
- **Threshold Parameters** display: lower (900 ppm) and upper (1000 ppm) thresholds
- Designed for academic presentation and engineering report demonstration

### Simulated Real-Time Behavior

- `useLiveData` hook updates timestamps every 5 seconds to simulate active device connectivity
- System uptime counter increments with each tick
- Sensor values use static mock data (not randomized) — ready to be replaced by real API calls

---

## Pages

### Login Page (`/`)

The entry point of the application. Displays the AirGuard Pro branding (Shield icon, title, subtitle) centered on screen with a clean form containing username and password fields. Accepts three demo usernames (`admin`, `operator`, `viewer`) with any password. On successful login, the user is redirected to `/dashboard`. Invalid credentials show an inline error message. The page uses a minimal dark design consistent with the industrial theme.

### Dashboard (`/dashboard`)

The main monitoring hub. Displays the current state of the air quality system through six sensor cards arranged in a responsive grid. Indoor CO₂ is highlighted as the primary card with a ring accent and gradient top border. The remaining cards (Outdoor CO₂, Fan Status, Damper Angle, Ventilation Status, Control Mode) are arranged in a 3-column sub-grid. Below the cards, a CO₂ trend line chart occupies two-thirds of the width, with the System Status panel and Alerts panel stacked in the remaining third. A connectivity indicator in the header shows the device connection state.

### Data Logs (`/logs`)

Displays historical sensor readings in a searchable, paginated table. Each row shows the timestamp, indoor CO₂, outdoor CO₂, fan status, damper angle, and a color-coded status badge. Rows are highlighted based on CO₂ severity. A search bar filters entries by text content. A "Clear All Logs" button in the header triggers a confirmation dialog before removing all entries.

### Control Panel (`/control`)

Allows operators and admins to manage the ventilation system. Displays the current active command status (mode, fan state, damper angle) in a summary card. Below, a mode selector offers AUTO and MANUAL buttons with explanatory text. When MANUAL is selected, additional controls appear: a fan ON/OFF toggle switch and a damper angle slider (0–90°). An "Apply Manual Override" button triggers a confirmation dialog. Viewers see a warning banner indicating insufficient permissions.

### System Design (`/design`)

A documentation page split into two columns. The left column shows the Software Flow as a vertical sequence of numbered steps, each with an icon, title, and description, connected by downward arrows. The right column contains the On-Off Control Logic rules displayed as color-coded cards (green for safe, yellow for dead-band, red for ventilate, blue for protect), plus a Threshold Parameters panel showing the lower (900 ppm) and upper (1000 ppm) values.

### Settings (`/settings`)

A form-based configuration page organized into two panels. The first panel ("CO₂ Thresholds") contains numeric inputs for warning and critical thresholds with inline validation errors. The second panel ("System") contains inputs for refresh interval, device name, location, and device endpoint URL. A "Save Settings" button at the bottom shows a loading spinner during the mock API call and a success message upon completion.

### Not Found (`/*`)

A fallback page for unmatched routes.

---

## Components

### Custom Application Components

| Component | File | Purpose |
|---|---|---|
| **SensorCard** | `src/components/SensorCard.tsx` | Displays a single metric (value, unit, label, status badge, optional subtitle). Supports a `highlight` prop for primary emphasis. Uses Framer Motion for entrance animation and custom hover glow effects. |
| **CO2Chart** | `src/components/CO2Chart.tsx` | Renders a Recharts `LineChart` with indoor (solid teal line) and outdoor (dashed gray line) CO₂ trends. Styled with dark-theme tooltip and grid overrides. |
| **LogsTable** | `src/components/LogsTable.tsx` | A data table with search filtering, pagination (15 rows/page), row-level CO₂ status highlighting, and an empty-state message. Accepts `paginated` and `maxRows` props. |
| **AlertsPanel** | `src/components/AlertsPanel.tsx` | Displays a list of alerts with severity icons (Info, Warning, XCircle), color-coded left borders, relative timestamp formatting ("5m ago", "2h ago"), and severity badges. |
| **SystemStatusPanel** | `src/components/SystemStatusPanel.tsx` | Shows device online/offline status with animated dot, last update time (relative), WiFi signal strength with quality label, uptime formatted as days/hours/minutes, and firmware version. |
| **AppSidebar** | `src/components/AppSidebar.tsx` | Collapsible sidebar navigation with AirGuard Pro branding, five nav items (Dashboard, Data Logs, Control, System Design, Settings), user info display, logout button, and collapse toggle. |
| **SidebarNavItem** | `src/components/SidebarNavItem.tsx` | Individual sidebar navigation link using React Router's `NavLink` with active state styling (accent background + primary left border). Respects sidebar collapsed state. |
| **DashboardLayout** | `src/components/DashboardLayout.tsx` | Wrapper component providing the sidebar + main content area layout. Used by all authenticated pages. |
| **NavLink** | `src/components/NavLink.tsx` | A forwarded-ref wrapper around React Router's `NavLink` with `className`, `activeClassName`, and `pendingClassName` support via the `cn` utility. |

### shadcn/ui Components

The project includes a full set of shadcn/ui components in `src/components/ui/`, including but not limited to: `AlertDialog`, `Button`, `Card`, `Switch`, `Slider`, `Tabs`, `Table`, `Toast`, `Tooltip`, `Dialog`, `Select`, `Badge`, `Checkbox`, `Progress`, `ScrollArea`, `Sheet`, `Skeleton`, and `Separator`.

---

## UI/UX Structure

### Layout

```
┌──────────────────────────────────────────────────┐
│  AppSidebar (collapsible, 60px / 240px)          │
│  ┌────────────────────────────────────────────┐  │
│  │  Brand Header (Shield icon + "AirGuard")   │  │
│  │  Navigation Items (5 links)                │  │
│  │  User Info + Role Badge                    │  │
│  │  Logout Button                             │  │
│  │  Collapse Toggle                           │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Main Content Area (flex-1, scrollable)          │
│  ┌────────────────────────────────────────────┐  │
│  │  Page Header (title + subtitle)            │  │
│  │  Page Content (max-width 7xl, centered)    │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### Navigation Flow

1. **Unauthenticated** → Login Page (`/`)
2. **Login** → redirects to `/dashboard`
3. **Sidebar navigation** → Dashboard, Data Logs, Control, System Design, Settings
4. **Logout** → clears auth state, redirects to `/`
5. **Unknown routes** → Not Found page

### Design Patterns

- **Dark industrial theme**: Deep blue-gray backgrounds (`220 20% 10%`), teal accents (`174 72% 46%`), JetBrains Mono for data values
- **Custom CSS component classes**: `.sensor-card`, `.panel`, `.status-badge`, `.status-normal`, `.status-warning`, `.status-critical` defined in `index.css`
- **CSS custom properties**: Full design token system with HSL color values, custom gradients, shadows, and font stacks
- **Framer Motion**: Entrance animations on sensor cards (`opacity: 0, y: 12` → `opacity: 1, y: 0`)
- **Responsive grid**: Dashboard uses `grid-cols-1 lg:grid-cols-4` for cards, `grid-cols-1 lg:grid-cols-3` for chart/status layout

---

## Data Flow & Architecture

### Data Flow Diagram

```
┌─────────────┐     HTTP POST      ┌──────────────┐     API Call      ┌─────────────┐
│   ESP32      │ ──────────────────▶│  Backend     │◀────────────────▶│  Frontend   │
│   Device     │     /api/device/   │  Server      │  /api/readings/  │  Dashboard  │
│              │     readings       │  (future)    │  latest          │             │
│              │◀──────────────────│              │                  │             │
│              │  GET /api/device/  │              │                  │             │
│              │  command/:id       │              │                  │             │
└─────────────┘                    └──────────────┘                  └─────────────┘
```

### Current Data Flow (Mock)

1. `useLiveData` hook initializes with `mockLatestReading` from `src/data/mockData.ts`
2. Every 5 seconds, timestamps are updated to simulate connectivity (values remain static)
3. Historical logs are generated once via `generateHistoricalReadings(100)` with randomized CO₂ values
4. All API calls in `src/services/api.ts` return mock data after simulated delays

### API Service Layer (`src/services/api.ts`)

| Method | Purpose | Status |
|---|---|---|
| `getLatestReading()` | Fetch latest sensor data | Mock (returns `mockLatestReading`) |
| `getHistoricalReadings(count)` | Fetch historical log entries | Mock (generates random readings) |
| `clearLogs()` | Delete all stored log entries | Mock (logs to console) |
| `getSystemStatus()` | Fetch device health/status | Mock (returns `mockSystemStatus`) |
| `getSettings()` | Fetch system configuration | Mock (returns `mockSettings`) |
| `updateSettings(settings)` | Save system configuration | Mock (logs to console) |
| `sendControlCommand(command)` | Send fan/damper command | Mock (logs to console) |
| `login(username, password)` | Authenticate user | Mock (matches against hardcoded users) |
| `postDeviceReading(payload)` | ESP32 sends sensor data | Placeholder |
| `postDeviceHeartbeat(payload)` | ESP32 sends heartbeat | Placeholder |
| `getDeviceCommand(deviceId)` | ESP32 polls for commands | Placeholder |

### ESP32 Integration Points

When connecting a real ESP32 device, replace the mock implementations in `api.ts` with actual `fetch()` calls. The expected payloads are:

**Reading Payload** (`POST /api/device/readings`):
```json
{
  "deviceId": "esp32-room-01",
  "apiKey": "DEVICE_API_KEY",
  "indoorCO2": 687,
  "outdoorCO2": 412,
  "fanStatus": "ON",
  "damperAngle": 45,
  "ventilationStatus": "ACTIVE",
  "controlMode": "AUTO",
  "timestamp": "2026-03-29T10:30:00Z"
}
```

**Heartbeat Payload** (`POST /api/device/heartbeat`):
```json
{
  "deviceId": "esp32-room-01",
  "apiKey": "DEVICE_API_KEY",
  "uptime": 172800,
  "wifiSignal": -42,
  "firmwareVersion": "v2.1.4"
}
```

**Command Response** (`GET /api/device/command/:deviceId`):
```json
{
  "controlMode": "MANUAL",
  "fanStatus": "ON",
  "damperAngle": 60,
  "updatedAt": "2026-03-29T10:35:00Z"
}
```

---

## State Management

### AuthContext (`src/context/AuthContext.tsx`)

- **Purpose**: Manages user authentication state across the application
- **State**: `user: User | null`
- **Actions**: `login(user)`, `logout()`
- **Derived**: `isAuthenticated: boolean`
- **Scope**: Wraps the entire application in `App.tsx`
- **Persistence**: None — state is lost on page refresh (intentional for demo)

### Component-Level State

| Location | State | Purpose |
|---|---|---|
| `useLiveData` hook | `latest`, `status` | Current sensor reading and system status, updated via interval |
| `DashboardPage` | `history` | Historical readings for the CO₂ chart (generated once on mount) |
| `DataLogsPage` | `logs`, `showClearConfirm` | Log entries and clear confirmation dialog visibility |
| `ControlPage` | `mode`, `fanOn`, `damperAngle`, `showConfirm`, `applying`, `applied` | Control form state and UI feedback |
| `SettingsPage` | `settings`, `saving`, `saved`, `errors` | Settings form values, save state, and validation errors |
| `LogsTable` | `search`, `page` | Search filter text and current pagination page |
| `AppSidebar` | `collapsed` | Sidebar collapse state |

### React Query

`@tanstack/react-query` is installed and configured with a `QueryClient` in `App.tsx` but is **not actively used** for data fetching in the current implementation. It is available for future use when real API endpoints are connected.

---

## Project Structure

```
src/
├── components/               # Reusable UI components
│   ├── ui/                   # shadcn/ui primitives (AlertDialog, Button, Card, etc.)
│   ├── AlertsPanel.tsx       # Alert list with severity levels and timestamps
│   ├── AppSidebar.tsx        # Collapsible sidebar navigation
│   ├── CO2Chart.tsx          # Recharts line chart for CO₂ trends
│   ├── DashboardLayout.tsx   # Sidebar + main content layout wrapper
│   ├── LogsTable.tsx         # Paginated, searchable data table
│   ├── NavLink.tsx           # React Router NavLink wrapper with className support
│   ├── SensorCard.tsx        # Metric display card with status and animations
│   ├── SidebarNavItem.tsx    # Individual sidebar nav link with active state
│   └── SystemStatusPanel.tsx # Device health and connectivity display
├── context/
│   └── AuthContext.tsx       # Authentication state (user, login, logout)
├── data/
│   └── mockData.ts           # Mock sensor readings, alerts, settings, users
├── hooks/
│   ├── use-mobile.tsx        # Mobile viewport detection hook
│   ├── use-toast.ts          # Toast notification hook (shadcn)
│   └── useLiveData.ts       # Simulated real-time data polling hook
├── lib/
│   └── utils.ts              # Utility functions (cn for className merging)
├── pages/
│   ├── ControlPage.tsx       # Ventilation control panel (AUTO/MANUAL, fan, damper)
│   ├── DashboardPage.tsx     # Main monitoring dashboard
│   ├── DataLogsPage.tsx      # Historical sensor logs with clear functionality
│   ├── Index.tsx             # Unused index page
│   ├── LoginPage.tsx         # Authentication form
│   ├── NotFound.tsx          # 404 fallback page
│   ├── SettingsPage.tsx      # System configuration form
│   └── SystemDesignPage.tsx  # Software flow and control logic documentation
├── services/
│   └── api.ts                # API service layer (mock implementations + ESP32 placeholders)
├── test/
│   ├── example.test.ts       # Example test file
│   └── setup.ts              # Test setup configuration
├── types/
│   └── sensor.ts             # TypeScript interfaces (SensorReading, ControlCommand, etc.)
├── App.css                   # Additional app styles
├── App.tsx                   # Root component with routing and providers
├── index.css                 # Global styles, design tokens, component classes
├── main.tsx                  # Application entry point
└── vite-env.d.ts             # Vite type declarations
```

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI library |
| TypeScript | 5.8 | Type safety |
| Vite | 5.4 | Build tool and dev server |
| Tailwind CSS | 3.4 | Utility-first CSS framework |
| React Router | 6.30 | Client-side routing |

### UI Libraries

| Library | Purpose |
|---|---|
| shadcn/ui + Radix UI | Accessible, unstyled UI primitives (AlertDialog, Switch, Slider, Tabs, etc.) |
| Lucide React | Icon library (Shield, Wind, Fan, Gauge, etc.) |
| Framer Motion | Entrance animations on sensor cards |
| Recharts | CO₂ trend line chart |

### Utilities

| Library | Purpose |
|---|---|
| class-variance-authority | Component variant management |
| clsx + tailwind-merge | Conditional className merging (`cn` utility) |
| date-fns | Date formatting utilities |
| zod | Schema validation (available, not yet used) |
| React Hook Form | Form management (available, not yet used) |

### Development

| Tool | Purpose |
|---|---|
| Vitest | Unit testing framework |
| Playwright | End-to-end testing framework |
| ESLint | Code linting |
| PostCSS + Autoprefixer | CSS processing |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` — login with `admin`, `operator`, or `viewer` (any password).

---

## ESP32 Integration Guide

This project is designed to be connected to an ESP32 microcontroller running CO₂ sensors and ventilation actuators.

### 1. ESP32 Sends Sensor Data

**Endpoint:** `POST /api/device/readings`

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

void sendReading() {
  HTTPClient http;
  http.begin("http://YOUR_SERVER_IP:3001/api/device/readings");
  http.addHeader("Content-Type", "application/json");

  String json = "{\"deviceId\":\"esp32-room-01\",\"apiKey\":\"YOUR_KEY\","
                "\"indoorCO2\":" + String(indoorCO2) + ","
                "\"outdoorCO2\":" + String(outdoorCO2) + ","
                "\"fanStatus\":\"" + (fanOn ? "ON" : "OFF") + "\","
                "\"damperAngle\":" + String(damperAngle) + ","
                "\"ventilationStatus\":\"ACTIVE\","
                "\"controlMode\":\"AUTO\","
                "\"timestamp\":\"" + getISO8601Time() + "\"}";

  int code = http.POST(json);
  http.end();
}
```

### 2. ESP32 Sends Heartbeat

**Endpoint:** `POST /api/device/heartbeat`

```json
{
  "deviceId": "esp32-room-01",
  "apiKey": "DEVICE_API_KEY",
  "uptime": 172800,
  "wifiSignal": -42,
  "firmwareVersion": "v2.1.4"
}
```

### 3. ESP32 Polls for Control Commands

**Endpoint:** `GET /api/device/command/esp32-room-01`

The ESP32 periodically checks for commands and applies them to actuators (relay for fan, servo for damper).

---

## Self-Hosting on Ubuntu Server

### Prerequisites

- Ubuntu 20.04+ server
- Node.js 18+ (`sudo apt install nodejs npm`)

### Deployment

```bash
# Clone and build
git clone https://github.com/your-username/airguard-pro.git
cd airguard-pro
npm install
npm run build

# Serve (Option A: simple static server)
npx serve dist -l 3000

# Serve (Option B: Nginx)
sudo cp -r dist/* /var/www/airguard-pro/
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/airguard-pro;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Current Limitations

| Area | Limitation |
|---|---|
| **Authentication** | Mock-only (no password validation, no session persistence, no token-based auth) |
| **Data persistence** | No database — all data is in-memory and lost on refresh |
| **Real-time updates** | Simulated via `setInterval`; no WebSocket or SSE connection |
| **Backend** | No server exists — all API calls return mock data |
| **ESP32 connection** | Placeholder structure only; no actual HTTP communication |
| **Settings** | Changes are not persisted; reset on page refresh |
| **Control commands** | Logged to console but not sent to any device |
| **Logs** | Generated randomly on page load; not tied to real sensor data |
| **React Query** | Installed but unused — data fetching uses direct state management |
| **Form libraries** | React Hook Form and Zod are installed but not integrated |
| **Testing** | Minimal — only an example test file exists |
| **Mobile responsiveness** | Basic responsive grid; no dedicated mobile navigation |
| **Accessibility** | Relies on Radix UI primitives; custom components lack ARIA attributes |

---

## Future Improvements

### Backend & Data

- [ ] Add Express.js or Fastify backend server for ESP32 communication
- [ ] Integrate PostgreSQL for persistent sensor data storage
- [ ] Implement real JWT-based authentication with password hashing
- [ ] Add WebSocket support for true real-time dashboard updates
- [ ] Implement data retention policies and automatic log cleanup

### UI/UX

- [ ] Add CO₂ threshold reference lines (warning/critical) to the trend chart
- [ ] Implement CSV/Excel export for data logs
- [ ] Add a mobile-friendly hamburger menu for the sidebar
- [ ] Create a dashboard widget for daily/weekly CO₂ averages
- [ ] Add dark/light theme toggle
- [ ] Improve chart interactivity (zoom, date range selection)

### IoT Integration

- [ ] Connect to real ESP32 via HTTP API
- [ ] Add OTA firmware update capability through the dashboard
- [ ] Support multiple device nodes with device selector
- [ ] Add MQTT support as an alternative to HTTP polling
- [ ] Implement device provisioning and API key management

### Performance & Scalability

- [ ] Leverage React Query for data fetching with caching and refetch strategies
- [ ] Add virtualized scrolling for large log datasets
- [ ] Implement service worker for offline dashboard viewing
- [ ] Add error boundaries for graceful failure handling
- [ ] Set up CI/CD pipeline with automated testing

### Security

- [ ] Implement proper server-side authentication
- [ ] Add API key validation for device endpoints
- [ ] Implement HTTPS with Let's Encrypt
- [ ] Add rate limiting for API endpoints
- [ ] Store user roles in a dedicated database table (not client-side)

---

## License

MIT
