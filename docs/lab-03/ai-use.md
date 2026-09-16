# Lab 3 — AI Use Disclosure

## Tool Used

- **AI tool:** OpenAI Codex
- **Model:** GPT-5-based Codex agent
- **Purpose:** Code assistance, test planning, debugging, UI/specification review, and documentation.

## Prompt History

| # | Prompt | Purpose / Outcome |
| --- | --- | --- |
| 1 | Combine the Lab 3 PR table and merge timeline into one table. | Added `Merged at (UTC)` as a column in the existing PR table and removed the separate timeline table. |
| 2 | Check whether the reviewer comments in `reviewer.md` were actually written by the peer reviewer. | Queried the GitHub pull-request review history and confirmed the reviewer identity, approval state, and review text. |
| 3 | Use the actual comments from GitHub. | Replaced paraphrased review summaries with the review text retrieved from GitHub and linked each review. |
| 4 | Include the author's responses in the same table. | Retrieved the author's actual PR comments and added them beside the corresponding reviewer comments. |
| 5 | Remove the `Review`, `Author comment`, and `GitHub` labels from the table. | Simplified the table labels while preserving the review and response text. |
| 6 | Summarize all changes in the current branch. | Compared the branch history with `lab3-staging` and summarized the documentation commits and changed files. |

## Reflection and Critical Review

AI was used for documentation maintenance and evidence verification in this release-documentation branch. It helped restructure the PR evidence table, retrieve and organize the actual GitHub review and response text, and summarize the branch history.

The GitHub review and response text was checked against the repository's pull-request API rather than being invented from the surrounding context. The resulting table preserves the original wording and links each entry to its source. Git history and the working tree were also checked after each documentation change, and every requested update was committed to the branch.
