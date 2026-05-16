from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import setup_exception_handlers

app = FastAPI(title='Varogo API')

app.add_middleware(
  CORSMiddleware,
  allow_origins=[settings.FRONTEND_URL],
  allow_credentials=True,
  allow_methods=['*'],
  allow_headers=['*'],
)

setup_exception_handlers(app)


@app.get('/health')
async def health():
  return {'status': 'ok'}
