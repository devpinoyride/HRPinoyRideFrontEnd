# Pinoy Ride HR Frontend — React 18 + Vite SPA

The HR timekeeping portal UI. A separate service that calls the C# API
(`PinoyRideHrApi`) over HTTP with a **Bearer token**.

## Pages

| Page | Route | Access |
|---|---|---|
| Login | `/login` | everyone |
| Dashboard (clock in/out, today + week) | `/` | any authenticated user |
| My Requests (create + list) | `/requests` | any authenticated user |
| Approvals (pending, approve/reject) | `/approvals` | approver, hr_admin |
| Reports (summary + CSV export) | `/reports` | approver, hr_admin |
| Staff management | `/staff` | hr_admin |

## Run locally

```powershell
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` + `/auth` to
the deployed API at `https://hrpinoyridebackend.onrender.com` (Render). The
first request after the API sleeps may take up to a minute while the free-tier
service wakes up.

To use a backend running on your machine instead, point the proxy at it:

```powershell
$env:API_PROXY_TARGET = 'http://localhost:5000'
npm run dev
```

Alternatively, set `VITE_API_URL` to have the browser call the API directly
(requires the API's CORS policy to allow `http://localhost:5173`).

## Production build

```powershell
npm run build     # outputs to dist/
npm run preview   # serve the production bundle locally
```

When deploying, set `VITE_API_URL` (e.g. your Render API URL) at build time or
serve the SPA from the same origin as a reverse proxy in front of the API.

## Environment variables

- `VITE_API_URL` — base URL of the `PinoyRideHrApi`. Empty = same origin (dev proxy).
- `API_PROXY_TARGET` — (config-time, Node env var) target the Vite dev proxy
  forwards `/api` and `/auth` to. Defaults to `https://hrpinoyridebackend.onrender.com`.