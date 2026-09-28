# Lab 4 — Peer Review Record

This document is evidence for the Git workflow and release-hardening review. Repository-local facts
are recorded below; reviewer comments, approvals, and merge details must be copied from the actual
GitHub pages before PDF submission.

## 1. Reviewer Identity

| Role | Name - Student ID | GitHub Username |
|---|---|---|
| Author (this repo) | Kulchaya Paipinij - 67070503406 | @chayongchaya |
| Peer Reviewer | `[verify from GitHub]` | `[verify from GitHub]` |

## 2. Pull Requests Reviewed in Lab 4

| PR # | Branch → Target | Merge commit | Date from local Git history | Approval status |
|---|---|---|---|---|
| [#86](https://github.com/chayongchaya/toktickit/pull/86) | `docs/lab4-engineering-contract` → `lab4-staging` | `16eb035` | 2026-09-27 | Verify on GitHub |
| [#88](https://github.com/chayongchaya/toktickit/pull/88) | `feature/lab4-actions-taken-db` → `lab4-staging` | `0721195` | 2026-09-28 | Verify on GitHub |
| [#90](https://github.com/chayongchaya/toktickit/pull/90) | `feature/lab4-actions-taken-api` → `lab4-staging` | `57310fa` | 2026-09-28 | Verify on GitHub |
| [#92](https://github.com/chayongchaya/toktickit/pull/92) | `feature/lab4-actions-taken-ui` → `lab4-staging` | `eed3082` | 2026-09-28 | Verify on GitHub |
| [#94](https://github.com/chayongchaya/toktickit/pull/94) | `fix/lab4-test-isolation` → `lab4-staging` | `6f42094` | 2026-09-28 | Verify on GitHub |
| [#96](https://github.com/chayongchaya/toktickit/pull/96) | `feature/lab4-dashboards` → `lab4-staging` | `08b9388` | 2026-09-28 | Verify on GitHub |
| [#97](https://github.com/chayongchaya/toktickit/pull/97) | `test/lab4-coverage` → `lab4-staging` | `b032c84` | 2026-09-28 | Verify on GitHub |

### Hardening branch

| Branch | Target | Commits | Remote status |
|---|---|---|---|
| `chore/lab4-hardening` | `[create actual GitHub PR]` | `fa64a03`, `61f995c`, `e7e4e3b` | Pushed to `origin/chore/lab4-hardening` |

## 3. Comments Received and Responses

| PR # | Reviewer | Comment | Author response |
|---|---|---|---|
| `[fill]` | `[fill from GitHub]` | `[paste actual review comment]` | `[paste actual response]` |

No reviewer comments or approvals are inferred from local files. Complete this table from GitHub.

## 4. Verification Evidence

- Branch: `chore/lab4-hardening`
- Base: merged `origin/lab4-staging`
- Server tests: 28 files / 135 tests passed with the shared-database-safe test command.
- Client tests: 19 files / 93 tests passed.
- Lab 4 Playwright suite: 17 passed, 4 skipped; database-mutating flows are intentionally skipped on tablet/mobile.
- Workflow coverage includes stale status rejection, all disallowed transitions, Actions Taken visibility, and empty Actions Taken arrays.

- Test status evidence is maintained in `docs/lab-04/tests.md`.
- Responsive screenshot capture passed 12/12 and is stored under `artifacts/lab-04/screenshots/`:
  - `staff-dashboard/{desktop,tablet,mobile}.png`
  - `requester-dashboard/{desktop,tablet,mobile}.png`
  - `actions-taken/{desktop,tablet,mobile}.png`
  - `actions-taken-requester/{desktop,tablet,mobile}.png`
- The full Lab 4 Playwright rerun is environment-sensitive: seeded accounts must be reset with `npm --prefix server run prisma:seed` after earlier E2E password-changing tests. The remaining Planned rows in `tests.md` are not claimed as complete.

### Remaining GitHub review evidence

The following items must be copied from the actual GitHub pages before PDF submission; no reviewer,
approval, comment, or PR data is inferred locally:

- Reviewer name: `[fill from GitHub]`
- Hardening PR: `[fill actual GitHub PR URL]`
- Approval/comment evidence: `[attach GitHub screenshot or link]`
- Merge evidence into `main`: `[fill actual GitHub PR URL and merge timestamp]`

## 5. Summary

Lab 4 feature branches were merged into `lab4-staging`, and the hardening branch contains the
regression fixes, responsive evidence, documentation updates, and 12 responsive screenshots. The
GitHub reviewer identity, comments, approvals, and release merge into `main` must be verified and
added from GitHub before the final PDF is submitted.

## Review focus

1. Confirm the server and client test commands are run from a clean database state.
2. Review desktop, tablet, and mobile screenshots for overflow, clipping, and overlap.
3. Check keyboard focus, associated labels, and non-color status cues on dashboards and Actions Taken.
4. Confirm README setup, migration, seed, test, and demo instructions match the current repository.
