"""Application factory: full API vs minimal **test-suite** mode."""

from __future__ import annotations

import os

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware


def test_suite_only() -> bool:
    """When true, only test-suite routes are mounted (no auth, credentials, Mongo, Traction, static)."""
    return os.getenv("TEST_SUITE_ONLY", "").strip().lower() in ("1", "true", "yes", "on")


def create_app() -> FastAPI:
    from config import settings

    if test_suite_only():
        application = FastAPI(
            title=f"{settings.PROJECT_TITLE} (test suite)",
            version=settings.PROJECT_VERSION,
            description=(
                "Minimal server: ``TEST_SUITE_ONLY`` is set. Only routes under "
                "``/test-suite`` are available (e.g. UNTP credential validation)."
            ),
        )
        application.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        from app.routers import test_suite

        application.include_router(test_suite.router)
        return application

    from fastapi.responses import JSONResponse
    from fastapi.staticfiles import StaticFiles

    from app.routers import (
        authentication,
        credentials,
        registrations,
        related_resources,
        test_suite,
    )

    application = FastAPI(title=settings.PROJECT_TITLE, version=settings.PROJECT_VERSION)
    application.mount("/static", StaticFiles(directory="app/static"), name="static")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api_router = APIRouter()

    @api_router.get("/server/status", tags=["Server"], include_in_schema=False)
    async def server_status():
        settings.LOGGER.info("Server status OK!")
        return JSONResponse(status_code=200, content={"status": "ok"})

    api_router.include_router(authentication.router)
    api_router.include_router(registrations.router)
    api_router.include_router(credentials.router)
    api_router.include_router(related_resources.router)
    api_router.include_router(test_suite.router)
    application.include_router(api_router)
    return application
