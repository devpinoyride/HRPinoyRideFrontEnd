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
`http://localhost:5000` (start the backend there first, or change the target in
`vite.config.js`). If your backend is bound to a different port, either adjust the
proxy target or set `VITE_API_URL` when running the SPA.

## Production build

```powershell
npm run build     # outputs to dist/
npm run preview   # serve the production bundle locally
```

When deploying, set `VITE_API_URL` (e.g. your Render API URL) at build time or
serve the SPA from the same origin as a reverse proxy in front of the API.

## Environment variables

- `VITE_API_URL` — base URL of the `PinoyRideHrApi`. Empty = same origin (dev proxy).