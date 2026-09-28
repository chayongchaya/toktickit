# Lab 4 — Peer Review Record

This document is evidence for Part 1 (Git Use with Engineering Workflow) and the final
hardening review of Lab 4. Repository-local facts are recorded below; reviewer comments,
approvals, and merge details must be copied from the actual GitHub pages before PDF submission.

## 1. Reviewer Identity

| Role | Name - Student ID | GitHub Username |
|---|---|---|
| Author (this repo) | Kulchaya Paipinij - 67070503406 | @chayongchaya |
| Peer Reviewer | Chayanit Kuntanarumitkul - 67070503408 | @chayanitkunt |

## 2. Pull Requests Reviewed in Lab 4

| PR # | Branch → Target | Merge commit | Date from local Git history | Approval status |
|---|---|---|---|---|
| [#86](https://github.com/chayongchaya/toktickit/pull/86) | `docs/lab4-engineering-contract` → `lab4-staging` | `16eb035` | 2026-09-27 | ✅ Approved & Merged |
| [#88](https://github.com/chayongchaya/toktickit/pull/88) | `feature/lab4-actions-taken-db` → `lab4-staging` | `0721195` | 2026-09-28 | ✅ Approved & Merged |
| [#90](https://github.com/chayongchaya/toktickit/pull/90) | `feature/lab4-actions-taken-api` → `lab4-staging` | `57310fa` | 2026-09-28 | ✅ Approved & Merged |
| [#92](https://github.com/chayongchaya/toktickit/pull/92) | `feature/lab4-actions-taken-ui` → `lab4-staging` | `eed3082` | 2026-09-28 | ✅ Approved & Merged |
| [#94](https://github.com/chayongchaya/toktickit/pull/94) | `fix/lab4-test-isolation` → `lab4-staging` | `6f42094` | 2026-09-28 | ✅ Approved & Merged |
| [#96](https://github.com/chayongchaya/toktickit/pull/96) | `feature/lab4-dashboards` → `lab4-staging` | `08b9388` | 2026-09-28 | ✅ Approved & Merged |
| [#97](https://github.com/chayongchaya/toktickit/pull/97) | `test/lab4-coverage` → `lab4-staging` | `b032c84` | 2026-09-28 | ✅ Approved & Merged |

### Hardening branch

**Reviewer for the listed Lab 4 feature PRs:** Chayanit Kuntanarumitkul - 67070503408 (`@chayanitkunt`).

| Branch | Target | Commits | Remote status |
|---|---|---|---|
| `chore/lab4-hardening` | `[create actual GitHub PR]` | `fa64a03`, `61f995c`, `e7e4e3b`, `c70a24e`, `b5686c2`, `3951d53`, `9993058` | Pushed to `origin/chore/lab4-hardening` |

## 3. Comments Received and Responses

| PR # | Reviewer | Comment | Author response |
|---|---|---|---|
| [#86](https://github.com/chayongchaya/toktickit/pull/86) | @chayanitkunt | Approved. Praised the Sprint 4 Spec-DD contract, API/UI alignment, and the SLA-focused test matrix. | Thanked the reviewer for the review and sign-off on the Spec-DD contract. |
| [#88](https://github.com/chayongchaya/toktickit/pull/88) | @chayanitkunt | Approved. Praised the additive migration, indexes, cascade relation, idempotent seed fixtures, and row-count verification. | Thanked the reviewer for the database review and verification. |
| [#90](https://github.com/chayongchaya/toktickit/pull/90) | @chayanitkunt | Approved. Praised server-managed actor/timestamp fields, cross-ticket isolation, TDD coverage, and API-01 to API-09. | Thanked the reviewer for the API review and sign-off. |
| [#92](https://github.com/chayongchaya/toktickit/pull/92) | @chayanitkunt | Approved. Praised the Actions Taken tab, requester read-only boundary, form resilience, duplicate-submit prevention, and UI/A11Y coverage. | Thanked the reviewer for the UI review and sign-off. |
| [#94](https://github.com/chayongchaya/toktickit/pull/94) | @chayanitkunt | Approved. Praised ephemeral fixtures, teardown, and the fix for parallel database mutation races. | Thanked the reviewer for the test-hardening review and sign-off. |
| [#96](https://github.com/chayongchaya/toktickit/pull/96) | @chayanitkunt | Approved. Praised dashboard visual alignment, post-login routing, drill-down query parameters, role guards, and API/UI/E2E coverage. | Thanked the reviewer and confirmed the dashboard visuals, drill-down parameters, and role guards. |
| [#97](https://github.com/chayongchaya/toktickit/pull/97) | @chayanitkunt | Approved. Praised workflow/concurrency coverage, `--no-file-parallelism`, responsive locator fixes, and Actions Taken/resolution E2E alignment. | Thanked the reviewer and confirmed the test-stabilization work removed the remaining flakiness. |

The comments and responses above were checked against the GitHub review and issue-comment records for each linked PR.

## 4. Verification Evidence

- Branch: `chore/lab4-hardening`
- Base: merged `origin/lab4-staging`
- Server tests: 28 files / 135 tests passed with the shared-database-safe test command.
- Client tests: 19 files / 93 tests passed.
- Migration-copy evidence: `toktickit_migration_test` contained the Lab 3 migration history before
  applying `20260928000000_lab4_actions_taken`; User/Ticket/Attachment/PublicComment/InternalNote
  counts were 1/1/0/0/0 before and after, and the legacy Ticket returned `actionsTaken: []`.
- Dedicated migration-copy test: 2/2 passed in `server/tests/lab-04/migration-copy.test.ts`.
- Lab 4 Playwright suite: 17 passed, 4 skipped; database-mutating flows are intentionally skipped on tablet/mobile.
- Workflow coverage includes stale status rejection, all disallowed transitions, Actions Taken visibility, and empty Actions Taken arrays.

- Test status evidence is maintained in `docs/lab-04/tests.md`.
- Responsive screenshot capture passed 12/12 and is stored under `artifacts/lab-04/screenshots/`:
  - `staff-dashboard/{desktop,tablet,mobile}.png`
  - `requester-dashboard/{desktop,tablet,mobile}.png`
  - `actions-taken/{desktop,tablet,mobile}.png`
  - `actions-taken-requester/{desktop,tablet,mobile}.png`
- The full Lab 4 Playwright rerun is environment-sensitive: seeded accounts must be reset with `npm --prefix server run prisma:seed` after earlier E2E password-changing tests.

### Remaining GitHub review evidence

The following release-level items still need to be copied from the actual GitHub pages before PDF submission:

- Hardening PR: `[fill actual GitHub PR URL]`
- Hardening approval/comment evidence: `[attach GitHub screenshot or link]`
- Merge evidence into `main`: `[fill actual GitHub PR URL and merge timestamp]`

## 5. Summary

Lab 4 feature branches were merged into `lab4-staging`, and the hardening branch contains the
regression fixes, responsive evidence, documentation updates, and 12 responsive screenshots. The
Feature-PR reviewer identity, comments, approvals, and responses are recorded above from GitHub.
The hardening PR and release merge into `main` must still be added before the final PDF is submitted.

## Review focus

1. Confirm the server and client test commands are run from a clean database state.
2. Review desktop, tablet, and mobile screenshots for overflow, clipping, and overlap.
3. Check keyboard focus, associated labels, and non-color status cues on dashboards and Actions Taken.
4. Confirm README setup, migration, seed, test, and demo instructions match the current repository.
