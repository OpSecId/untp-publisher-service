from __future__ import annotations

import requests

from config import settings


class EntityRegistryClient:
    """Read-only HTTP client: entity lookup via BC-style registry search API."""

    def fetch_buisness_info(self, identifier):
        r = requests.get(
            f"{settings.registry_api_url}/search/topic?q={identifier}&inactive=false&revoked=false"
        )
        buisness_info = r.json()["results"][0]
        return {
            "id": f"{settings.REGISTRY_URL}/entity/{identifier}/type/registration.registries.ca",
            "name": buisness_info["names"][0]["text"],
        }
