# Disaster Recovery

This document describes the intended backup and recovery posture for the
production database and states plainly which parts are actually confirmed
configured today versus which still need verification. **Do not treat
anything below as guaranteed until the "Verification" step for that section
has been run and its result recorded.**

Production database: Neon (PostgreSQL). Application host: Hostinger.

## Database backup

Neon provides continuous, storage-level backup via its history/branching
feature on all plans, plus point-in-time recovery (PITR) within a
plan-dependent retention window (typically 7 days on Free/Launch tiers,
longer on paid tiers). This is Neon-managed infrastructure, not something
this application configures.

**Verification (do this now, and re-check after any plan change):**

1. Sign in to the Neon console for this project.
2. **Project → Settings → Backup & Restore** (or **History**, naming varies
   by console version): confirm the retention window shown.
3. Record the actual retention window here once confirmed:
   `RETENTION_WINDOW = <fill in after checking Neon console>`.

Until that line is filled in, treat retention as **unconfirmed** — do not
tell a stakeholder a specific number without checking the console first.

## Backup frequency

Neon's PITR is continuous (WAL-based), not a scheduled daily/weekly job —
recovery is possible to any point within the retention window, not just to
fixed snapshot times. If your Neon plan does not include PITR, an explicit
scheduled export (`pg_dump` via a cron job or CI schedule) should be added —
**this is not currently configured** in this repository; `scripts/` has no
backup script today.

## Retention

Governed by the Neon plan's PITR window (see "Database backup" above) unless
a supplemental scheduled export is added, in which case retention is however
long those export files are kept (e.g. an S3 lifecycle policy) — also not
currently configured.

## Restore procedure

1. **Identify the recovery point** — the timestamp or transaction you need to
   restore to.
2. **In Neon**: use **Branch from history** (or **Restore**, depending on
   console version) to create a new branch at that point in time. This does
   not touch the live branch, so it's safe to do while diagnosing.
3. **Verify the restored branch**: connect to it with `psql` or Prisma
   Studio and confirm the data looks correct.
   ```bash
   DATABASE_URL="<restored-branch-connection-string>" npx prisma studio
   ```
4. **Cut over**: either point the application's `DATABASE_URL` at the
   restored branch (fastest), or promote the restored branch to be the new
   main branch per Neon's own promotion flow.
5. **Run pending migrations** if the restore point predates a migration that
   should still apply: `npm run db:deploy`.
6. **Smoke-test**: sign in, load `/admin`, confirm `/api/regbot` responds.
7. **Notify**: post an incident summary once service is restored, including
   the recovery point chosen and any data loss window.

## Recovery Point Objective (RPO)

With Neon PITR (continuous WAL-based backup), the RPO is effectively **the
last committed transaction** — Neon does not lose committed writes within
the retention window. This is a property of Neon's WAL archiving, not a
number this application guarantees independently. If a supplemental
scheduled `pg_dump` is the only backup (no PITR plan), the RPO becomes
however long the gap between export runs is (e.g. 24 hours for a nightly
dump) — confirm which situation applies to your Neon plan before quoting an
RPO to anyone.

## Recovery Time Objective (RTO)

Not yet measured. A restore via Neon branching (steps above) is typically
minutes for the branch operation itself, but the full RTO also includes
DNS/host cutover time and verification. **Run a drill** (restore to a
scratch branch, time it end to end) before publishing a specific RTO
figure — none is claimed here because none has been measured.

## Known limitations

- No supplemental `pg_dump` export job exists in this repository today;
  recovery relies entirely on Neon's own backup/PITR feature.
- No restore drill has been performed and timed — RTO above is unmeasured.
- Retention window is whatever the current Neon plan provides and must be
  confirmed in the console (see "Verification" above), not assumed.
- This document does not cover recovery of anything outside the database
  (uploaded files, third-party service state) because none of those exist
  in the current architecture — revisit if that changes.
