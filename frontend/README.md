# UNTP Publisher (SPA)

Vite + React + TypeScript + Chakra UI. Sign-in: **Get started** reads the JWT from the **clipboard** and validates it with **`GET /publisher/session`** before storing a session (optional manual paste from the error screen). Then **Overview** and **Settings** load the same session.

### Which token?

The portal accepts **either**:

1. **Publisher issuer JWT** — `access_token` from this API’s `POST /auth/token` (`client_id` + `client_secret` in Mongo). Payload uses `client_id` and `expires`, signed with `JWT_SECRET`.

2. **Traction / ACA-Py multitenancy wallet JWT** — the token from the tenant agent (`wallet_id`, `iat`, `exp` in the payload). The publisher does **not** store Traction’s jwt-secret; it probes **`GET {TRACTION_API_URL}/status`** then **`GET {TRACTION_API_URL}/tenant/wallet`** with the same `Authorization: Bearer` until one returns **200** (BC sandbox often validates on `/tenant/wallet` only). The session then uses `wallet_id` as `claims.client_id`. The backend must be able to reach `TRACTION_API_URL`.

## Development

1. Start the API (default `http://127.0.0.1:8000`), for example from `../backend` with `uv run python main.py`.
2. `npm install` then `npm run dev`.
3. The dev server proxies `/api/*` to the backend (see `vite.config.ts`). With no `VITE_API_BASE_URL`, the app uses `/api`.

Optional `.env` in this folder (copy from `.env.example`; repo root `.env` is for the backend):

- `VITE_API_BASE_URL` — override API prefix (e.g. `https://publisher.example` in production). **Must be a browser-reachable HTTPS URL** when the SPA is served over HTTPS (not `http://` and not Railway `*.railway.internal` — those trigger mixed-content blocks). Omit it to use same-origin `/api` (then configure your edge/nginx to reverse-proxy `/api` to the API).
- `VITE_TRACTION_URL` — optional tenant proxy URL for future browser-side Traction calls (CORS must allow your origin).
- `VITE_DEV_PUBLISHER_TOKEN` — **dev only:** any JWT the backend accepts for `/publisher/session` (publisher `/auth/token` **or** Traction wallet token if the API is configured for it). On `npm run dev`, if session storage has no token yet, it is seeded so you can skip clipboard sign-in. **Never** set this when building a production image — Vite inlines `VITE_*` into the bundle. If you seed a **wallet** JWT, the **backend** must have `TRACTION_API_URL` pointing at that tenant proxy (the default `http://localhost` is not enough); otherwise `/publisher/session` returns **403** and the browser console shows “Failed to load resource”.

## Docker (static + nginx)

Build args are **baked into the JS** at image build time (Vite):

```bash
docker build -t untp-publisher-ui -f frontend/Dockerfile frontend/ \
  --build-arg VITE_API_BASE_URL=https://your-api.example.com
```

Optional: `--build-arg VITE_TRACTION_URL=https://your-tenant-proxy.example.com`

Run:

```bash
docker run -p 8080:80 untp-publisher-ui
```

`VITE_API_BASE_URL` should be the **browser-visible** API origin (no trailing slash). If omitted, the bundle defaults to `/api` (same origin), which only works if you reverse-proxy `/api` to the backend behind this nginx.

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — production bundle to `dist/`
- `npm run lint` — ESLint
