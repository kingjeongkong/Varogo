import datetime
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(env_file='.env', extra='ignore')

  # Database
  DATABASE_URL: str

  # JWT
  JWT_SECRET: str
  JWT_EXPIRES_MINUTES: int = 60
  REFRESH_TOKEN_EXPIRES_IN: int = 7

  # App
  FRONTEND_URL: str = 'http://localhost:3001'
  COOKIE_DOMAIN: str | None = None
  PORT: int = 3000
  ENVIRONMENT: str = 'development'

  # AI
  GEMINI_API_KEY: str
  OPENAI_API_KEY: str
  OPENAI_MODEL: str = 'gpt-4o-mini'
  LANGSMITH_API_KEY: str = ''

  # Threads
  THREADS_APP_ID: str
  THREADS_APP_SECRET: str
  THREADS_REDIRECT_URI: str
  THREADS_TOKEN_ENCRYPTION_KEY: str

  # Sentry (optional)
  SENTRY_DSN: str | None = None

  # Discord notifications (optional)
  DISCORD_WEBHOOK_SIGNUPS: str | None = None
  DISCORD_WEBHOOK_PUBLISHED: str | None = None
  DISCORD_WEBHOOK_ERRORS: str | None = None

  # Resend (email)
  RESEND_API_KEY: str = ''
  RESEND_FROM_EMAIL: str = 'noreply@varo-go.com'

  @field_validator('THREADS_TOKEN_ENCRYPTION_KEY')
  @classmethod
  def validate_encryption_key(cls, v: str) -> str:
    if len(v) != 64 or not all(c in '0123456789abcdefABCDEF' for c in v):
      raise ValueError('THREADS_TOKEN_ENCRYPTION_KEY must be a 64-character hex string')
    return v

  @property
  def jwt_expires_delta(self) -> datetime.timedelta:
    return datetime.timedelta(minutes=self.JWT_EXPIRES_MINUTES)


settings = Settings()
