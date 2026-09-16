# Lab 3 — AI Use Disclosure

## Tool Used

- **AI tool:** OpenAI Codex
- **Model:** GPT-5-based Codex agent
- **Purpose:** Code assistance, test planning, debugging, UI/specification review, and documentation.

## Prompt History

| # | Prompt | Purpose / Outcome |
| --- | --- | --- |
| 1 | Complete the Lab 3 schema migration, manual SQL, seed data, roles, statuses, ownership fields, and comments/notes tables. | Assisted with migration safety, schema alignment, seed hashing, and test-data coverage. |
| 2 | Implement authentication with sessions, role guards, and mandatory password changes. | Assisted with authentication flow, protected routes, 401 handling, and password-change behavior. |
| 3 | Diagnose requester regression tests after migrating from the development requester selector. | Updated test setup and mocks to use authenticated sessions and corrected ownership expectations. |
| 4 | Implement the IT Staff ticket queue with filtering, sorting, route guards, and responsive UI. | Assisted with API, UI, navigation, and queue test coverage. |
| 5 | Implement Staff Ticket Detail operations, Public Comments, Internal Notes, and attachment states. | Assisted with API/UI behavior, authorization rules, and related test coverage. |
| 6 | Implement Administrator User Management with admin-only authorization and password reset flow. | Assisted with API, component, and E2E coverage for user administration. |
| 7 | Diagnose concurrent authentication and admin authorization test failures. | Isolated tests from shared seeded state with a dedicated test database and temporary fixtures. |
| 8 | Fix the Staff E2E failure caused by a session-loading redirect. | Added loading-aware route handling and an isolated requester fixture, then revalidated the workflow. |
| 9 | Complete Lab 3 coverage, visual inspection, and E2E stability verification. | Checked executable evidence, responsive screenshots, traceability, and focused workflow results. |
| 10 | Check the Lab 3 changes against the specification and test traceability matrix. | Identified missing coverage and synchronized documentation with executable evidence. |

## Project-wide Assistance Summary

Across the TokTickIT project, AI assistance was used as a development and review aid in these areas:

| Area | How AI assisted |
| --- | --- |
| Requirements and engineering documents | Helped organize the engineering contract, API rules, UI requirements, acceptance criteria, and test traceability. |
| Database and seed data | Helped review the Lab 3 schema migration, manual SQL, role/status data, ownership fields, comments, internal notes, and bcrypt seed setup. |
| Authentication and authorization | Helped reason about sessions, role guards, password-change enforcement, 401/403/404 behavior, requester ownership, staff routes, and admin-only routes. |
| Requester workflow | Helped review public comments, resolved status, legacy-route removal, and migration of Lab 1/Lab 2 regression tests to authenticated sessions. |
| IT Staff and Administrator features | Helped review the staff queue, ticket operations, internal-note isolation, user management, filtering, sorting, and role-specific navigation. |
| Testing and debugging | Helped analyze API, client, migration, regression, concurrent-auth, authorization, E2E, and visual-test failures, including test-database isolation and temporary fixtures. |
| UI and visual verification | Helped check route protection, badge consistency, responsive layouts, screenshot evidence, loading states, and deep-link behavior. |
| Git and release documentation | Helped organize branches, commits, pull-request evidence, merge timelines, reviewer comments, author responses, and release documentation. |

AI suggestions were treated as assistance rather than authoritative output. The implementation, tests, Git history, and GitHub review records were checked before being included in the project documentation.

## Reflection and Critical Review

AI was used for documentation maintenance and evidence verification in this release-documentation branch. It helped restructure the PR evidence table, retrieve and organize the actual GitHub review and response text, and summarize the branch history.

The GitHub review and response text was checked against the repository's pull-request API rather than being invented from the surrounding context. The resulting table preserves the original wording and links each entry to its source. Git history and the working tree were also checked after each documentation change, and every requested update was committed to the branch.
