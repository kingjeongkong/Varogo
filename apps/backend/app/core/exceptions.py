from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError


async def _validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
  return JSONResponse(status_code=422, content={'detail': exc.errors()})


async def _sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
  return JSONResponse(status_code=500, content={'detail': 'Internal server error'})


async def _generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
  return JSONResponse(status_code=500, content={'detail': 'Internal server error'})


def setup_exception_handlers(app: FastAPI) -> None:
  app.add_exception_handler(RequestValidationError, _validation_exception_handler)
  app.add_exception_handler(SQLAlchemyError, _sqlalchemy_exception_handler)
  app.add_exception_handler(Exception, _generic_exception_handler)
