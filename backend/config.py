from __future__ import annotations

import logging
import os
from logging import Logger

from pydantic import Field, computed_field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

basedir = os.path.abspath(os.path.dirname(__file__))


class Settings(BaseSettings):
    """
    Configuration from environment and optional ``.env`` (same directory as this file).

    String settings default to local-development placeholders so ``import app`` works
    without a populated ``.env``. Override everything real deployments need.
    """

    model_config = SettingsConfigDict(
        env_file=os.path.join(basedir, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        arbitrary_types_allowed=True,
    )

    PROJECT_TITLE: str = "Orgbook Publisher"
    PROJECT_VERSION: str = "v0"

    LOG_LEVEL: int = logging.INFO
    LOG_FORMAT: str = (
        "%(asctime)s | %(levelname)-8s | %(module)s:%(funcName)s:%(lineno)d | %(message)s"
    )
    LOGGER: Logger = Field(default_factory=lambda: logging.getLogger(__name__))

    DOMAIN: str = Field(default="http://localhost")
    TRACTION_API_URL: str = Field(default="http://localhost")
    TRACTION_API_KEY: str = Field(default="dev-local")
    TRACTION_TENANT_ID: str = Field(default="dev-local")

    ORGBOOK_URL: str = Field(default="http://localhost")
    ORGBOOK_SYNC: bool = Field(default=True)

    DID_WEB_SERVER_URL: str = Field(default="http://localhost")
    PUBLISHER_MULTIKEY: str = Field(default="dev-local")
    ISSUER_REGISTRY_URL: str = Field(default="http://localhost")

    SECRET_KEY: str = Field(default="dev-local")
    JWT_SECRET: str = Field(default="dev-local")
    JWT_ALGORITHM: str = "HS256"

    MONGO_HOST: str = Field(default="localhost")
    MONGO_PORT: str = Field(default="27017")
    MONGO_USER: str = Field(default="dev")
    MONGO_PASSWORD: str = Field(default="dev")
    MONGO_DB: str = Field(default="dev")

    @computed_field
    @property
    def ORGBOOK_API_URL(self) -> str:
        return f"{self.ORGBOOK_URL}/api/v4"

    @computed_field
    @property
    def ORGBOOK_VC_SERVICE(self) -> str:
        return f"{self.ORGBOOK_URL}/api/vc"

    @model_validator(mode="after")
    def _configure_logging(self) -> Settings:
        logging.basicConfig(level=self.LOG_LEVEL, format=self.LOG_FORMAT)
        return self


settings = Settings()
