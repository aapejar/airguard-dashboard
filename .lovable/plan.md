
# Backend Delivery Plan — `airguard-backend` v1.1.0

The README is the single source of truth. This rebuild produces a standalone Node.js/Express/TypeScript/Prisma/PostgreSQL backend, delivered as `/mnt/documents/airguard-backend.zip`, that implements every endpoint, payload, error code, role rule, and lifecycle behavior documented in the README. The Lovable frontend is **not** modified in this pass — it already targets these contracts via `VITE_API_BASE_URL`.

## Deliverable

A single archive `airguard-backend.zip` containing a fully runnable project: `npm ci && npm run db:migrate && npm run db:seed && npm run create-admin && npm start` brings up a production API on a clean Ubuntu 22.04/24.04 VPS.

## Repository Structure

```text
airguard-backend/
├── prisma/
│   ├── schema.prisma                # All entities (README §15, §18, §19, §20, §22)
│   ├── migrations/
│   │   └── 20260617000000_init/migration.sql
│   └── seed.ts                      # Roles & default settings only — NO demo users
├── src/
│   ├── server.ts                    # bootstrap + graceful shutdown
│   ├── app.ts                       # express assembly, middleware order
│   ├── config.ts                    # env loader + zod validation
│   ├── lib/
│   │   ├── prisma.ts                # singleton client
│   │   ├── logger.ts                # pino structured logger w/ requestId
│   │   ├── errors.ts                # standard error envelope (README §25)
│   │   ├── jwt.ts                   # access + refresh signing/verify, rotation
│   │   ├── password.ts              # argon2id hash/verify
│   │   ├── totp.ts                  # RFC 6238 TOTP (otplib)
│   │   ├── apiKey.ts                # generate, hash, verify device api keys
│   │   ├── audit.ts                 # writeAudit() helper
│   │   ├── lifecycle.ts             # device state machine (Registered/Online/Warning/Offline/Maintenance)
│   │   ├── evaluator.ts             # IF-ELSE supervisor (server-side mirror of §8)
│   │   ├── commandQueue.ts          # per-device queue, serialised, in-flight lock
│   │   └── csv.ts                   # streaming CSV export
│   ├── middleware/
│   │   ├── requestId.ts             # injects req.id, sets header
│   │   ├── auth.ts                  # bearer JWT verify, attaches req.user
│   │   ├── rbac.ts                  # requireRole('admin'|'operator'|'user')
│   │   ├── deviceAuth.ts            # apiKey body validation
│   │   ├── rateLimit.ts             # express-rate-limit per route group
│   │   ├── validate.ts              # zod schema gate -> 400 INVALID_PAYLOAD
│   │   └── error.ts                 # final error → §25 envelope
│   ├── schemas/                     # zod request/response schemas mirroring §13
│   │   ├── auth.ts
│   │   ├── device.ts
│   │   ├── reading.ts
│   │   ├── command.ts
│   │   ├── settings.ts
│   │   └── user.ts
│   ├── routes/
│   │   ├── auth.ts                  # /login /2fa/verify /logout /refresh
│   │   ├── users.ts                 # admin user CRUD, 2FA toggle, password reset
│   │   ├── devices.ts               # admin device CRUD + frontend telemetry routes
│   │   ├── deviceIngest.ts          # ESP32 routes (readings/heartbeat/command/config)
│   │   ├── control.ts               # POST /api/devices/:id/control
│   │   ├── settings.ts              # GET/PUT /api/devices/:id/settings
│   │   ├── alerts.ts                # list/ack
│   │   ├── audit.ts                 # list + CSV export
│   │   ├── exports.ts               # readings/audit/config/settings export & restore
│   │   └── health.ts                # GET /api/health (admin)
│   ├── jobs/
│   │   ├── heartbeatWatchdog.ts     # every 2s: flip devices Online↔Offline, emit alerts
│   │   ├── retention.ts             # nightly downsample + prune (README §22)
│   │   └── index.ts                 # job scheduler
│   └── scripts/
│       ├── create-admin.ts          # one-off admin provisioning (prompted)
│       ├── create-device.ts         # provisions device + prints apiKey ONCE
│       ├── rotate-device-key.ts
│       └── pg-backup.sh             # pg_dump rotation helper
├── deployment/
│   ├── nginx/airguard.conf          # reverse proxy (README §17)
│   ├── pm2/ecosystem.config.cjs     # API + jobs processes
│   ├── systemd/airguard-api.service # alternative to pm2
│   └── cron/airguard-backup        # daily pg_dump + retention
├── docs/
│   ├── API.md                       # generated from zod schemas, mirrors README §13
│   ├── UBUNTU-DEPLOYMENT.md         # step-by-step VPS bring-up
│   ├── ESP32.md                     # firmware quickref (§14 + §24)
│   ├── SECURITY.md                  # JWT/2FA/argon2/rate-limit/headers
│   ├── BACKUP-RESTORE.md            # pg_dump + restore endpoints
│   ├── RUNBOOK.md                   # ops incidents & playbook
│   └── CHANGELOG.md                 # mirrors README §27 entries for backend
├── tests/                           # vitest + supertest smoke tests
│   ├── auth.spec.ts
│   ├── deviceIngest.spec.ts
│   ├── control.spec.ts
│   └── rbac.spec.ts
├── Dockerfile                       # multi-stage build, distroless runtime
├── docker-compose.yml               # api + postgres + nginx
├── .env.example                     # all README §23 vars
├── .gitignore
├── .dockerignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md                        # backend-local README pointing to root README
```

