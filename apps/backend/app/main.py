from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import setup_exception_handlers
from app.auth.router import router as auth_router
from app.products.router import router as products_router
from app.llm.openai import _client as openai_client
import app.auth.models  # noqa: F401
import app.products.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
  yield
  if openai_client is not None:
    await openai_client.aclose()


app = FastAPI(title='Varogo API', lifespan=lifespan)

app.add_middleware(
  CORSMiddleware,
  allow_origins=[settings.FRONTEND_URL],
  allow_credentials=True,
  allow_methods=['*'],
  allow_headers=['*'],
)

setup_exception_handlers(app)

app.include_router(auth_router, prefix='/auth')
app.include_router(products_router, prefix='/products')


@app.get('/health')
async def health():
  return {'status': 'ok'}
