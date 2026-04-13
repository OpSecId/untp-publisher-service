"""MongoClient connection selection (URI vs discrete settings)."""

from unittest.mock import MagicMock, patch

import pytest

from app.plugins.mongodb import MongoClient


@pytest.fixture()
def discrete_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    s = MagicMock()
    s.MONGO_URL = None
    s.MONGO_APP_DATABASE = "untp-publisher"
    s.MONGO_HOST = "mongo.internal"
    s.MONGO_PORT = "27017"
    s.MONGO_USER = "app"
    s.MONGO_PASSWORD = "secret"
    s.MONGO_DB = "authdb"
    monkeypatch.setattr("app.plugins.mongodb.settings", s)


@pytest.fixture()
def uri_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    s = MagicMock()
    s.MONGO_URL = "mongodb://u:p@railway.internal:27017/?authSource=admin"
    s.MONGO_APP_DATABASE = "untp-publisher"
    s.MONGO_HOST = "ignored"
    s.MONGO_PORT = "9999"
    s.MONGO_USER = "ignored"
    s.MONGO_PASSWORD = "ignored"
    s.MONGO_DB = "ignored"
    monkeypatch.setattr("app.plugins.mongodb.settings", s)


def test_mongo_client_uses_discrete_fields(discrete_settings: None) -> None:
    with patch("app.plugins.mongodb.pymongo.MongoClient") as Mc:
        Mc.return_value = MagicMock()
        MongoClient()
        Mc.assert_called_once_with(
            "mongo.internal:27017",
            username="app",
            password="secret",
            authSource="authdb",
        )


def test_mongo_client_prefers_mongo_url(uri_settings: None) -> None:
    with patch("app.plugins.mongodb.pymongo.MongoClient") as Mc:
        Mc.return_value = MagicMock()
        MongoClient()
        Mc.assert_called_once_with("mongodb://u:p@railway.internal:27017/?authSource=admin")


def test_mongo_client_strips_whitespace_url(monkeypatch: pytest.MonkeyPatch) -> None:
    s = MagicMock()
    s.MONGO_URL = "  mongodb://localhost/  "
    s.MONGO_APP_DATABASE = "untp-publisher"
    s.MONGO_HOST = "h"
    s.MONGO_PORT = "1"
    s.MONGO_USER = "u"
    s.MONGO_PASSWORD = "p"
    s.MONGO_DB = "d"
    monkeypatch.setattr("app.plugins.mongodb.settings", s)
    with patch("app.plugins.mongodb.pymongo.MongoClient") as Mc:
        Mc.return_value = MagicMock()
        MongoClient()
        Mc.assert_called_once_with("mongodb://localhost/")
