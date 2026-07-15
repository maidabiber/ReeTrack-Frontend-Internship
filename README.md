# ReeTrack Frontend

React SPA for **ReeTrack** — a single-tenant time tracking app (still under active development). This repo is the UI. The API lives in [`reetrack-backend`](https://github.com/reeinvent/reetrack-backend).

Visual language and component rules: see [`design.md`](design.md).

---

## Stack

- **React 19** + **TypeScript**
- **Vite 8** (dev server + proxy)
- **React Router 7**
- **Tailwind CSS 4**
- **Vitest** for unit tests

```
frontend/
├── .env.example
├── design.md              # UI / brand contract
├── index.html
├── package.json
├── vite.config.ts         # proxies /api → backend
└── src/
    ├── api/               # HTTP clients
    ├── components/
    ├── context/           # Auth + Timer
    ├── pages/
    ├── router.tsx
    └── config/navigation.ts
```

---

## Prerequisites

- **Node.js** 20+ (LTS recommended) and npm
- Running **ReeTrack API** on `https://localhost:7231` (see backend README)
- Google OAuth configured on the backend for real sign-in

---

## Quick start

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

Defaults are fine for local dev:

```env
VITE_API_BASE_URL=/api
```

Vite only exposes variables prefixed with `VITE_`. With the default `/api` base URL, the Vite proxy forwards to the backend (see below).

### 3. Start the API first

From `reetrack-backend`:

```bash
docker compose --env-file .env -f src/docker-compose.yml up -d
cd src/ReeTrack.Api
dotnet run --launch-profile https
```

Health check: `curl -sk https://localhost:7231/api/health`

### 4. Start the SPA

```bash
npm run dev
```

Open **http://localhost:5173**.

---

## How the SPA talks to the API

[`vite.config.ts`](vite.config.ts) proxies `/api` → `https://localhost:7231` (`secure: false` for the local HTTPS cert).

That means:

- Browser calls stay same-origin (`http://localhost:5173/api/...`)
- Google OAuth redirect URIs can use the SPA origin (e.g. `http://localhost:5173/api/auth/google/callback`) so cookies stay first-party
- The backend `Frontend__Origin` should be `http://localhost:5173`

If you point `VITE_API_BASE_URL` at an absolute URL instead, you become responsible for CORS and cookie `SameSite` behavior yourself.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server (HMR) on port 5173 |
| `npm run build` | Typecheck (`tsc -b`) + production bundle → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest (single run) |
| `npm run test:watch` | Vitest watch mode |

---

## App map

Navigation is defined once in [`src/config/navigation.ts`](src/config/navigation.ts) and drives both the sidebar and the router. Some destinations are still placeholders while screens are built out.

**Insights** and **Admin** nav sections render only for Admin users.

---

## Local development notes

- Keep the API on the **https** launch profile (`7231`) while developing the SPA — that matches the Vite proxy target.
- Sign-in requires a working Google OAuth client on the backend (and matching redirect URIs).
- Design tokens and layout rules live in `design.md` and `src/index.css` — prefer tokens over raw hex in components.
- Row menus and modals are ordinary buttons/dialogs (no special widget library); keep new screens consistent with existing patterns under `src/components/`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| API calls fail / network errors | Confirm API is up on `https://localhost:7231` and proxy target matches |
| Redirected to sign-in unexpectedly | Session cookie missing/expired — complete Google sign-in again |
| CORS errors | You’re probably bypassing the `/api` proxy; use relative `VITE_API_BASE_URL=/api` |
| Blank “Coming soon” pages | Expected for unfinished nav destinations |
| Styles look wrong after pull | Hard-refresh; confirm Tailwind Vite plugin is running via `npm run dev` |

---

## Related

- Backend setup, auth, migrations, and API map: `reetrack-backend` README
- UI contract: [`design.md`](design.md)
