# SIPI Load Test — 1,000 concurrent students (login → admission → attendance → notice)

`locustfile.py` simulates student users hitting the four flows concurrently:

| # | Flow | Endpoint |
|---|------|----------|
| 01 | Login | `POST /api/auth/login/` (session cookie + CSRF) |
| 02 | Admission | `GET /api/admissions/my-admission/` |
| 03 | Attendance | `GET /api/attendance/student_summary/` |
| 04–05 | Notices | `GET /api/student/notices/` + `POST .../{id}/mark-read/` |

## ⚠️ Where to run it

- **Run against staging**, provisioned like production (ASGI: uvicorn/daphne + N
  workers behind nginx). **Do NOT** run against the Django dev server (`runserver`
  is single-threaded and will misreport capacity), and **do NOT** run against
  production — 1,000 users is a self-inflicted DoS.
- **Generate load from a separate machine** so the server under test isn't
  competing with Locust for CPU/RAM.

## Prerequisites

1. **Seed a pool of student accounts** (e.g. 1,000): `loadstudent0001…loadstudent1000`
   sharing one password. Use a Django management command or fixture on staging.
2. **Lift the login throttle for the test window.** Login is rate-limited to
   `10/min` per IP (`settings.py` → `DEFAULT_THROTTLE_RATES['login']`). From one
   load box that means ~990/1000 logins get **HTTP 429**. Set `LOAD_TEST=1` in the
   server env (the settings already null out `login`/`otp` rates under that flag),
   or front the load box with rotating source IPs.
3. `pip install locust` on the load box.

## Run

```bash
export LOADTEST_HOST=https://staging.example.com
export LOADTEST_USER_PREFIX=loadstudent
export LOADTEST_USER_COUNT=1000
export LOADTEST_PASSWORD='...'

# Headless, ramp 1000 users at 50/s, hold 5 minutes:
locust -f locustfile.py --host "$LOADTEST_HOST" \
       -u 1000 -r 50 --run-time 5m --headless \
       --csv=results/run1 --html=results/run1.html
```

Or omit `--headless` for the web UI at http://localhost:8089.

Explicit credential list instead of a prefix:
```bash
export LOADTEST_USERS="alice:pw1,bob:pw2,..."
```

## Reading results

- **Failures %** — anything non-2xx. A wall of 429s means the throttle wasn't
  lifted (see prereq 2).
- **p50 / p95 / p99 latency** per named request (`01 login`, `02 admission`, …).
- **RPS** sustained vs. users. Watch where p95 latency starts climbing — that's
  your concurrency ceiling.
- Correlate with server-side: gunicorn/uvicorn worker saturation, Postgres
  `pg_stat_activity` connection count, Redis, and CPU on the app box.

## Tuning notes

- Task weights (`@task(n)`) model traffic mix — adjust to your real ratios.
- `wait_time = between(1, 4)` is per-user think time; lower it for a harsher test.
- Distribute across boxes with `--master` / `--worker` if one load box can't
  generate 1,000 users.
