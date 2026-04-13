# UNTP Publisher (SPA)

Vite + React + TypeScript + Chakra UI. Sign-in: **Get started** reads the JWT from the **clipboard** and validates it with **`GET /publisher/session`** before storing a session (optional manual paste from the error screen). Then **Overview** and **Settings** load the same session.

### Which token?

Sign-in expects the **`access_token` from this publisher API’s** `POST /auth/token` (issuer `client_id` + `client_secret` stored in the publisher’s MongoDB). That JWT is signed with this service’s `JWT_SECRET` and includes `client_id` / `expires`.

**Not supported:** Traction or ACA-Py “agent” / tenant / wallet tokens (e.g. from the agent with a tenant id). Those are minted by Traction with different keys. Using them against `GET /publisher/session` will return **403** — you must use `POST {API}/auth/token` on the UNTP Publisher service first, then use the returned `access_token` in the portal.

## Development

1. Start the API (default `http://127.0.0.1:8000`), for example from `../backend` with `uv run python main.py`.
2. `npm install` then `npm run dev`.
3. The dev server proxies `/api/*` to the backend (see `vite.config.ts`). With no `VITE_API_BASE_URL`, the app uses `/api`.

Optional `.env` in this folder (copy from `.env.example`; repo root `.env` is for the backend):

- `VITE_API_BASE_URL` — override API prefix (e.g. `https://publisher.example` in production). **Must be a browser-reachable HTTPS URL** when the SPA is served over HTTPS (not `http://` and not Railway `*.railway.internal` — those trigger mixed-content blocks). Omit it to use same-origin `/api` (then configure your edge/nginx to reverse-proxy `/api` to the API).
- `VITE_TRACTION_URL` — optional tenant proxy URL for future browser-side Traction calls (CORS must allow your origin).
- `VITE_DEV_PUBLISHER_TOKEN` — **dev only:** `access_token` from `POST /auth/token` (see **Which token?** above), not a Traction agent token. On `npm run dev`, if session storage has no token yet, it is seeded so you can skip clipboard sign-in. **Never** set this when building a production image — Vite inlines `VITE_*` into the bundle.

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
