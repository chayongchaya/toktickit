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
| [#101](https://github.com/chayongchaya/toktickit/pull/101) | `chore/lab4-hardening` → `lab4-staging` | `1c61f51` | 2026-09-30 | ✅ Approved & Merged |
| [#102](https://github.com/chayongchaya/toktickit/pull/102) | `lab4-staging` → `main` | `08c6ee5` | 2026-09-30 | ✅ Approved & Merged |

### Hardening branch

**Reviewer for the listed Lab 4 feature PRs:** Chayanit Kuntanarumitkul - 67070503408 (`@chayanitkunt`).

| Branch | Target | Commits | Remote status |
|---|---|---|---|
| `chore/lab4-hardening` | [#101](https://github.com/chayongchaya/toktickit/pull/101) → `lab4-staging` | `fa64a03` … `af5638b`, merge `1c61f51` | ✅ Merged |

## 3. Comments Received and Responses

The following preserves the review comments and author responses from GitHub in the same table format as Lab 3.

| PR # | Reviewer | Comment | Author response |
| --- | --- | --- | --- |
| [#86](https://github.com/chayongchaya/toktickit/pull/86) | @chayanitkunt | Outstanding work establishing the Sprint 4 Spec-DD engineering contract! Approved.<br><br>- **Spec-DD Foundation:** Clear definitions for SLA state transitions, escalation triggers, and immutable activity audit logs in `specification.md`.<br>- **API & UI Alignment:** Standardized endpoint contracts (`/activities`, `/escalate`, `/metrics`) and UI tokens for SLA badges (Healthy, Warning, Breached).<br>- **Test Matrix:** Well-structured test coverage mapping (SLA-01 through E2E-04) ensuring clear verification criteria before implementation. | Thank you so much for the thorough review and sign-off on the Sprint 4 Spec-DD contract! |
| [#88](https://github.com/chayongchaya/toktickit/pull/88) | @chayanitkunt | Excellent database engineering for the Actions Taken foundation. The additive-only SQL migration guarantees zero disruption to legacy Lab 1–3 schema data, and configuring indexes on ticketId and performedById alongside onDelete: Cascade ensures optimal performance and clean relational integrity. The idempotent seed fixtures covering edge cases (0, 1, and multiple actions with follow-up flags) and thorough row-count verification make this solid. | Thank you so much for the thorough review and verification of the database layer. |
| [#90](https://github.com/chayongchaya/toktickit/pull/90) | @chayanitkunt | Robust backend API delivery for the Actions Taken endpoints. Enforcing server-managed timestamps (actionDateTime) and session-derived actors (performedById) effectively prevents tampering, while the cross-ticket isolation guard on PATCH ensures bulletproof data integrity. Adhering to TDD with all test suites (API-01 through API-09) green across 107 tests and atomic commits makes this clean and completely audit-ready. | Thank you so much for the thorough review and sign-off on the API implementation. |
| [#92](https://github.com/chayongchaya/toktickit/pull/92) | @chayanitkunt | Superb work delivering the client-side Actions Taken UI. Replacing the placeholder with a dedicated tab and dynamic badge count gives Staff an intuitive workflow, while strictly rendering a read-only audit log for Requesters enforces proper role separation. Form resilience features—such as in-flight double-submission prevention (§8.5), preserving user inputs during API errors, and conditional field rendering for follow-ups—provide excellent UX. With UI-01 through UI-08 and A11Y-01 passing cleanly, this is ready to merge. | Thank you so much for the detailed review and sign-off on the UI layer. |
| [#94](https://github.com/chayongchaya/toktickit/pull/94) | @chayanitkunt | Essential and well-architected test-hardening fix. Replacing shared seeded records with dedicated, ephemeral fixtures and explicit afterEach teardown cleanly eliminates parallel database mutation collisions. Decoupling requester fixtures from the concurrent authentication suites guarantees deterministic execution and wipes out the intermittent race conditions. With 20/20 test files and 107/107 tests passing consistently, this is solid. | Thank you so much for the thorough review and sign-off on the test-hardening fix. |
| [#96](https://github.com/chayongchaya/toktickit/pull/96) | @chayanitkunt | Approved!<br><br>- **Visual Alignment Polish:** Great addition with commit `62af114` to fine-tune the dashboard visuals against the Sprint 4 UI specification.<br>- **Full-Stack Execution:** Post-login `/dashboard` landing, URL search param drill-downs (`?status=`, `?owner=`, `?currentStatus=`), and role boundaries are rock solid.<br>- **Test Integrity:** All API (10–17), UI (09–12), and E2E (05–06) test suites passing cleanly. | Thank you so much for the comprehensive review and approval. The dashboard visuals, drill-down parameters, and role guards are officially locked in. |
| [#97](https://github.com/chayongchaya/toktickit/pull/97) | @chayanitkunt | Outstanding test stabilization and coverage expansion!<br><br>- **Workflow & Concurrency Coverage:** `ticket-workflow.api.test.ts` thoroughly verifies WORKFLOW-01..06 and CONC-01 stale transition rules with isolated fixtures.<br>- **DB Race Condition Fix:** Adding `--no-file-parallelism` to the server test script cleanly prevents shared PostgreSQL state pollution during integration runs.<br>- **E2E & Spec Alignment:** Responsive locator fixes for mobile navbars and E2E specs for Actions Taken/Resolution keep testing aligned with `docs/lab-04/tests.md`. | Thank you so much for the thorough review and sign-off on the test stabilization and coverage expansion! Passing --no-file-parallelism and refining the mobile navbar locators completely removes the remaining flakiness. |
| [#101](https://github.com/chayongchaya/toktickit/pull/101) | @chayanitkunt | **Approved.** Outstanding final hardening: test isolation and migration safety were verified, the UI received responsive polish including the Requester Actions Taken timeline, status dropdown fixes, and sticky-navbar clipping resolution, and all 12 cross-viewport screenshots were generated cleanly. | Thank you so much for the comprehensive review and sign-off on the final hardening! The test-suite stability, responsive layouts, and verified migration safety make this release ready. |
| [#102](https://github.com/chayongchaya/toktickit/pull/102) | @chayanitkunt | **Approved (LGTM).** Release highlights included additive-only migration and idempotent seed data, API authorization and server-owned fields, the Actions Taken UI, dashboard query-parameter drill-downs, and the server/client/E2E test and visual evidence package. | Thank you so much for the thorough review, detailed sign-off, and final approval. The Lab 4 release is now merged into `main` and the submission package is complete. |

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

### Release merge evidence

The hardening branch was merged into `lab4-staging` through PR #101, and the staging branch was
then merged into `main` through PR #102. The merge commits above are also present in the fetched
remote history. Any approval or review-comment evidence for these release PRs should be captured
from the GitHub PR pages for the final PDF.

## 5. Summary

Lab 4 feature branches were merged into `lab4-staging`, the hardening branch was merged through
PR #101, and the release was merged into `main` through PR #102. The hardening branch contains the
regression fixes, responsive evidence, documentation updates, and 12 responsive screenshots.
The feature-PR reviewer identity, comments, approvals, and responses are recorded above from GitHub.

## Review focus

1. Confirm the server and client test commands are run from a clean database state.
2. Review desktop, tablet, and mobile screenshots for overflow, clipping, and overlap.
3. Check keyboard focus, associated labels, and non-color status cues on dashboards and Actions Taken.
4. Confirm README setup, migration, seed, test, and demo instructions match the current repository.
