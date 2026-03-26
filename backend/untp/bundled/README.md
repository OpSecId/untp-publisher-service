# Bundled UNTP artefacts

**Upstream source:** artefacts are maintained in the UNCEFACT UNTP spec repo — [`spec-untp` → `artefacts/`](https://opensource.unicc.org/un/unece/uncefact/spec-untp/-/tree/main/artefacts) on GitLab ([opensource.unicc.org](https://opensource.unicc.org/un/unece/uncefact/spec-untp/-/tree/main/artefacts)).

**Published mirrors:** we register the same files under the canonical URLs served with the public spec (e.g. [untp.unece.org artefacts](https://untp.unece.org/artefacts/schema/v0.7.0/dcc/ConformityCredential.json)) so wire-format `@context` / `$ref` strings stay stable.

Canonical URLs and file metadata are defined in **`untp/releases.py`**:

- **`CONTEXT_BUNDLE`** — JSON-LD `@context` URL → `{ "path", "digest" }` (paths are `.jsonld` under this directory), including [W3C VCDM 2.0](https://www.w3.org/TR/vc-data-model-2.0/) (`https://www.w3.org/ns/credentials/v2`) and UNTP vocabulary context
- **`SCHEMA_BUNDLE`** — published schema artefact URL → `{ "path", "digest" }` (paths are `.json`)
  - DCC: e.g. [ConformityCredential.json](https://untp.unece.org/artefacts/schema/v0.7.0/dcc/ConformityCredential.json)
  - DIA: [DigitalIdentityAnchor.json](https://untp.unece.org/artefacts/schema/v0.7.0/dia/DigitalIdentityAnchor.json), [RegisteredIdentity.json](https://untp.unece.org/artefacts/schema/v0.7.0/dia/RegisteredIdentity.json)

**`DEFAULT_DCC_CONTEXT_URL`** in the same module is the context URL the DCC plugin uses by default (must match a key in `CONTEXT_BUNDLE`).

```text
v{semver}/
  contexts/
  schemas/
    dia/   # Digital Identity Anchor (optional)
```

Add files on disk, then add an entry to the appropriate bundle (recompute **`digest`** as `sha256:` + hex of the file bytes).
