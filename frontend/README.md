# UNTP Publisher (SPA)

Vite + React + TypeScript + Chakra UI. Sign-in: **Get started** reads the JWT from the **clipboard** and validates it with **`GET /publisher/session`** before storing a session (optional manual paste from the error screen). Then **Overview** and **Settings** load the same session.

## Development

1. Start the API (default `http://127.0.0.1:8000`), for example from `../backend` with `uv run python main.py`.
2. `npm install` then `npm run dev`.
3. The dev server proxies `/api/*` to the backend (see `vite.config.ts`). With no `VITE_API_BASE_URL`, the app uses `/api`.

Optional `.env`:

- `VITE_API_BASE_URL` — override API prefix (e.g. `https://publisher.example` in production).
- `VITE_TRACTION_URL` — optional tenant proxy URL for future browser-side Traction calls (CORS must allow your origin).

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
