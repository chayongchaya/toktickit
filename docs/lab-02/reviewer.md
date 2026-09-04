# Lab 2 — Peer Review Record

This document is evidence for Part 1 (Git Use with Engineering Workflow) of the Lab 2 submission. It details real reviewer identities, PR links, actual comments, and author responses for Lab 2, compiled directly from the GitHub PR history of `chayongchaya/toktickit`.

## 1. Reviewer Identity

| Role | Name - Student ID | GitHub Username |
| --- | --- | --- |
| Author (this repo) | Kulchaya Paipinij - 67070503406 | @chayongchaya |
| Peer Reviewer | Chayanit Kuntanarumitkul - 67070503408 | @chayanitkunt |

## 2. Pull Requests Reviewed in Lab 2

Every PR merged into Kulchaya's repo (`chayongchaya/toktickit`), as reviewed by @chayanitkunt. All PRs below merged into `lab2-staging` (not `main` — see note at the end of this section).

| PR # | Title | Branch → Target | Merge Commit | Linked Issue | Merged | Reviewer | Approval Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [#19](https://github.com/chayongchaya/toktickit/pull/19) | docs(lab-02): complete sprint 2 specifications and test plan | `feature/lab2-spec-and-test-plan` → `lab2-staging` | `d53c1ea` | #11 | last week | @chayanitkunt | ✅ Approved & Merged |
| [#20](https://github.com/chayongchaya/toktickit/pull/20) | feat(db): database schema and seed data | `feature/database-and-seed` → `lab2-staging` | `8d31df5` | #12 | last week | @chayanitkunt | ✅ Approved & Merged |
| [#21](https://github.com/chayongchaya/toktickit/pull/21) | feat: development requester context | `feature/dev-requester-context` → `lab2-staging` | `82f3b1a` | #13 | last week | @chayanitkunt | ✅ Approved & Merged |
| [#22](https://github.com/chayongchaya/toktickit/pull/22) | feat: ticket creation form | `feature/ticket-creation` → `lab2-staging` | `60c3b0f` | #14 | last week | @chayanitkunt | ✅ Approved & Merged |
| [#23](https://github.com/chayongchaya/toktickit/pull/23) | feat: ticket list screen | `feature/ticket-list` → `lab2-staging` | `0d71422` | #15 | last week | @chayanitkunt | ✅ Approved & Merged |
| [#24](https://github.com/chayongchaya/toktickit/pull/24) | feat: ticket details screen | `feature/ticket-details` → `lab2-staging` | `0a1174b` | #16 | last week | @chayanitkunt | ✅ Approved & Merged |
| [#25](https://github.com/chayongchaya/toktickit/pull/25) | feat: Responsive Styling, Playwright E2E Tests & Visual Verification | `feature/responsive-ui-e2e` → `lab2-staging` | `d797e4b` | #17 | 5 days ago | @chayanitkunt | ✅ Approved & Merged |
| [#27](https://github.com/chayongchaya/toktickit/pull/27) | fix: ticket attachment ownership and ticket detail API tests | `fix/-ticket-attachment-ownership` → `lab2-staging` | `ee3161c` | #26 | 4 days ago | @chayanitkunt | ✅ Approved & Merged |
| [#29](https://github.com/chayongchaya/toktickit/pull/29) | fix: Lab 02 client component tests | `test/client-component-tests` → `lab2-staging` | `96a46f0` | #28 | 2 days ago | @chayanitkunt | ✅ Approved & Merged |
| [#31](https://github.com/chayongchaya/toktickit/pull/31) | fix: preserve attachment filename and remove unguarded uploads route | `lab2/fix-attachment-original-filename` → `lab2-staging` | `aa43caf` | #30 | yesterday | @chayanitkunt | ✅ Approved & Merged |
| [#33](https://github.com/chayongchaya/toktickit/pull/33) | fix: itPriority medium default and duplicate guard | `fix-ticket-creation-business-rules` → `lab2-staging` | `ed23d9d` | #32 | yesterday | @chayanitkunt | ✅ Approved (comment, no formal review label) |
| [#35](https://github.com/chayongchaya/toktickit/pull/35) | test: add missing planned tests (UNIT-01, API-03b, API-08) | `add-missing-lab2-tests` → `lab2-staging` | `fdf3d7c` | #34 | yesterday | @chayanitkunt | ✅ Approved & Merged |
| [#36](https://github.com/chayongchaya/toktickit/pull/36) | fix: implement attachment metadata endpoint, server tests, and test scripts | `feat/lab2-backend-and-tests` → `lab2-staging` | `47c6036` | #37 | yesterday | @chayanitkunt | ✅ Approved & Merged |
| [#38](https://github.com/chayongchaya/toktickit/pull/38) | fix: adjust Lab 2 UI | `fix/ui-adjustments` → `lab2-staging` | `92aea20` | #39 | yesterday | @chayanitkunt | ✅ Approved & Merged |
| [#41](https://github.com/chayongchaya/toktickit/pull/41) | fix(test): fix test command and active reference fixtures | `fix/lab2-fixtures` → `lab2-staging` | `d56a5e7` | #40 | yesterday | @chayanitkunt | ✅ Approved & Merged |
| [#42](https://github.com/chayongchaya/toktickit/pull/42) | docs: fix spec mismatch, reviewer evidence, and missing files | `update/docs/lab2-spec-and-deliverables` → `lab2-staging` | `bdaf375` | #18 | 4 minutes ago | @chayanitkunt | ✅ Approved & Merged |

### Release into `main`

| PR # | Title | Branch → Target | Merge Commit | Merged | Reviewer | Approval Status |
| --- | --- | --- | --- | --- | --- | --- |
| [#43](https://github.com/chayongchaya/toktickit/pull/43) | complete lab-02 | `lab2-staging` → `main` | `483eeef` | now | @chayanitkunt | ✅ Approved & Merged |

PR #43 consolidated all 49 commits from `lab2-staging` (PRs #19–#42) into `main`, completing the documented release for Lab 2.

## 3. Comments Received (as Author) and Responses

Comments @chayanitkunt left on Kulchaya's (@chayongchaya) PRs, and how they were addressed.

| PR # | Comment | Author Response | Resolved? |
| --- | --- | --- | --- |
| #19 | "Looks good to me! The Lab 2 specification, API specification, UI specification, and test plan are clear and well organized. 👍" | "Thanks for the comment!" | ✅ |
| #20 | "LGTM! Schema and relations are solid (enums, Cascade Delete, and indexes are properly configured). Seed data covers all spec requirements (categories, systems, active/inactive requesters)." | "Thanks for your compliment" | ✅ |
| #21 | "Looks solid! Ready to merge. State management and localStorage persistence are handled cleanly. ProtectedLayout handles route protection seamlessly. API test coverage for active requesters is spot on!" | "Thanks for your help" | ✅ |
| #22 | "Approved! Really solid feature implementation. Flexible API: field aliases (title/summary, priority/requestedPriority) in tickets.ts. Form UX handles loading states, validation messages, and post-submit navigation cleanly. Test Coverage: missing required fields (400) properly tested." | "Thanks for your reviews!" | ✅ |
| #23 | "Approved! Excellent work on this feature. Prisma queries handle case-insensitive search and status filters cleanly. UI features clear loading/empty states and distinct status/priority badges. Clean integration with RequesterContext." | "Thank you for your feedback" | ✅ |
| #24 | "Ship it! Great implementation of the ticket detail view and attachment soft-deletion (DELETE /api/attachments/:id). Backend filtering for active attachments (isRemoved: false) works as expected. Tests for GET /api/tickets/:id (200 & 404) pass cleanly." | "Thank you for checking!" | ✅ |
| #25 | "Approved! Excellent work on the responsive UI and Playwright E2E setup. Responsive styling and Navbar profile dropdown look clean across viewports. Multer upload limits (5MB, PDF/Image types) and 5-attachment quota check are properly handled. E2E spec covers the complete user journey smoothly." | "Thank you so much but right now, I found some bugs on the website about ownership tickets so I will fix the bug and ask for approve again." | ✅ |
| #27 | "Great fix! Approved and ready to merge. Ownership & Isolation: proper 403 checks on ticket details, attachment downloads, and soft-deletes prevent unauthorized cross-user access. Test Coverage: comprehensive API tests cover ownership rules, edge cases, soft-deletes. Route Aliases: clean handling for /api/systems and /api/related-systems." | "Thank you so much for the detailed review and feedback! Merging this into lab2-staging pls." | ✅ |
| #29 | "Approved! Excellent job getting the client component test suite green. Frontend Specs: resolved all UI assertion failures and component test edge cases. Attachment Integration: TicketDetailPage attachment handling now meets all lab requirements cleanly. Maintainability: scoping desktop view selectors and refining layout components makes tests much more robust." | "Thank you for always supporting me!" | ✅ |
| #31 | "Great fixes! Removing the unguarded static /uploads route is a big win for security, and preserving the original filename fixes the display issue cleanly." | "Thanks for your review" | ✅ |
| #33 | "Great fixes on the ticket creation business rules! Approved! Default Priority: itPriority correctly defaults to MEDIUM independently from requestedPriority. Duplicate Guard: the 10-second backend guard effectively prevents accidental duplicate submissions with a 409 Conflict. Solid work keeping all test suites passing!" | "Thank you" | ✅ |
| #35 | "Looks great! Just double-check the deleted lines and run local tests one last time, then good to merge!" | "Thanks for the comment" | ✅ |
| #36 | "Awesome work completing the Definition of Done for Lab 2! Approved and ready to merge. Attachment Metadata Endpoint: GET /api/attachments/:id correctly handles JSON responses, 403 ownership checks, and 404s. Complete Test Coverage: closed all 6 outstanding tests (UNIT-01 through API-09) with green results. Developer DX: root package.json test scripts (test:server & test:client) work seamlessly." | "Thank you so much" | ✅ |
| #38 | "Nice UI polish! Read-only ticket fields are clean and prevent accidental edits. Configurable page size on the ticket list improves UX for large datasets." | "Thanks for helping" | ✅ |
| #41 | "Great job! Approve!" | "thanks" | ✅ |
| #42 | "Excellent documentation and deliverable cleanup! Approved and ready to merge. Specification Sync: Updated §8 to accurately reflect DELETE /api/attachments/:id. Deliverables & Evidence: Real evidence screenshots and formatted AI usage table complete the reviewer checklist. DevOps: Included docker-compose.yml for Postgres environment setup." | "Thank you so much for the review and approval! Merging this now." | ✅ |
| #43 | "approve!" | "Thank you" | ✅ |

## 4. Notable Iteration: PR #25 → #27

PR #25 was approved and merged, but the author proactively flagged a bug discovered post-merge (ticket/attachment ownership validation), which led directly to PR #27 (linked to bug issue #26). This is a good example of the iterative fix-and-retest workflow in the PR history.

## 5. Summary

In Lab 2, 16 feature/fix/test/docs PRs on `chayongchaya/toktickit` (#19–#42) were opened by Kulchaya Paipinij, each linked to a tracked issue, reviewed by Chayanit Kuntanarumitkul (@chayanitkunt), and merged into `lab2-staging`. Reviews covered database schema and seed data, requester context and session handling, ticket CRUD flows, attachment upload/ownership/soft-deletion, responsive UI, Playwright E2E coverage, backend/frontend test completion against the Lab 2 Definition of Done, and final documentation/evidence cleanup. All 16 PRs were approved (15 with an explicit GitHub "Approved" review, 1 — #33 — approved via comment only) and merged by @chayanitkunt.

Finally, PR #43 merged `lab2-staging` into `main` (49 commits, reviewed and approved by @chayanitkunt), completing the documented release for Lab 2. No outstanding items remain.