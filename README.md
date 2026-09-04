# TokTickIT - IT Service Desk Application

TokTickIT is a full-stack IT service desk web application developed as part of **CPE 334**. This increment (Lab 2) delivers the Requester-facing ticketing MVP: a temporary Development Requester selector (test-only, not real authentication), ticket creation with validated fields and attachments, a searchable/filterable/sortable/paginated My Tickets list, a read-only Ticket Detail screen, and attachment upload/download/soft-removal — all built on the Zen Green UI theme.

---

## 🛠️ Tech Stack

* **Frontend:** React, TypeScript, Vite, Bootstrap
* **Backend:** Node.js, Express, TypeScript
* **Database & ORM:** PostgreSQL, Prisma
* **Containerization:** Docker & Docker Compose
* **Testing:** Vitest, Supertest, React Testing Library

---

## 📁 Project Structure

```
TokTickIT/
├── client/                # React + Vite frontend
│   ├── src/
│   ├── .env.example
│   └── package.json
├── server/                 # Express + TypeScript backend
│   ├── src/
│   ├── prisma/
│   ├── .env.example
│   └── package.json
├── docker-compose.yml       # PostgreSQL container definition
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

* [Node.js](https://nodejs.org/) (v18 or higher)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Running)
* [Git](https://git-scm.com/)

---

### Setup Instructions

#### 1. Environment Configuration

Configure `.env` in both `client/` and `server/` using their `.env.example` templates:

```bash
# In the client directory
cp client/.env.example client/.env

# In the server directory
cp server/.env.example server/.env
```

**Key variables to check/update:**

| File | Variable | Description |
| --- | --- | --- |
| `server/.env` | `DATABASE_URL` | PostgreSQL connection string (must match `docker-compose.yml` credentials) |
| `server/.env` | `PORT` | Port the backend API listens on (default `3000`) |
| `client/.env` | `VITE_API_URL` | Base URL the frontend uses to call the backend API |

If you change the database port/credentials in `docker-compose.yml`, update `DATABASE_URL` accordingly.

#### 2. Install Dependencies

Install required packages for both frontend and backend services:

```bash
# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
cd ..
```

#### 3. Database Initialization (Docker & Prisma)

Start the PostgreSQL container and apply schema migrations with seed data:

```bash
# Start PostgreSQL container in background (from root directory)
docker compose up -d

# Navigate to server and apply schema migrations
cd server
npx prisma migrate dev

# Seed reference data (categories, related systems) and Development Requesters
npx prisma db seed
cd ..
```

---

## 💻 Running the Application

Open two separate terminals to run both services concurrently:

### 1. Start Server (Backend API)

```bash
cd server
npm run dev
```

> Server runs on `http://localhost:3000`

### 2. Start Client (Frontend Web App)

```bash
cd client
npm run dev
```

> Client runs on `http://localhost:5173` by default. If port `5173` is already in use, Vite automatically switches to the next available port (e.g. `5174`) — check your terminal output for the exact URL.

---

## 🧪 Running Automated Tests

### Backend Test Suite

Executes unit and API/integration tests for Lab 2 (reference data, Development Requester context, ticket creation, ticket listing, ticket detail, and attachment upload/download/soft-removal):

```bash
cd server
npm test
```

### Frontend Test Suite

Executes component tests for Development Requester Selection, Create Ticket, My Tickets, Requester Ticket Detail, the Attachment section, and Zen Green style conformance:

```bash
cd client
npm test
```

---

## 📡 API Reference (Lab 2)

| Method | Endpoint | Description | Expected Status |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Health check endpoint returning `{ status: "ok" }` | `200 OK` |
| `GET` | `/api/categories` | Returns active ticket categories | `200 OK` |
| `GET` | `/api/related-systems` (alias: `/api/systems`) | Returns active related systems | `200 OK` |
| `GET` | `/api/requesters` | Returns active Development Requesters (inactive requesters excluded) | `200 OK` |
| `GET` | `/api/tickets` | Returns the selected Requester's tickets, with search, filter, sort, and pagination | `200 OK` |
| `POST` | `/api/tickets` | Creates a new ticket for the selected Requester and returns the generated Ticket Number | `201 Created` |
| `GET` | `/api/tickets/:id` | Returns one owned ticket's details (ownership-checked) | `200 OK` / `403` / `404` |
| `POST` | `/api/tickets/:id/attachments` | Uploads a permitted attachment (JPG/PNG/WEBP/PDF, ≤5 MB, max 5 active per ticket) | `201 Created` |
| `GET` | `/api/attachments/:id` | Returns attachment metadata (ownership-checked, safe fields only) | `200 OK` / `403` / `404` |
| `GET` | `/api/attachments/:id/download` | Streams an active (non-removed) attachment file | `200 OK` / `404` |
| `DELETE` | `/api/attachments/:id` | Soft-removes an attachment with a mandatory reason | `200 OK` / `403` / `404` |

See `docs/lab-02/api-spec.md` for full request/response shapes, validation rules, and error cases.

---

## 🔧 Troubleshooting

| Problem | Possible Cause | Solution |
| --- | --- | --- |
| `docker compose up -d` fails | Port `5432` already in use by another PostgreSQL instance | Stop the conflicting service, or change the exposed port in `docker-compose.yml` and update `DATABASE_URL` |
| `npx prisma migrate dev` fails to connect | Docker container not fully started yet | Wait a few seconds and retry, or check `docker ps` to confirm the container is running |
| Client can't reach the API | `VITE_API_URL` doesn't match the server's actual port | Verify `server/.env` `PORT` matches `client/.env` `VITE_API_URL` |
| `npm install` fails | Node.js version too old | Confirm `node -v` is v18 or higher |

---

## 👥 Contributors

* **Student Name:** Kulchaya Paipinij
* **Student ID:** 67070503406
* **Course:** CPE 334