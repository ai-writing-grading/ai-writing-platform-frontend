# AI Writing Platform — Frontend

A React + TypeScript single-page application that provides the user interface for the AI Writing Platform. It communicates exclusively with the backend API Gateway and is served via Nginx in production.

---

## Architecture Overview

```
ai-writing-platform-frontend/
├── src/
│   ├── pages/          # Page-level components (Editor, Dashboard, Review, etc.)
│   ├── lib/
│   │   └── api.ts      # Centralised API client (axios / fetch wrapper)
│   ├── App.tsx         # Root component with routing
│   └── main.tsx        # React entry point
├── Dockerfile          # Multi-stage build: Node 20 → Nginx Alpine
├── nginx.conf          # SPA fallback routing, listens on port 3000
├── vite.config.ts
└── .env.local.example
```

### Pages


| Route           | Component      | Description                           |
| --------------- | -------------- | ------------------------------------- |
| `/`             | `Home`         | Landing / welcome screen              |
| `/login`        | `Login`        | JWT authentication                    |
| `/dashboard`    | `Dashboard`    | Usage statistics and recent documents |
| `/editor`       | `Editor`       | AI-assisted writing editor            |
| `/review`       | `Review`       | Human-in-the-loop review queue        |
| `/batch`        | `Batch`        | Batch document processing             |
| `/upload`       | `Upload`       | Document upload (PDF / DOCX)          |
| `/learn`        | `Learn`        | Knowledge base / suggestions          |
| `/preferences`  | `Preferences`  | User settings                         |
| `/subscription` | `Subscription` | Stripe billing management             |


### Tech Stack


| Layer      | Choice                     |
| ---------- | -------------------------- |
| Framework  | React 18 + TypeScript      |
| Build tool | Vite 5                     |
| Router     | React Router DOM 6         |
| Charts     | Recharts                   |
| Linting    | ESLint + TypeScript ESLint |
| Runtime    | Nginx Alpine (port 3000)   |


The frontend has **no direct database or AI dependencies**. All data flows through the single API Gateway at `VITE_API_GATEWAY_URL`.

---

## Local Development

### Prerequisites

- Node.js 20+
- npm 9+
- Backend API Gateway running (see `ai-writing-platform-backend`)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create local environment file
cp .env.local.example .env.local
# Edit .env.local and set:
#   VITE_API_GATEWAY_URL=http://localhost:8000

# 3. Start development server (hot reload)
npm run dev
```

The app will be available at `http://localhost:5173` by default.

### Running Without the Full Stack

Only the API Gateway needs to be accessible — the rest of the backend microservices are optional depending on which features you are developing. To bring up just the required infrastructure and the gateway:

```bash
# In ai-writing-platform-backend/infrastructure:
docker compose up postgres redis api_gateway -d
```

Alternatively, run the API Gateway natively (no Docker required). See the [backend README](../ai-writing-platform-backend/README.md#independent-service-development) for per-service startup instructions and environment variables.

Set `VITE_API_GATEWAY_URL` in `.env.local` to point at whichever host the gateway is running on, then `npm run dev` as usual.

### Other Scripts

```bash
npm run build    # Production build (outputs to dist/)
npm run preview  # Preview production build locally
npm run lint     # ESLint check (zero warnings enforced)
```

---

## Docker Deployment

### Build and run as a standalone container

```bash
docker build -t ai-writing-frontend .

docker run -p 3000:3000 \
  -e VITE_API_GATEWAY_URL=http://<gateway-host>:8000 \
  ai-writing-frontend
```

The container listens on **port 3000**. The Nginx config handles SPA routing — all paths fall back to `index.html`.

> **Note:** `VITE_` prefixed variables are baked in at build time by Vite. If you need to change the API URL at runtime without rebuilding, replace the variable in the built `index.html` or use a runtime config endpoint.

### Full-stack deployment (recommended)

Use the Docker Compose file provided in the backend repository:

```bash
cd ../ai-writing-platform-backend/infrastructure
cp .env.example .env   # fill in secrets
docker compose up --build
```

This brings up all backend microservices alongside the frontend.

---

## Environment Variables


| Variable               | Default                 | Description                         |
| ---------------------- | ----------------------- | ----------------------------------- |
| `VITE_API_GATEWAY_URL` | `http://localhost:8000` | Base URL of the backend API Gateway |


---

## CI/CD

The GitHub Actions workflow (`.github/workflows/ci.yml` in the backend repo) runs the following checks on every push:

1. `npm run lint` — ESLint with zero warnings
2. `tsc && npm run build` — TypeScript compile + Vite production build
3. Docker image smoke test
4. 2025

