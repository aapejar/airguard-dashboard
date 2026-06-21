# AirGuard Pro — Final Production Completion & Audit

The frontend UI will not be touched visually. Only wiring changes are allowed, and only where a real backend contract requires it. The previously delivered `airguard-backend` will be re-emitted as a fresh `airguard-backend.zip` with every gap closed against the README, and the root `README.md` will be updated to reflect the final state.

## 1. Frontend integration audit (no UI changes)

Pure wiring sweep — no Tailwind, layout, routing, or component-tree edits.

- Grep every `src/**` file for residual mock/demo logic, hardcoded users, fake telemetry, simulated generators, dev bypasses. Anything found is deleted or replaced with a real API call.
- Verify `src/services/api.ts`, `src/services/authService.ts`, `src/services/tokenStore.ts`, `src/services/validators.ts` match the documented contracts (paths, payload shapes, envelope error format).
- Verify `useLiveData`, `DeviceContext`, `AuthContext`, `RuntimeSnapshot`, `SystemStatusPanel`, `ControlPage`, `DashboardPage`, `SettingsPage`, `UsersPage`, `AuditLogPage`, `DataLogsPage` consume only real backend responses and render the existing "Waiting for device data…" empty states when telemetry is absent.
- Confirm `VITE_API_BASE_URL` is the only environment input and `.env.example` reflects it.
- No visual diff. Build must pass with the same component tree.

## 2. Backend completion (`airguard-backend.zip` rebuild)

Standalone Express + TypeScript + Prisma + PostgreSQL project. Re-delivered as a single zip — does not run inside Lovable preview.

### Endpoints — every README route verified and implemented

Auth: `POST /api/auth/login`, `/logout`, `/refresh`, `/2fa/verify`, `GET /api/auth/me`.
Users: `GET/POST /api/users`, `DELETE /api/users/:id`, `PATCH /api/users/:id/{role,status,2fa}`, `POST /api/users/:id/reset-password`.
Devices: `GET/POST /api/devices`, `PATCH/DELETE /api/devices/:id`, `POST /api/devices/:id/rotate-key`.
Telemetry (UI): `GET /api/devices/:id/readings`, `/readings/latest`, `DELETE /api/devices/:id/readings`, `GET /api/devices/:id/status`, `GET/PUT /api/devices/:id/settings`, `POST /api/devices/:id/control`.
Device (ESP32): `POST /api/device/readings`, `POST /api/device/heartbeat`, `GET /api/device/:id/command`.
Audit: `GET /api/audit-logs` with filters and pagination.

### Cross-cutting requirements

- JWT HS256 access tokens, SHA-256-hashed refresh tokens with rotation and revocation, 2FA via TOTP (otplib), Argon2id for passwords and device API keys.
- Zod request validation on every route; standardized error envelope `{ error: { code, message, details? } }` with the README §25 code set.
- Helmet, CORS allowlist, per-route rate limits (auth 10/min/IP, device telemetry 60/min/deviceId, control 10/min/user), account lockout after N failed logins.
- RBAC middleware enforces `admin | operator | user` server-side on every route per the README permission matrix.
- Device authentication via `apiKey` (hashed at rest, presented in request body for `/api/device/*`).
- Supervisory control evaluator implementing the exact IF-ELSE rules from README §11 (indoor threshold tiers, outdoor advantage gate, level 0–3 mapping, damper angle, fan state), persisted to `DeviceCommand` and surfaced via `/api/device/:id/command`.
- Heartbeat watchdog (2 s) transitions `online → warning → offline`; retention job downsamples readings >30 d and prunes per README §22.
- Audit log writes on every privileged mutation (auth events, user CRUD, role/status/2FA changes, device CRUD, control commands, settings updates).

### Prisma schema audit

Models: `User`, `RefreshToken`, `Device`, `DeviceSettings`, `Reading`, `Heartbeat`, `DeviceCommand`, `Alert`, `AuditLog`. Foreign keys with `onDelete: Cascade` where appropriate, unique constraints on `(user.username)`, `(device.deviceId)`, `(refreshToken.tokenHash)`, composite index `(deviceId, timestamp DESC)` on `Reading`, indexes on `auditLog.createdAt` and `auditLog.actorId`. Migrations regenerated from a clean baseline.

### DevOps

Multi-stage `Dockerfile`, `docker-compose.yml` (api + postgres:16-alpine + nginx), Nginx reverse-proxy config, PM2 ecosystem, systemd unit, `pg_dump` backup script with 30d/12w/5y rotation, restore runbook.

### CLI

`npm run create-admin`, `npm run create-device`, `npm run rotate-device-key`. No seed users, no demo devices.

## 3. README sync

Update `README.md` to remain the single source of truth:

- Refresh API reference to match shipped routes exactly.
- Expand RBAC section with full permission matrix table.
- Document device lifecycle states and watchdog timings.
- Confirm ESP32 payload field names byte-for-byte.
- Refresh deployment section (Ubuntu 22.04, Prisma migrate deploy, PM2, Nginx, backups/restore).
- Refresh environment variable table.
- Add §27 changelog entry `1.3.0 — Final production audit` listing every backend fix, new endpoint, and frontend wiring change.

## 4. Final audit report (delivered in chat)

After the rebuild, a short report covering: completed features, fixed gaps, added endpoints, schema changes, security hardening, deployment steps, README sections updated.

## Out of scope

- Any visual or structural change to the frontend.
- Lovable Cloud / Supabase (frontend stays a pure SPA hitting `VITE_API_BASE_URL`).
- Email/SMS notifications (README §20 marks these as future).
- Running the backend inside Lovable preview — it is deployed by the user on their Ubuntu VPS.

## Technical notes

- Frontend wiring sweep is read-mostly; expected edits are limited to deletions of dead mock code paths if any are still present.
- Backend zip is regenerated end-to-end rather than patched, so the user receives a clean, internally consistent tree.
- README edits are append/replace within existing sections to avoid churn.
