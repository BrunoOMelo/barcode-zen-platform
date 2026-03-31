import json
import logging
from typing import Any

from app.core.config import settings


def configure_application_logging() -> None:
    root_logger = logging.getLogger()
    if not root_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        root_logger.addHandler(handler)

    log_level = logging.INFO
    if settings.app_env.lower() in {"test", "testing"}:
        log_level = logging.WARNING
    root_logger.setLevel(log_level)


def log_structured(logger: logging.Logger, *, level: int, fields: dict[str, Any]) -> None:
    logger.log(level, json.dumps(fields, default=str, ensure_ascii=False))
