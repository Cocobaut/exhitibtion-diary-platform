"""Gửi email hệ thống. EMAIL_BACKEND=console chỉ in ra log (dùng khi dev)."""

import asyncio
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import settings


def _send_smtp(msg: EmailMessage) -> None:
    context = ssl.create_default_context()
    if settings.SMTP_PORT == 465:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context, timeout=20) as smtp:
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
            smtp.starttls(context=context)
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)


async def send_email(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["From"] = formataddr((settings.EMAILS_FROM_NAME, settings.EMAILS_FROM_EMAIL))
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    if settings.EMAIL_BACKEND != "smtp":
        print(f"[Email:console] To: {to}\nSubject: {subject}\n\n{body}\n")
        return

    await asyncio.to_thread(_send_smtp, msg)
