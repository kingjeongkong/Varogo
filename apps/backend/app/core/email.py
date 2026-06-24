import logging
from concurrent.futures import ThreadPoolExecutor

import resend

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


def _send(to_email: str, reset_link: str) -> None:
  try:
    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send({
      'from': settings.RESEND_FROM_EMAIL,
      'to': [to_email],
      'subject': 'Reset your Varogo password',
      'html': _build_html(reset_link),
      'text': _build_text(reset_link),
    })
  except Exception:
    logger.warning('Resend password reset email failed to %s', to_email, exc_info=True)


def send_password_reset_email(to_email: str, reset_link: str) -> None:
  _executor.submit(_send, to_email, reset_link)
