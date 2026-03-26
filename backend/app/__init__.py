from app.factory import create_app, test_suite_only

app = create_app()

__all__ = ["app", "test_suite_only"]
