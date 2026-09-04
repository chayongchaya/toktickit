# Lab 02 — AI Use Disclosure

## Tool Used

- **AI tool:** GitHub Copilot
- **Model:** GPT-5.6 Luna
- **Purpose:** Code assistance, test planning, debugging, and documentation.

## Prompt History

| # | Prompt | Purpose / Outcome |
| --- | --- | --- |
| 1 | Add a metadata-only attachment endpoint with ownership validation. | Implemented `GET /api/attachments/:id` returning safe, ownership-checked metadata. |
| 2 | Fix the Prisma type error for `requestedPriority`. | Corrected the enum typing between the API payload and the Prisma `Priority` enum. |
| 3 | Explain how to run TypeScript checks without generating JavaScript files. | Confirmed `tsc --noEmit` as the check command used before commits. |
| 4 | Create tests for ticket-number format and collision retry logic. | Produced `ticket-number.unit.test.ts`, later corrected after a bug was found (see reflection). |
| 5 | Create an integration test for invalid priorities and inactive reference data. | Produced `reference-data.api.test.ts` covering inactive Category/RelatedSystem/Requester rejection. |
| 6 | Create a concurrent API test using `Promise.all` to verify unique ticket numbers. | Produced the concurrency case in `tickets.create.test.ts` (AC-10). |
| 7 | Fix Thai and space-containing filenames in attachment metadata. | Added `decodeOriginalFileName` to correct Latin-1/UTF-8 mis-decoding. |
| 8 | Add read-only Ticket Number and Ticket Date fields to the Create Ticket page. | Applied per peer-review feedback in `reviewer.md`. |
| 9 | Add a configurable page-size selector to the Ticket List page. | Applied per peer-review feedback in `reviewer.md`. |
| 10 | Create Git branches, commits, and pull requests for the completed work. | Used to draft branch names/commit messages for the required feature-branch workflow. |

## Reflection and Critical Review

AI was useful for suggesting test scenarios, TypeScript fixes, regular expressions, API assertions, and Git commands. It also helped identify edge cases such as inactive requesters, inactive reference data, filename encoding, ticket-number collisions, and pagination changes.

However, some AI suggestions were incomplete or incorrect. For example, it initially suggested testing `createTicketWithUniqueNumber` without ensuring that the function was exported. It also assumed response properties and ticket-number formats without first checking the actual implementation. The concurrency test exposed another issue: several requests returned HTTP 500 because the retry logic did not generate a sufficiently different number after a collision. The filename test also revealed incorrect UTF-8/Latin-1 decoding.

I verified the suggestions by running `npx tsc --noEmit` and the relevant Vitest test files. I inspected the actual error messages, compared them with the source code and Prisma schema, and modified the implementation and tests accordingly. I treated AI output as guidance and validated all changes through compilation, automated tests, and manual code review.
