# DevSecOps Notes App

A full-stack notes application with a complete CI/CD pipeline, container security scanning, and GitOps-based Kubernetes deployment.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Nginx |
| Backend | Express.js, Mongoose |
| Database | MongoDB 8 |
| Containers | Docker (multi-stage builds) |
| CI/CD | GitHub Actions |
| Security | Trivy vulnerability scanning |
| Deployment | Kubernetes via GitOps ([k8s-Infra-](https://github.com/Chenarrr/k8s-Infra-)) |

## Project Structure

```
.
├── frontend/          # React + Vite app served by Nginx
├── backend/           # Express REST API
├── docker-compose.yml # Local development environment
└── .github/workflows/ # CI/CD pipeline
```

## Getting Started

```bash
docker-compose up
```

The app will be available at **http://localhost:3000**.

| Service  | Port |
|----------|------|
| Frontend | 3000 |
| Backend  | 5001 |
| MongoDB  | 27017 |

### Other Commands

```bash
docker-compose down              # Stop all services
docker-compose build --no-cache  # Rebuild images
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | Get all notes |
| POST | `/api/notes` | Create a note |
| DELETE | `/api/notes/:id` | Delete a note |

## CI/CD Pipeline

Triggered on push/PR to `main`:

```
frontend (lint + build)  ──┐
                           ├──> docker (build + push) ──┬──> update-k8s (GitOps)
backend (install + test)  ──┘                           └──> security (Trivy scan)
```

### Jobs

1. **frontend** - `npm ci`, lint, build
2. **backend** - `npm ci`
3. **docker** - Build and push images to Docker Hub
4. **update-k8s** - Update image tags in [k8s-Infra-](https://github.com/Chenarrr/k8s-Infra-) repo
5. **security** - Trivy scan for CRITICAL/HIGH vulnerabilities

### Required Secrets

| Secret | Purpose |
|--------|---------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `GIT_TOKEN` | GitHub PAT with repo scope (for k8s-Infra- access) |
