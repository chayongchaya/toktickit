# Lab 1 — AI Use and Reflection

**LLM/agent used:** Gemini - Flash

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Asked for a clean Git setup process and workflow for Lab 1. | Executed step-by-step commands to initialize the repository, branches, and PRs. |
| 2 | Inquired about `Error: P1001: Can't reach database server at localhost:5432` during Prisma migration. | Identified that the PostgreSQL service was not running, then started it and adjusted database configuration. |
| 3 | Asked how to resolve `docker compose up -d` failing with `no configuration file provided`. | Installed and ran PostgreSQL locally (instead of via Docker) and updated `DATABASE_URL` in `.env` to match. |
| 4 | Asked for the correct `Category` schema based on assignment specs. | Defined the `Category` model with `id` (`Int`, autoincrement), `name` (`String`, unique), and `createdAt`. |
| 5 | Inquired how to solve `@prisma/client did not initialize yet` error. | Ran `npx prisma generate` before migrating and seeding the database. |
| 6 | Asked for the implementation of `seed.ts` using upsert for the 4 categories. | Added idempotent seeding logic for "Account and Access", "Hardware", "Software", and "Network". |
| 7 | Asked how to implement the unit test in `categories.test.ts`. | Replaced `describe.todo` with assertions checking status 200, length of 4, and ordered names using Supertest. |
| 8 | Asked for the implementation of the `GET /api/categories` endpoint. | Added the route handler querying `prisma.category.findMany` ordered by `id: "asc"` with proper safe error handling. |

## Reflection
Structuring prompts by providing exact error logs and file templates helped the agent deliver accurate and immediately usable code snippets. One instance where I had to correct the agent was when it initially suggested a string UUID schema, so I provided the starter code comments to enforce PostgreSQL with integer autoincrement keys instead.