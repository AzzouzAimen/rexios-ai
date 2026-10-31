# Judge demo preparation

The UI changes ship with the normal build. Data cleanup and AI pre-generation are explicit operator commands; neither runs at API startup or during a normal seed.

## Before applying on the VPS

Back up the Rexios database and use only the `rexios-vps` Compose project through `deploy/vps.sh`. Do not reset the database or rerun seeds to undo company decisions. Keep backups outside public uploads and the web root. The private JSON archive below supplements the full database backup.

From `server/`, preview changes (no data writes):

```sh
npm run db:demo:prepare
```

Apply with a private archive directory:

```sh
npm run db:demo:prepare -- --apply --backup-dir ../.superpowers/demo-backups
```

The script:

- Removes only reviewed test question `744584a5-a2b7-4cbf-97e6-a3407869513d`, with its views, reactions and notifications. Exact copy is checked; edits or answers stop the operation. The author account and all other posts remain.
- Refreshes deadlines within 14 days to 30 days ahead only for open, unselected fixture challenges `p1`, `p3`, `p4`, and `demo-proposal-comparison`, with the expected company IDs. Closed challenges, decisions, custom challenges, and other fields remain.
- Replaces only the known old rejection copy on `seed-application-p3`, preserving its decision and any custom reason.
- Saves affected original records to a timestamped JSON file before changes, mode `0600` on Linux. Nothing changes if backup creation fails. Repeating the command immediately does nothing.

For Compose, the archive must be written to a persistent **private bind mount**, not the container filesystem or public uploads. Example from the VPS checkout after creating an `opc`-owned private directory (`0700`). Run the one-off maintenance command as the same host user so it can write there:

```sh
bash deploy/vps.sh run --rm --no-deps --user "$(id -u):$(id -g)" -v /home/opc/rexiosai/.superpowers/demo-backups:/demo-backups api npm run db:demo:prepare
bash deploy/vps.sh run --rm --no-deps --user "$(id -u):$(id -g)" -v /home/opc/rexiosai/.superpowers/demo-backups:/demo-backups api npm run db:demo:prepare -- --apply --backup-dir /demo-backups
```

The archive is suitable for a targeted manual restore; dates are ISO strings. For full recovery, use the database dump. Review the archive rather than overwriting later user changes.

## Prepare the real AI result after deadline cleanup

```sh
npm run db:demo:compare
```

On the VPS:

```sh
bash deploy/vps.sh run --rm --no-deps api npm run db:demo:compare
```

Uses the existing Featherless model and validated comparison workflow. Reuses a fresh saved result; otherwise generates and saves a real result. It never resets applications, fabricates a ranking, or selects a winner. Run after deadline changes because deadlines contribute to the comparison fingerprint. If the challenge was closed or too few proposals remain, the command stops for manual review.

## Judge route

1. `/signin`: select the recommended textile company account, then sign in (`c@demo.test`, password `123`).
2. `/company/problems/new`: choose example notes, generate a brief, review both languages. Publishing is optional.
3. `/company/problems`: use **Try AI proposal comparison**.
4. `/company/problems/demo-proposal-comparison/applications`: inspect the saved ranking and reasons immediately; optionally refresh live (allow a couple of minutes). Do not accept or reject proposals during preparation.
5. Ask Rexios: try a suggested platform question.
6. Sign out; sign in as Sara (`s@demo.test`, password `123`). Open **My Applications** and **Solver Profile** from the profile menu.
7. `/community/q1`: inspect technical discussion and the accepted answer.

## Verification

Check English and Arabic at desktop and narrow mobile widths, status badges for open/expired/closed challenges, the recommended account shortcut, real validation on profile submission, and guest navigation without notification requests. Feed totals include the displayed closed/expired challenges; About counts only platform-wide open challenges with a future deadline, so the totals can differ.
