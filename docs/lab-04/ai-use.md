# Lab 4 — AI Use Disclosure

This record documents the AI assistance used during Lab 4 hardening.

## Tool Used

- **AI tool:** OpenAI Codex
- **Model:** GPT-5-based Codex agent
- **Purpose:** Specification review, test planning, debugging, responsive evidence capture, and documentation.

## Prompt History

| # | Prompt | Purpose / Outcome |
| --- | --- | --- |
| 1 | Audit Lab 2-3 regression failures and shared-database fixture races. | Distinguished application failures from fixture and isolation issues. |
| 2 | Implement final hardening without expanding scope. | Checked placeholders, console errors, responsive behavior, accessibility, and documentation. |
| 3 | Add responsive screenshot evidence for the Lab 4 page groups. | Produced 12 desktop, tablet, and mobile screenshots. |
| 4 | Verify Requester Actions Taken is read-only. | Checked role-restricted UI behavior and related tests. |
| 5 | Run server, client, and Playwright suites and update `tests.md` from observed results. | Synchronized Pass statuses with real test output. |
| 6 | Add dedicated server-owned mapping and safe-failure tests. | Added UNIT-02 and SAFE-01 evidence. |
| 7 | Test the additive migration against a Lab 3 PostgreSQL DB copy. | Compared row counts and verified `actionsTaken: []` for a legacy ticket. |
| 8 | Align Lab 4 reviewer and AI-use documents with the Lab 3 format. | Matched the submission evidence structure without inventing GitHub review data. |

### Additional prompt notes

The coding assistance was provided through OpenAI Codex using a GPT-5-based coding model. The
following prompts represent the main requests used during this hardening pass:

1. Audit the Lab 2–3 regression failures and identify shared-database fixture races.
2. Check whether the remaining server test failures are application bugs or fixture/database-isolation issues.
3. Implement final hardening within `chore/lab4-hardening` without expanding the feature scope.
4. Remove runtime console errors, stale placeholders, and obsolete Lab 2 wording.
5. Check the Lab 4 responsive layouts at desktop, tablet, and mobile widths.
6. Add automated screenshot evidence for Staff Dashboard, Requester Dashboard, and Actions Taken.
7. Verify that the Requester Actions Taken screen is read-only and has no Add/Edit controls.
8. Run the server, client, and Playwright suites and update `tests.md` only for observed results.
9. Compare the repository evidence against the handout's PDF capture checklist.

## Project-wide Assistance Summary

| Area | Assistance | Human verification |
|---|---|---|
| Test isolation | Identified shared PostgreSQL fixture races and helped make temporary requester/user identifiers unique. | Server tests were rerun with the repository test command and checked for cleanup failures. |
| Workflow coverage | Helped draft cross-feature API and Playwright cases for stale transitions, Actions Taken visibility, and dashboard navigation. | Assertions were reviewed against `specification.md`, `api-spec.md`, and `ui-spec.md`; full test suites were executed. |
| Documentation | Helped audit `tests.md` statuses and README setup/demo instructions. | Pass statuses were kept only for observed test runs; migration-copy evidence was rerun before being marked Pass. |

AI output was treated as a draft. The repository code, test results, database-copy results, and final scope decisions were reviewed by the team before commit.

## My Reflection

The specification-oriented prompts were useful for tracing the handout requirements to concrete
files, test IDs, and evidence gaps before changing code. The coding-oriented prompts were most useful
for diagnosing nondeterministic fixtures, adding responsive screenshot coverage, and checking the
result against real test output. Human verification was still required for database safety,
screenshot contents, scope decisions, and unverified GitHub reviewer evidence.
