# UNTP Publisher — Backend

FastAPI backend for the **UNTP Publisher**. See the [repository README](../README.md) for overview and operational docs.

## Setup

```bash
uv sync
```

## Run

```bash
uv run python main.py
# or
uv run uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## Test suite mode (`TEST_SUITE`)

Set **`TEST_SUITE=true`** in the environment to run a **minimal** app: only **`GET /server/status`** and **`POST /test-suite/validate`**. The publisher API (auth, registrations, credentials, static) is **not** registered. Use this for isolated UNTP validation in CI or harnesses.

- **`POST /test-suite/validate`** — JSON body is the UNTP document; optional query **`kind`** (`dcc_credential` or `dcc_attestation`) skips automatic `type` detection.
- Response: **`success`**, **`validation_checks`** (same structure as the validator’s per-check report), **`artefact_kind`**, and **`error`** when validation fails.

When **`TEST_SUITE`** is unset or false, **`/test-suite/*`** routes are omitted entirely.

## UNTP bundled artefacts (DCC + DIA)

Vendored JSON lives under **`untp/bundled/`** (snapshots from [UNTP `artefacts` on GitLab](https://opensource.unicc.org/un/unece/uncefact/spec-untp/-/tree/main/artefacts)). **`untp/releases.py`** maps each **canonical published URL** (vocabulary context URL plus [untp.unece.org](https://untp.unece.org) schema URLs) to **`path`** and **`sha256` digest** via **`CONTEXT_BUNDLE`** and **`SCHEMA_BUNDLE`**. **`DEFAULT_DCC_CONTEXT_URL`** is the default `@context` for the DCC plugin. See **`untp/bundled/README.md`** for layout and how to add artefacts. A future MongoDB layer can store resolved documents keyed by those URLs.

## Docker

From the repo root:

```bash
docker build -t untp-publisher-service -f backend/Dockerfile backend/
docker run -p 8000:8000 untp-publisher-service
```

`docker run` **without MongoDB** will fail: on startup, `main.py` runs `TractionController().provision()`, which opens Mongo and creates indexes. The default **`MONGO_HOST` is `localhost`**, which inside a container is only the container itself, not your host or a sibling service.

Set either a single URI or the discrete fields so PyMongo can reach a real server:

| Variable | Purpose |
|----------|---------|
| **`MONGO_URL`** | Optional full MongoDB URI (e.g. `mongodb://user:pass@host:27017/?authSource=admin`). When set and non-empty, **host/port/user/password/MONGO_DB are ignored** for the connection handshake. |
| **`MONGO_APP_DATABASE`** | MongoDB database name for application collections (default **`untp-publisher`**). |
| **`MONGO_HOST`** | Used only if `MONGO_URL` is unset (e.g. Compose service name `mongo`, not `localhost` in a lone container) |
| **`MONGO_PORT`** | `27017` |
| **`MONGO_USER`** / **`MONGO_PASSWORD`** | Match your MongoDB user (defaults `dev` / `dev`) |
| **`MONGO_DB`** | Passed to PyMongo as `authSource` when not using `MONGO_URL` (default `dev`) |

You still need the rest of your deployment secrets and URLs (**`JWT_SECRET`**, **`TRACTION_*`**, **`DOMAIN`**, **`REGISTRY_URL`**, etc.) from [`config.py`](config.py) / your `.env` template. Legacy env names **`ORGBOOK_URL`** / **`ORGBOOK_SYNC`** are still accepted as aliases for **`REGISTRY_URL`** / **`REGISTRY_SYNC`**.

Example with a Compose network where the database service is named `mongo`:

```bash
docker run -p 8000:8000 \
  --network your_compose_default \
  -e MONGO_HOST=mongo \
  -e MONGO_PORT=27017 \
  -e MONGO_USER=dev \
  -e MONGO_PASSWORD=dev \
  -e MONGO_DB=dev \
  untp-publisher-service
```
