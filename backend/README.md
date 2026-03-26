# Orgbook Publisher — Backend

FastAPI backend for the Orgbook Publisher service. See the [repository README](../README.md) for overview and operational docs.

## Setup

```bash
uv sync
```

## Run

```bash
uv run python main.py
# or (full app, no Traction provision on startup)
uv run uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Test-suite only** — only ``/test-suite/*`` (and OpenAPI docs); skips Traction provisioning, static mounts, and all other routers. Set env ``TEST_SUITE_ONLY`` to ``1``, ``true``, ``yes``, or ``on``:

```bash
TEST_SUITE_ONLY=1 uv run python main.py
# or
TEST_SUITE_ONLY=1 uv run uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## UNTP bundled artefacts (DCC + DIA)

Vendored JSON lives under **`untp/bundled/`** (UNTP artefacts from [GitLab `spec-untp`](https://opensource.unicc.org/un/unece/uncefact/spec-untp/-/tree/main/artefacts), plus [W3C VCDM 2.0](https://www.w3.org/ns/credentials/v2) context). **`untp/releases.py`** maps each **canonical URL** (contexts and [untp.unece.org](https://untp.unece.org) schema URLs) to **`path`** and **`sha256` digest** via **`CONTEXT_BUNDLE`** and **`SCHEMA_BUNDLE`**. **`DEFAULT_DCC_CONTEXT_URL`** is the default `@context` for the DCC plugin. See **`untp/bundled/README.md`** for layout and how to add artefacts. A future MongoDB layer can store resolved documents keyed by those URLs.

**Validation** (JSON Schema + JSON-LD → RDF + Pydantic v0.7.0 models): use **`app.validators`** (or **`app.validators.untp`**), e.g. `validate_untp_document(body)` on a parsed JSON object (FastAPI request body). Tests load fixtures with `json.loads` / a small helper under **`tests/`**. **`CONTEXT_BUNDLE`** loads both UNTP and **W3C VCDM 2.0** (`https://www.w3.org/ns/credentials/v2`) contexts from disk. Official v0.7.0 sample credentials live under **`tests/fixtures/untp_samples/`**; run **`uv run pytest tests/test_untp_official_samples.py`** (dev dependency group includes pytest).

## Docker

From the repo root:

```bash
docker build -t orgbook-publisher-service -f backend/Dockerfile backend/
docker run -p 8000:8000 orgbook-publisher-service
```
