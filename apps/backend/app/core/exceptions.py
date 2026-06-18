import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)


class AppError(Exception):
  def __init__(self, status_code: int, code: str, message: str) -> None:
    super().__init__(message)
    self.status_code = status_code
    self.code = code
    self.message = message


async def _app_error_handler(request: Request, exc: AppError) -> JSONResponse:
  return JSONResponse(status_code=exc.status_code, content={'code': exc.code, 'message': exc.message})


def _make_serializable(errors: list) -> list:
  result = []
  for error in errors:
    entry = {k: v for k, v in error.items() if k != 'url'}
    if 'ctx' in entry and 'error' in entry['ctx']:
      ctx_error = entry['ctx']['error']
      entry['ctx'] = {**entry['ctx'], 'error': str(ctx_error)}
    result.append(entry)
  return result


async def _validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
  return JSONResponse(status_code=422, content={'detail': _make_serializable(exc.errors())})


async def _sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
  logger.exception('Database error on %s %s', request.method, request.url.path)
  return JSONResponse(status_code=500, content={'detail': 'Internal server error'})


async def _generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
  logger.exception('Unhandled exception on %s %s', request.method, request.url.path)
  return JSONResponse(status_code=500, content={'detail': 'Internal server error'})


def setup_exception_handlers(app: FastAPI) -> None:
  app.add_exception_handler(AppError, _app_error_handler)
  app.add_exception_handler(RequestValidationError, _validation_exception_handler)
  app.add_exception_handler(SQLAlchemyError, _sqlalchemy_exception_handler)
  app.add_exception_handler(Exception, _generic_exception_handler)
