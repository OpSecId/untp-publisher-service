"""UNTP bundle metadata (:mod:`untp.releases`) and offline JSON-LD helpers (:mod:`untp.jsonld_loader`)."""

# Validators that bind bundled schemas to :mod:`app.models.untp` live in
# :mod:`app.validators.untp`.

from untp.releases import (
    BUNDLE_VERSION,
    CONTEXT_BUNDLE,
    DEFAULT_DCC_CONTEXT_URL,
    SCHEMA_BUNDLE,
)

__all__ = [
    "BUNDLE_VERSION",
    "CONTEXT_BUNDLE",
    "DEFAULT_DCC_CONTEXT_URL",
    "SCHEMA_BUNDLE",
]
