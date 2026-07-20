"""
Per-portal session isolation.

Problem: the student portal and the admin panel are separate SPAs talking to
the same backend. Browsers scope cookies by host (ignoring ports), so in
local development — both apps proxying to the same Django on localhost — the
two portals shared one `sessionid` cookie: logging into one replaced the
session and silently logged the other out. (In production the portals live on
different subdomains, but the same collision would appear the moment both
apps are served from one host.)

Fix: the admin SPA marks every request with an `X-Portal: admin` header (and
`?portal=admin` on its WebSocket URL). This middleware keeps the admin
session in its own cookie (`ADMIN_SESSION_COOKIE_NAME`), while everything
else — student portal, Django /admin, plain browser navigation — keeps using
the default `SESSION_COOKIE_NAME`. The two sessions coexist in one browser.

Requests without the header normally use the default cookie. One pragmatic
fallback: if a header-less request carries no authenticated default session
but does carry an authenticated admin session (e.g. an admin user opening a
direct /files/ download link in a browser tab), the admin session is used —
otherwise such links would only work for whoever is logged into the student
portal.
"""
import time

from django.conf import settings
from django.contrib.sessions.backends.base import UpdateError
from django.contrib.sessions.exceptions import SessionInterrupted
from django.contrib.sessions.middleware import SessionMiddleware
from django.utils.cache import patch_vary_headers
from django.utils.http import http_date

PORTAL_HEADER = 'X-Portal'
ADMIN_PORTAL = 'admin'


def admin_cookie_name() -> str:
    return getattr(settings, 'ADMIN_SESSION_COOKIE_NAME', 'admin_sessionid')


class PortalSessionMiddleware(SessionMiddleware):
    """SessionMiddleware with a per-portal cookie name.

    ``process_response`` mirrors Django 4.2's implementation exactly, with
    ``settings.SESSION_COOKIE_NAME`` replaced by the cookie chosen during
    ``process_request`` (all other cookie attributes stay shared).
    """

    def process_request(self, request):
        cookie_name = self._choose_cookie_name(request)
        request._portal_session_cookie = cookie_name
        session_key = request.COOKIES.get(cookie_name)
        request.session = self.SessionStore(session_key)

    def _choose_cookie_name(self, request) -> str:
        if request.headers.get(PORTAL_HEADER, '').lower() == ADMIN_PORTAL:
            return admin_cookie_name()

        default_name = settings.SESSION_COOKIE_NAME
        admin_name = admin_cookie_name()
        if admin_name in request.COOKIES:
            # Header-less request (direct link, file download). Prefer the
            # default session, but fall back to an authenticated admin
            # session when the default one carries no user.
            default_key = request.COOKIES.get(default_name)
            if not self._is_authenticated(default_key):
                if self._is_authenticated(request.COOKIES.get(admin_name)):
                    return admin_name
        return default_name

    def _is_authenticated(self, session_key) -> bool:
        if not session_key:
            return False
        store = self.SessionStore(session_key)
        return store.get('_auth_user_id') is not None

    def process_response(self, request, response):
        cookie_name = getattr(
            request, '_portal_session_cookie', settings.SESSION_COOKIE_NAME,
        )
        try:
            accessed = request.session.accessed
            modified = request.session.modified
            empty = request.session.is_empty()
        except AttributeError:
            return response
        if cookie_name in request.COOKIES and empty:
            response.delete_cookie(
                cookie_name,
                path=settings.SESSION_COOKIE_PATH,
                domain=settings.SESSION_COOKIE_DOMAIN,
                samesite=settings.SESSION_COOKIE_SAMESITE,
            )
            patch_vary_headers(response, ('Cookie',))
        else:
            if accessed:
                patch_vary_headers(response, ('Cookie',))
            if (modified or settings.SESSION_SAVE_EVERY_REQUEST) and not empty:
                if request.session.get_expire_at_browser_close():
                    max_age = None
                    expires = None
                else:
                    max_age = request.session.get_expiry_age()
                    expires_time = time.time() + max_age
                    expires = http_date(expires_time)
                if response.status_code < 500:
                    try:
                        request.session.save()
                    except UpdateError:
                        raise SessionInterrupted(
                            "The request's session was deleted before the "
                            "request completed. The user may have logged "
                            "out in a concurrent request, for example."
                        )
                    response.set_cookie(
                        cookie_name,
                        request.session.session_key,
                        max_age=max_age,
                        expires=expires,
                        domain=settings.SESSION_COOKIE_DOMAIN,
                        path=settings.SESSION_COOKIE_PATH,
                        secure=settings.SESSION_COOKIE_SECURE or None,
                        httponly=settings.SESSION_COOKIE_HTTPONLY or None,
                        samesite=settings.SESSION_COOKIE_SAMESITE,
                    )
        return response


class PortalWebsocketCookieMiddleware:
    """ASGI middleware: route admin-portal WebSockets to the admin session.

    The browser sends every cookie with the WS handshake, but Channels'
    AuthMiddlewareStack only reads ``SESSION_COOKIE_NAME``. The admin SPA
    appends ``?portal=admin`` to its WS URL; for those connections the admin
    session cookie's value is copied over the default name inside the scope,
    so the unchanged auth stack authenticates the admin session.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope.get('type') == 'websocket' and self._is_admin_portal(scope):
            scope = dict(scope)
            scope['headers'] = self._rewrite_cookie_header(scope.get('headers') or [])
        return await self.inner(scope, receive, send)

    @staticmethod
    def _is_admin_portal(scope) -> bool:
        query = scope.get('query_string', b'').decode('latin1')
        return 'portal=admin' in query.split('&') or query == 'portal=admin'

    @staticmethod
    def _rewrite_cookie_header(headers):
        from http.cookies import SimpleCookie

        new_headers = []
        for name, value in headers:
            if name != b'cookie':
                new_headers.append((name, value))
                continue
            jar = SimpleCookie()
            jar.load(value.decode('latin1'))
            admin_key = jar.get(admin_cookie_name())
            if admin_key is not None:
                jar[settings.SESSION_COOKIE_NAME] = admin_key.value
            cookie_str = '; '.join(
                f'{key}={morsel.value}' for key, morsel in jar.items()
            )
            new_headers.append((b'cookie', cookie_str.encode('latin1')))
        return new_headers
