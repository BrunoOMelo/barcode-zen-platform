from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.exceptions.base import DomainException


def register_exception_handlers(application: FastAPI) -> None:
    @application.exception_handler(DomainException)
    async def handle_domain_exception(_: Request, exc: DomainException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"message": exc.message})

    @application.exception_handler(RequestValidationError)
    async def handle_request_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "message": "Dados de requisição inválidos.",
                "errors": exc.errors(),
            },
        )

    @application.exception_handler(SQLAlchemyError)
    async def handle_sqlalchemy_error(_: Request, __: SQLAlchemyError) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={"message": "Ocorreu um erro inesperado ao acessar o banco de dados."},
        )
