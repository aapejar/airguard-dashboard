# AirGuard Pro

**Smart Air Quality Monitoring and Ventilation Control**

A professional industrial IoT dashboard for monitoring indoor air quality and controlling ventilation systems. Built as a mechatronics final project with future ESP32 hardware integration in mind.

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` — login with `admin`, `operator`, or `viewer` (any password).

---

## Project Structure

```
src/
├── components/       # Reusable UI components (SensorCard, CO2Chart, LogsTable, etc.)
├── context/          # React context (AuthContext for role-based access)
├── data/             # Mock data generators
├── pages/            # Page components (Dashboard, Control, Settings, DataLogs, Login)
├── services/         # API service layer (placeholder for real backend)
└── types/            # TypeScript interfaces (SensorReading, ControlCommand, etc.)
```

---

## ESP32 Integration Guide

This project is designed to be connected to an ESP32 microcontroller running CO₂ sensors and ventilation actuators. Below is how the integration works.

### 1. ESP32 Sends Sensor Data

The ESP32 sends readings to your server via HTTP POST:

**Endpoint:** `POST /api/device/readings`

```json
{
  "deviceId": "esp32-room-01",
  "apiKey": "DEVICE_API_KEY",
  "indoorCO2": 687,
  "outdoorCO2": 412,
  "tvoc": 120,
  "fanStatus": "ON",
  "damperAngle": 45,
  "ventilationStatus": "ACTIVE",
  "controlMode": "AUTO",
  "timestamp": "2026-03-29T10:30:00Z"
}
```

**Arduino sketch example:**

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
                "\"tvoc\":" + String(tvoc) + ","
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

The ESP32 periodically checks for new commands from the web dashboard:

**Endpoint:** `GET /api/device/command/esp32-room-01`

**Response:**

```json
{
  "controlMode": "MANUAL",
  "fanStatus": "ON",
  "damperAngle": 60,
  "updatedAt": "2026-03-29T10:35:00Z"
}
```

The ESP32 applies the received command to its actuators (relay for fan, servo for damper).

---

## Self-Hosting on Ubuntu Server

### Prerequisites

- Ubuntu 20.04+ server
- Node.js 18+ (`sudo apt install nodejs npm`)
- (Optional) PostgreSQL for persistent storage
- (Optional) Nginx as reverse proxy

### Deployment Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-username/airguard-pro.git
cd airguard-pro

# 2. Install dependencies
npm install

# 3. Build for production
npm run build

# 4. Serve the built files
# Option A: Use a simple static server
npx serve dist -l 3000

# Option B: Use Nginx (recommended)
sudo cp -r dist/* /var/www/airguard-pro/
```

### Nginx Configuration (Optional)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/airguard-pro;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to your backend server
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Adding a Backend Server (Future)

When ready to connect real ESP32 devices, create a simple Express.js backend:

```bash
npm install express cors
```

```js
// server.js — minimal example
const express = require('express');
const app = express();
app.use(express.json());

let latestReading = {};
let latestCommand = { controlMode: 'AUTO', fanStatus: 'OFF', damperAngle: 0 };

// ESP32 sends sensor data here
app.post('/api/device/readings', (req, res) => {
  latestReading = { ...req.body, receivedAt: new Date().toISOString() };
  console.log('Reading:', latestReading);
  res.json({ success: true });
});

// ESP32 sends heartbeat here
app.post('/api/device/heartbeat', (req, res) => {
  console.log('Heartbeat:', req.body);
  res.json({ success: true });
});

// ESP32 polls for commands here
app.get('/api/device/command/:deviceId', (req, res) => {
  res.json({ ...latestCommand, updatedAt: new Date().toISOString() });
});

// Frontend fetches latest reading
app.get('/api/readings/latest', (req, res) => {
  res.json(latestReading);
});

app.listen(3001, () => console.log('Backend running on port 3001'));
```

Run with: `node server.js`

---

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Charts:** Recharts
- **UI Components:** shadcn/ui + Radix UI
- **Future Backend:** Express.js + PostgreSQL (planned)
- **Hardware:** ESP32 + MH-Z19B (CO₂) + SGP30 (TVOC) + Relay + Servo

## License

MIT
