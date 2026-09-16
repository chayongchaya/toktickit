# Lab 3 — AI Use Disclosure

## Tool Used

- **AI tool:** OpenAI Codex
- **Model:** GPT-5-based Codex agent
- **Purpose:** Code assistance, test planning, debugging, UI/specification review, and documentation.

## Prompt History

| # | Prompt | Purpose / Outcome |
| --- | --- | --- |
| 1 | Compare the Staff Ticket Queue implementation with `ui-spec.md` and list missing requirements. | Identified status/priority badge tokens, owner filtering, sorting direction, and responsive card-list gaps. |
| 2 | Check the Lab 3 branch against `tests.md` and identify uncovered API, UI, and E2E cases. | Built the remaining coverage list for queue, detail, admin, authentication, migration, and regression tests. |
| 3 | Implement Staff Ticket Detail operations, Public Comments, Internal Notes, and attachment states within the approved scope. | Added and verified the IT Staff/Administrator detail workflow and its tests. |
| 4 | Verify badge colors byte-for-byte against the Zen Green token table. | Corrected status, priority, and role badge tokens to match `ui-spec.md`. |
| 5 | Diagnose the failing concurrent ticket-number regression test and preserve its uniqueness assertion. | Isolated the test from the seeded account used by auth tests without weakening the concurrency assertion. |
| 6 | Diagnose the admin authorization test failure caused by shared seeded-user state. | Replaced the shared seeded Requester with a temporary fixture that is deleted after the test. |
| 7 | Review all Lab 3 tests and update the traceability matrix only where executable evidence exists. | Added MIG-04 and synchronized the relevant `Pass` entries in `tests.md`. |
| 8 | Check role-specific UI routes and prevent direct navigation to another role's destination. | Added requester-only route guards and verified the client suite. |
| 9 | Diagnose the failing Staff E2E test where the Requester could not see the newly posted Public Comment. | Traced the failure to a session-loading redirect, added loading-aware guards and an isolated requester fixture, then re-ran the focused workflow successfully. |

## Reflection and Critical Review

AI was useful for cross-referencing the specification, implementation, and tests, and for finding missing coverage and shared-fixture interference. It also helped review responsive UI details and isolate failures caused by mutable test-database state.

The suggestions were not accepted blindly. I inspected the actual routes, Prisma queries, test helpers, and failure output, then verified the changes with the server suite, client suite, and TypeScript checks. A key limitation was that generated reports and a reused test database could show stale or order-dependent failures, so the fixes were reproduced against the test database and the tests were changed to use isolated fixtures where appropriate.
