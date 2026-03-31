from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Barcode Zen Platform API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://barcode_zen:barcode_zen@localhost:5432/barcode_zen"
    db_echo: bool = False
    auth_required: bool = True
    auth_jwt_secret: str = "change-me-in-env"
    auth_jwt_algorithm: str = "HS256"
    auth_access_token_ttl_minutes: int = 480
    cors_allow_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    cors_allow_credentials: bool = True
    cors_allow_methods: str = "*"
    cors_allow_headers: str = "*"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def cors_allow_origins_list(self) -> list[str]:
        return [origin.strip() for origin in cors_allow_origins_to_list(self.cors_allow_origins)]

    @property
    def cors_allow_methods_list(self) -> list[str]:
        return [method.strip() for method in cors_allow_origins_to_list(self.cors_allow_methods)]

    @property
    def cors_allow_headers_list(self) -> list[str]:
        return [header.strip() for header in cors_allow_origins_to_list(self.cors_allow_headers)]


def cors_allow_origins_to_list(value: str) -> list[str]:
    if value.strip() == "*":
        return ["*"]
    return [item for item in value.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