## Database (Prisma) — mirrors README §15, §19, §22

Models:

- `User { id, username UQ, passwordHash, role enum(admin|operator|user), status enum(active|disabled), twoFactorEnabled, twoFactorSecret?, lastLogin, createdAt, updatedAt }`
- `RefreshToken { id, userId FK, tokenHash UQ, expiresAt, revokedAt }` — refresh rotation
- `Device { id, deviceId UQ, displayName, location, firmwareVersion, apiKeyHash, status enum(registered|online|warning|offline|maintenance), lastSeen, createdAt, updatedAt }`
- `DeviceSettings { id, deviceId UQ FK, co2WarningThreshold, co2CriticalThreshold, refreshInterval, deviceName, location, deviceEndpoint, safeThreshold, moderateThreshold, highThreshold, minOutdoorDelta, hysteresis, sampleIntervalMs, heartbeatIntervalMs, updatedAt }`
- `Reading { id, deviceId FK, indoorCO2, outdoorCO2, fanStatus, damperAngle, ventilationStatus, controlMode, timestamp, createdAt }` — index `(deviceId, timestamp DESC)`; partitioning hint in migration SQL
- `Heartbeat { id, deviceId FK, uptime, wifiSignal, firmwareVersion, receivedAt }`
- `DeviceCommand { id, deviceId FK, controlMode, fanStatus, damperAngle, issuedBy FK→User, status enum(pending|delivered|applied|failed), issuedAt, deliveredAt?, appliedAt?, error? }`
- `Alert { id, deviceId? FK, level enum(info|warning|critical|emergency), source enum(system|device|user|auth), message, details Json, acknowledged, acknowledgedBy?, acknowledgedAt?, createdAt }`
- `AuditLog { id, level, source, actor?, message, details Json, requestId, createdAt }` — append-only

All `CREATE TABLE` migrations include `GRANT` to a dedicated `airguard` role (no Supabase here — direct Postgres role).

## API Surface (every endpoint from README §13 + Sections 15, 16, 20, 21)

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| POST | `/api/auth/login` | none | any | issues access + refresh; triggers lockout per §6 |
| POST | `/api/auth/2fa/verify` | challenge | any | admins required |
| POST | `/api/auth/refresh` | refresh | any | rotates refresh token, revokes old |
| POST | `/api/auth/logout` | bearer | any | revokes refresh |
| GET/POST/PATCH/DELETE | `/api/users` | bearer | admin | CRUD, 2FA toggle, reset password |
| GET/POST/PATCH/DELETE | `/api/devices` | bearer | admin | provisioning, returns apiKey once on create |
| GET | `/api/devices/:id/readings/latest` | bearer | any | 204 if no telemetry |
| GET | `/api/devices/:id/readings?limit` | bearer | any | newest→oldest |
| DELETE | `/api/devices/:id/readings` | bearer | admin | clears logs |
| GET | `/api/devices/:id/status` | bearer | any | computes deviceOnline from heartbeat age |
| GET/PUT | `/api/devices/:id/settings` | bearer | any/admin | PUT requires admin |
| POST | `/api/devices/:id/control` | bearer | admin\|operator | enqueues command, 409 if in flight |
| POST | `/api/device/readings` | apiKey | device | mirrors §14 exactly |
| POST | `/api/device/heartbeat` | apiKey | device | updates `lastSeen`, triggers Online transition |
| GET | `/api/device/:id/command` | apiKey | device | pops latest pending command, marks `delivered` |
| GET | `/api/device/:id/config` | apiKey | device | returns supervisor thresholds + intervals |
| GET/POST | `/api/alerts`, `/api/alerts/:id/ack` | bearer | any/admin\|operator | list + acknowledge |
| GET | `/api/audit` | bearer | admin | filter by source/level/from/to |
| GET | `/api/audit/export` | bearer | admin | streamed CSV |
| GET | `/api/devices/:id/readings/export` | bearer | operator+ | streamed CSV |
| GET/POST | `/api/config/export`, `/api/settings/backup`, `/api/settings/restore` | bearer | admin | restore requires `X-Confirm: true` + 2FA re-prompt |
| GET | `/api/health` | none/bearer | mixed | `api`, `database`, `devices[]`, `uptimeSec`, `version` |

