# Notes App - DevSecOps Pipeline

A full-stack notes application with a CI/CD pipeline that builds, scans, and deploys automatically via GitOps.

## Architecture

```
DevSecOps Repo (this repo)          k8s-Infra- Repo
+-- frontend/ (React + Vite)        +-- charts/notes-app/ (Helm chart)
+-- backend/ (Express.js)           +-- app/ (Flux HelmRelease)
+-- .github/workflows/ci.yml        +-- clusters/ (Flux Kustomization)
         |                                    |
    GitHub Actions                     Flux CD (every 1 min)
    1. Lint + Build                    1. Detects new commit
    2. Docker build + push             2. Reconciles HelmRelease
    3. Trivy security scan             3. Rolling update
    4. Update image tags --------->    4. New pods running
```

---

## Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | React 19 + Vite 7 | SPA served by Nginx 1.27 |
| Backend | Express.js + Node 22 | REST API on port 5000 |
| Database | MongoDB 8 | Document store on port 27017 |
| Container | Docker (multi-stage) | Alpine-based images |
| CI/CD | GitHub Actions | Lint, build, scan, deploy |
| Security | Trivy | Image vulnerability scanning |
| GitOps | Flux CD | Auto-deploy from k8s-Infra- repo |
| Registry | Docker Hub | `chenarrr/devops` |

---

## Project Structure

```
DevSecOps/
+-- backend/
|   +-- server.js              <- Express API (CRUD for notes)
|   +-- package.json           <- Dependencies (express, mongoose, cors)
|   +-- Dockerfile             <- Multi-stage build (node:22-alpine)
|   +-- .dockerignore
+-- frontend/
|   +-- src/
|   |   +-- App.jsx            <- React app (notes UI with markdown)
|   |   +-- App.css
|   |   +-- main.jsx
|   +-- nginx.conf             <- Nginx config (serves SPA + proxies /api/)
|   +-- vite.config.js         <- Vite dev server config
|   +-- Dockerfile             <- Multi-stage build (node -> nginx:1.27-alpine)
|   +-- package.json           <- Dependencies (react, axios, react-markdown)
|   +-- .dockerignore
+-- docker-compose.yml         <- Local dev environment
+-- .github/
|   +-- workflows/
|       +-- ci.yml             <- CI/CD pipeline
+-- README.md
```

---

## App Features

- Create, edit, delete notes
- Pin/unpin notes (pinned notes appear first)
- Tag notes and filter by tag
- Search notes by title, content, or tags
- Markdown rendering in note content
- Responsive UI

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List all notes (supports `?tag=` and `?search=` query params) |
| GET | `/api/tags` | List all unique tags |
| POST | `/api/notes` | Create a note |
| PUT | `/api/notes/:id` | Update a note |
| PATCH | `/api/notes/:id/pin` | Toggle pin on a note |
| DELETE | `/api/notes/:id` | Delete a note |

---

## Local Development

### With Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5001
- MongoDB: localhost:27017

### Without Docker

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

Frontend dev server proxies `/api` requests to `backend-service:5000` (configure in `vite.config.js`).

---

## Docker Images

Both images use multi-stage builds for smaller size.

### Backend (`backend/Dockerfile`)

- **Base:** `node:22-alpine`
- **Port:** 5000
- **Runs as:** `node` user (non-root)
- **Health check:** `curl http://localhost:5000/api/notes`
- **Stages:** deps (npm ci) -> production

### Frontend (`frontend/Dockerfile`)

- **Build stage:** `node:22-alpine` (npm install + vite build)
- **Serve stage:** `nginx:1.27-alpine`
- **Port:** 80
- **Health check:** `curl http://localhost:80/`
- **Nginx config:** Serves static files + reverse proxies `/api/` to backend:5000

### Image Tags

Images are pushed to Docker Hub as `chenarrr/devops`:

| Tag | When |
|-----|------|
| `frontend` | Latest from main |
| `frontend-<7-char-sha>` | Specific commit |
| `backend` | Latest from main |
| `backend-<7-char-sha>` | Specific commit |

---

## CI/CD Pipeline (`.github/workflows/ci.yml`)

Triggered on push/PR to `main`.

```
frontend job          backend job
  - checkout            - checkout
  - node 22             - node 22
  - npm install         - npm ci
  - npm run lint
  - npm run build
        |                   |
        +------- + ---------+
                 |
           docker job (needs both)
             - build frontend image
             - build backend image
             - push to Docker Hub (main only)
                 |
        +--------+---------+
        |                  |
  update-k8s job     security job
  (main only)        (main only)
  - checkout           - Trivy scan frontend
    k8s-Infra- repo    - Trivy scan backend
  - update image         (CRITICAL + HIGH)
    tags in
    charts/notes-app/
    values.yaml
  - commit + push
```

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `DOCKERHUB_USERNAME` | Docker Hub login |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `GIT_TOKEN` | GitHub PAT to push to k8s-Infra- repo |

---

## How Deployment Works

1. Push code to this repo's `main` branch
2. GitHub Actions builds and pushes Docker images to Docker Hub
3. GitHub Actions runs Trivy security scan on the images
4. GitHub Actions checks out `k8s-Infra-` repo and updates image tags in `charts/notes-app/values.yaml`
5. Flux CD (running on the cluster) detects the new commit within 1 minute
6. Flux reconciles the HelmRelease, Helm renders templates with new image tags
7. Kubernetes performs a rolling update with zero downtime

---

## Nginx Configuration (`frontend/nginx.conf`)

```
location /        -> serves React SPA (static files)
location /api/    -> reverse proxy to backend:5000
```

This is how the frontend reaches the backend in both Docker Compose and Kubernetes:
- **Docker Compose:** Nginx proxies to service named `backend` on port 5000
- **Kubernetes:** Nginx proxies to service named `backend` on port 5000 (same service name in Helm chart)

---

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/notes-app` | MongoDB connection string |
| `NODE_ENV` | `production` | Node environment |

### Kubernetes values (set in k8s-Infra- Helm chart)

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `mongodb://mongodb-service:27017/notes-app` |
| `NODE_ENV` | `production` (prod) / `development` (dev) |

---

## Related Repos

| Repo | Purpose |
|------|---------|
| [DevSecOps](https://github.com/Chenarrr/DevSecOps) (this repo) | Application code + CI/CD pipeline |
| [k8s-Infra-](https://github.com/Chenarrr/k8s-Infra-) | Kubernetes infrastructure + Helm charts + Flux CD |
