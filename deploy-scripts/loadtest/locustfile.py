"""
SIPI load test — models the four flows requested: login → admission → attendance → notice.

This targets the STUDENT portal (session-cookie auth + CSRF), which is where
real concurrent load comes from. Run it against a production-like ASGI deploy on
staging, NOT the Django dev server (`runserver` is single-threaded and will
misreport capacity), and NOT against production.

Prerequisites (see README.md):
  * A seeded pool of student accounts (LOADTEST_USERS or a users file).
  * The login throttle lifted for the test window (LOAD_TEST=1 in server env),
    otherwise ~everything past 10 logins/min/IP returns HTTP 429.

Usage:
  pip install locust
  LOADTEST_HOST=https://staging.example.com \
  LOADTEST_USER_PREFIX=loadstudent LOADTEST_USER_COUNT=1000 LOADTEST_PASSWORD=... \
  locust -f locustfile.py --host "$LOADTEST_HOST" -u 1000 -r 50 --run-time 5m --headless
"""
import os
import random
import itertools

from locust import HttpUser, task, between


# A pool of pre-seeded student credentials. Either provide an explicit list via
# LOADTEST_USERS ("user1:pass1,user2:pass2,...") or generate prefixed usernames
# (loadstudent0001 .. loadstudentNNNN) that share one password.
def _build_credentials():
    explicit = os.getenv("LOADTEST_USERS", "").strip()
    if explicit:
        return [tuple(pair.split(":", 1)) for pair in explicit.split(",") if ":" in pair]
    prefix = os.getenv("LOADTEST_USER_PREFIX", "loadstudent")
    count = int(os.getenv("LOADTEST_USER_COUNT", "1000"))
    password = os.getenv("LOADTEST_PASSWORD", "LoadTest123!")
    width = max(4, len(str(count)))
    return [(f"{prefix}{str(i).zfill(width)}", password) for i in range(1, count + 1)]


_CREDENTIALS = _build_credentials()
_cred_cycle = itertools.cycle(_CREDENTIALS)


class StudentUser(HttpUser):
    """One simulated student: logs in once, then loops the read/write flows."""
    # Realistic think-time between actions; tune to model your traffic shape.
    wait_time = between(1, 4)

    def on_start(self):
        username, password = next(_cred_cycle)
        self.username = username
        # Obtain a CSRF cookie first (SessionAuthentication enforces CSRF on POST).
        self.client.get("/api/auth/csrf/", name="00 csrf-bootstrap", catch_response=True)
        csrf = self.client.cookies.get("csrftoken", "")
        with self.client.post(
            "/api/auth/login/",
            json={"username": username, "password": password, "portal": "student"},
            headers={"X-CSRFToken": csrf, "Referer": self.host},
            name="01 login",
            catch_response=True,
        ) as resp:
            if resp.status_code == 429:
                resp.failure("throttled (login rate limit — lift it for load tests)")
            elif resp.status_code != 200:
                resp.failure(f"login failed: {resp.status_code}")

    def _csrf(self):
        return self.client.cookies.get("csrftoken", "")

    @task(3)
    def view_admission(self):
        self.client.get("/api/admissions/my-admission/", name="02 admission (my-admission)")

    @task(3)
    def view_attendance(self):
        self.client.get("/api/attendance/student_summary/", name="03 attendance (student_summary)")

    @task(4)
    def view_notices(self):
        with self.client.get("/api/student/notices/", name="04 notices (list)", catch_response=True) as resp:
            if resp.status_code != 200:
                return
            try:
                results = resp.json().get("results", resp.json())
                ids = [n["id"] for n in results if isinstance(n, dict) and "id" in n]
            except Exception:
                ids = []
        # Model the write path: mark a random notice as read.
        if ids:
            nid = random.choice(ids)
            self.client.post(
                f"/api/student/notices/{nid}/mark-read/",
                headers={"X-CSRFToken": self._csrf(), "Referer": self.host},
                name="05 notice mark-read",
            )
