# Orgbook Publisher (SPA)

Vite + React + TypeScript + Chakra UI. Authenticates against the FastAPI publisher (`/auth/token` or paste JWT), then loads **Overview** and **Settings** via `GET /publisher/session`.

## Development

1. Start the API (default `http://127.0.0.1:8000`), for example from `../backend` with `uv run python main.py`.
2. `npm install` then `npm run dev`.
3. The dev server proxies `/api/*` to the backend (see `vite.config.ts`). With no `VITE_API_BASE_URL`, the app uses `/api`.

Optional `.env`:

- `VITE_API_BASE_URL` — override API prefix (e.g. `https://publisher.example` in production).
- `VITE_TRACTION_URL` — optional tenant proxy URL for future browser-side Traction calls (CORS must allow your origin).

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — production bundle to `dist/`
- `npm run lint` — ESLint
