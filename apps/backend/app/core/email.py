import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

import boto3

from app.core.config import settings

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=2)


def _build_html(reset_link: str) -> str:
  return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Varogo password</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="font-size:22px;font-weight:bold;color:#111827;padding-bottom:16px;">
              Reset your Varogo password
            </td>
          </tr>
          <tr>
            <td style="font-size:15px;color:#374151;line-height:1.6;padding-bottom:24px;">
              We received a request to reset the password for your Varogo account.
              Click the button below to choose a new password.
              This link will expire in <strong>15 minutes</strong>.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="{reset_link}"
                 style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;
                        font-size:15px;font-weight:600;padding:12px 32px;border-radius:6px;">
                Reset Password
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#6b7280;line-height:1.6;">
              If you didn't request a password reset, you can safely ignore this email —
              your password will not change.<br /><br />
              Or copy and paste this URL into your browser:<br />
              <a href="{reset_link}" style="color:#111827;word-break:break-all;">{reset_link}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _build_text(reset_link: str) -> str:
  return (
    "Reset your Varogo password\n\n"
    "We received a request to reset the password for your Varogo account.\n"
    "Click the link below to choose a new password.\n"
    "This link will expire in 15 minutes.\n\n"
    f"{reset_link}\n\n"
    "If you didn't request a password reset, you can safely ignore this email."
  )


def _send_ses(to_email: str, reset_link: str) -> None:
  try:
    client = boto3.client('ses', region_name=settings.AWS_SES_REGION)
    client.send_email(
      Source=settings.AWS_SES_FROM_EMAIL,
      Destination={'ToAddresses': [to_email]},
      Message={
        'Subject': {'Data': 'Reset your Varogo password', 'Charset': 'UTF-8'},
        'Body': {
          'Text': {'Data': _build_text(reset_link), 'Charset': 'UTF-8'},
          'Html': {'Data': _build_html(reset_link), 'Charset': 'UTF-8'},
        },
      },
    )
  except Exception:
    logger.warning('SES password reset email failed to %s', to_email, exc_info=True)


def send_password_reset_email(to_email: str, reset_link: str) -> None:
  try:
    loop = asyncio.get_running_loop()
    loop.run_in_executor(_executor, _send_ses, to_email, reset_link)
  except RuntimeError:
    pass
