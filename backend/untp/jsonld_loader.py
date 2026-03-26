"""
JSON-LD: inline bundled ``@context`` documents (VCDM 2.0 + UNTP), then parse to RDF.

URLs in :data:`untp.releases.CONTEXT_BUNDLE` are inlined from ``untp/bundled/``. During
parse, rdflib is patched so **no http(s) context URL** is fetched unless it is listed
in ``CONTEXT_BUNDLE`` (offline-safe validation).
"""

from __future__ import annotations

import copy
import json
from collections.abc import Generator, Mapping
from contextlib import contextmanager
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from rdflib import Dataset
from rdflib.plugins.shared.jsonld import util as jsonld_util

from untp.releases import CONTEXT_BUNDLE

_BUNDLED_ROOT = Path(__file__).resolve().parent / "bundled"

_ORIGINAL_SOURCE_TO_JSON = jsonld_util.source_to_json


class UntpJsonLdRemoteContextError(RuntimeError):
    """JSON-LD would fetch a remote ``@context`` URL that is not in ``CONTEXT_BUNDLE``."""


def _source_to_json_bundled_only(
    source: Any,
    fragment_id: str | None = None,
    extract_all_scripts: bool | None = None,
) -> Any:
    if isinstance(source, str):
        if source in CONTEXT_BUNDLE:
            return _load_context_json(source), None
        if urlparse(source).scheme in ("http", "https"):
            raise UntpJsonLdRemoteContextError(
                f"JSON-LD context URL not bundled (add to CONTEXT_BUNDLE or extend bundle): {source!r}"
            )
    return _ORIGINAL_SOURCE_TO_JSON(
        source, fragment_id=fragment_id, extract_all_scripts=extract_all_scripts
    )


@contextmanager
def rdflib_jsonld_bundled_contexts_only() -> Generator[None, None, None]:
    """
    Patch rdflib’s JSON-LD ``source_to_json`` so only ``CONTEXT_BUNDLE`` http(s) URLs
    resolve (from disk); any other remote context URL raises
    :exc:`UntpJsonLdRemoteContextError`.
    """
    jsonld_util.source_to_json = _source_to_json_bundled_only
    try:
        yield
    finally:
        jsonld_util.source_to_json = _ORIGINAL_SOURCE_TO_JSON


def _load_context_json(url: str) -> Any:
    rel = CONTEXT_BUNDLE[url]["path"]
    return json.loads((_BUNDLED_ROOT / rel).read_text(encoding="utf-8"))


def inline_bundled_jsonld_contexts(data: dict[str, Any]) -> dict[str, Any]:
    """
    Replace any ``@context`` entry whose value is a URL listed in
    :data:`untp.releases.CONTEXT_BUNDLE` with the parsed JSON loaded from the bundle.

    Other ``@context`` string URLs are left unchanged; they must appear in
    ``CONTEXT_BUNDLE`` or :func:`jsonld_to_rdf_nquads` will raise when rdflib resolves them.
    """
    out = copy.deepcopy(data)
    ctx = out.get("@context")
    if ctx is None:
        return out
    if isinstance(ctx, str):
        if ctx in CONTEXT_BUNDLE:
            out["@context"] = _load_context_json(ctx)
        return out
    if isinstance(ctx, list):
        out["@context"] = [
            _load_context_json(x) if isinstance(x, str) and x in CONTEXT_BUNDLE else x
            for x in ctx
        ]
    return out


def jsonld_to_rdf_nquads(data: Mapping[str, Any]) -> str:
    """
    Parse JSON-LD into RDF and return **N-Quads** (stable, line-oriented).

    Uses :func:`rdflib_jsonld_bundled_contexts_only` so remote context resolution does not
    use the network except for URLs served from ``untp/bundled/`` via ``CONTEXT_BUNDLE``.

    Raises :exc:`UntpJsonLdRemoteContextError` if a remote context URL is not bundled.
    Raises :exc:`rdflib.plugins.parsers.jsonld.JsonLDParserError` if the document is not
    valid JSON-LD for rdflib’s parser.
    """
    prepared = inline_bundled_jsonld_contexts(dict(data))
    with rdflib_jsonld_bundled_contexts_only():
        ds = Dataset()
        ds.parse(data=json.dumps(prepared), format="json-ld")
        return ds.serialize(format="nquads")
