from dotenv import load_dotenv
load_dotenv()

import sentry_sdk
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import setup_exception_handlers
from app.auth.router import router as auth_router
from app.post_draft.router import router as post_draft_router
from app.products.router import router as products_router
from app.threads.router import router as threads_router
from app.voice_profile.router import router as voice_profile_router
from app.llm.openai import _client as openai_client
import app.auth.models  # noqa: F401
import app.products.models  # noqa: F401
import app.threads.models  # noqa: F401
import app.voice_profile.models  # noqa: F401
import app.post_draft.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
  yield
  if openai_client is not None:
    await openai_client.aclose()


if settings.SENTRY_DSN:
  sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    traces_sample_rate=0,
    send_default_pii=False,
  )

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
app.include_router(threads_router, prefix='/threads')
app.include_router(voice_profile_router, prefix='/voice-profile')
app.include_router(post_draft_router, prefix='/post-drafts')


@app.get('/health')
async def health():
  return {'status': 'ok'}
