from .base import *  # noqa: F403
from .base import env

DEBUG = False
USE_HTTPS = env.bool("USE_HTTPS", default=False)

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

SECURE_SSL_REDIRECT = USE_HTTPS
SECURE_HSTS_SECONDS = 31536000 if USE_HTTPS else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = USE_HTTPS
SECURE_HSTS_PRELOAD = USE_HTTPS
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = USE_HTTPS
CSRF_COOKIE_SECURE = USE_HTTPS
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "https://crmdetroid.ru",
        "https://www.crmdetroid.ru",
        "http://crmdetroid.ru",
        "http://77.222.38.191",
    ],
)
EXPOSE_DJANGO_ADMIN = env.bool("EXPOSE_DJANGO_ADMIN", default=False)
EXPOSE_API_DOCS = env.bool("EXPOSE_API_DOCS", default=False)
