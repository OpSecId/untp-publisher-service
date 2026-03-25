import asyncio
import os
import uvicorn


def _test_suite_only() -> bool:
    return os.getenv("TEST_SUITE_ONLY", "").strip().lower() in ("1", "true", "yes", "on")


if __name__ == "__main__":
    if not _test_suite_only():
        from app.plugins import TractionController

        asyncio.run(TractionController().provision())
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        # reload=True,
        workers=1 if _test_suite_only() else 4,
    )