Every endpoint emits an AuditLog row for privileged actions per §10. Every error response uses the §25 envelope, populated with `requestId`. Rate limits applied to `/api/auth/*` (10/min/IP), device routes (60/min/deviceId), control (10/min/user).

## Security & Operational Behaviors

- **Passwords:** argon2id, params `m=64MB, t=3, p=1`.
- **JWT:** RS256-capable, default HS256 with `JWT_SECRET`; access TTL `JWT_TTL` (default 15m), refresh TTL 30d, refresh hashed (SHA-256) and rotated on use.
- **2FA:** RFC 6238 TOTP via `otplib`; admin login required; secret enrolled via `/api/users/me/2fa/setup` returning otpauth URL.
- **Device apiKey:** generated `airg_<32-byte b64url>`, hashed argon2id at rest, returned only at creation/rotation.
- **Helmet, CORS** (`FRONTEND_URL` only), **express-rate-limit**, **express-validator/zod**, structured `pino` logs with `requestId`.
- **Heartbeat watchdog:** internal interval (every 2s) flips devices to `offline` when `now - lastSeen > HEARTBEAT_TIMEOUT`, emits a CRITICAL `Alert` and AuditLog entry exactly once per transition (per §19).
- **Command queue:** per-device serialisation via a `pending` row + advisory lock; `POST /control` returns 409 `COMMAND_IN_FLIGHT` if a `pending` command exists; ESP32 GET marks it `delivered`; next reading echo marks it `applied`.
- **Retention job:** nightly cron-style scheduler implements §22 (downsample readings older than 30d, prune at 1y, archive audit yearly).
- **Fail-safe contracts:** device-side fail-safe documented in `docs/ESP32.md`; backend never auto-issues unsafe commands.

## Compatibility Guarantees

- All ESP32 field names (`deviceId`, `apiKey`, `indoorCO2`, `outdoorCO2`, `fanStatus`, `damperAngle`, `ventilationStatus`, `controlMode`, `firmwareVersion`, `wifiSignal`, `uptime`, `timestamp`) are byte-for-byte identical to README §14 — enforced by zod schemas in `schemas/`.
- All frontend types in `src/types/sensor.ts` remain compatible — no rename, no removal.
- All error codes in README §25 are present in `lib/errors.ts` as a typed enum.

## DevOps

- **Dockerfile:** multi-stage (deps → build → runtime), runs as non-root `node` user, healthcheck `GET /api/health`.
- **docker-compose.yml:** services `postgres:16-alpine`, `api` (this), `nginx` reverse proxy; named volumes for DB and backups.
- **deployment/nginx/airguard.conf:** matches README §17, terminates TLS, proxies `/api/` to API, serves frontend `dist/`.
- **PM2 + systemd** alternates; both keep API + watchdog + retention scheduler alive.
- **`.env.example`** covers every variable in README §23.

## README Synchronization

The root `README.md` is updated in the same delivery with a **§27 Changelog entry `1.2.0 — Backend production delivery`** listing every new endpoint (`/api/auth/refresh`, `/api/alerts*`, `/api/audit*`, `/api/devices/:id/readings/export`, `/api/config/export`, `/api/settings/backup`, `/api/settings/restore`, `/api/health`, `/api/users/me/2fa/setup`), every new env var (`JWT_REFRESH_TTL`, `ARGON2_*`, `BACKUP_DIR`, `RATE_LIMIT_*`), and every new lifecycle/alert behavior implemented server-side. The frontend stays unchanged.

## Verification Steps (run before zipping)

1. `npm ci && npx prisma generate` in a scratch dir from the produced source.
2. `npx tsc --noEmit` — strict compile must pass.
3. `npm run test` — vitest smoke tests for auth, RBAC, deviceIngest, control queue.
4. `docker compose config` — compose file lint.
5. Zip contents listed back to confirm structure matches this plan.

## What This Plan Excludes (explicit)

- No frontend code changes — the existing React app already calls `VITE_API_BASE_URL`.
- No Lovable Cloud / Supabase usage — pure self-hosted Postgres.
- No demo users, mock telemetry, or seed devices — only the `admin` role and default `DeviceSettings` template are seeded.
- No email/SMS notification implementation (CRITICAL/EMERGENCY auto-notify is documented as future per README §20).

Approve this plan and I will produce the full archive plus the README changelog update in the next message.
