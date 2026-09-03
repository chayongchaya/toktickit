# TokTickIT - IT Service Desk Application

TokTickIT is a full-stack IT service desk web application developed as part of **CPE 334**. It facilitates ticket management, category querying, and system health monitoring through a modern, responsive web interface.

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

# Seed initial categories into the database
npx prisma db seed
cd ..
```

---

## 🚀 Environment Setup

Configure the PostgreSQL connection string in `server/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/toktickit"
```

Start PostgreSQL using your local PostgreSQL service, then run the Prisma setup:

```powershell
cd server
npx prisma generate
npx prisma migrate dev
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

Executes integration tests for API routes (`/health` and `/api/categories`):

```bash
cd server
npm test
```

### Frontend Test Suite

Executes component tests and Mock UI verification:

```bash
cd client
npm test
```

---

## 📡 API Reference (Lab 1)

| Method | Endpoint | Description | Expected Status |
| --- | --- | --- | --- |
| `GET` | `/health` | Health check endpoint returning `{ status: "ok" }` | `200 OK` |
| `GET` | `/api/categories` | Returns an array of ticket categories ordered by ID | `200 OK` |

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