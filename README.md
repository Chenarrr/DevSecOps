# DevSecOps — Full-Stack Notes App with Automated Pipeline

A full-stack notes application with a complete DevSecOps pipeline. Push code and everything happens automatically: lint, build, security scan, push to registry, update Kubernetes manifests, and deploy via GitOps — zero manual intervention.

---

## Architecture

```
DevSecOps Repo (this repo)                k8s-Infra- Repo
+-- frontend/ (React + Vite)              +-- charts/notes-app/ (Helm chart)
+-- backend/ (Express.js)                 +-- app/ (Flux HelmRelease)
+-- .github/workflows/ci.yml              +-- clusters/ (Flux Kustomization)
         |                                         |
    GitHub Actions                          Flux CD (every 1 min)
    1. Lint frontend                        1. Detects new commit
    2. Build frontend + backend             2. Reconciles HelmRelease
    3. Docker build + push                  3. Helm renders templates
    4. Trivy security scan                  4. Rolling update (zero downtime)
    5. Update image tags ----------->       5. New pods running
```

---

## DevSecOps Pipeline

### Pipeline Flow (`.github/workflows/ci.yml`)

Triggered on every push/PR to `main`. Five jobs, three stages:

```
Stage 1 (parallel):
  frontend job                backend job
    - checkout                  - checkout
    - node 22 + cache           - node 22 + cache
    - npm install               - npm ci
    - npm run lint
    - npm run build
          |                         |
          +---------- + -----------+
                      |
Stage 2:        docker job (needs both)
                  - setup buildx
                  - login Docker Hub (main only)
                  - build frontend image (multi-stage)
                  - build backend image (multi-stage)
                  - push to Docker Hub with tags:
                      chenarrr/devops:frontend
                      chenarrr/devops:frontend-<7-char-sha>
                      chenarrr/devops:backend
                      chenarrr/devops:backend-<7-char-sha>
                  - GitHub Actions cache (type=gha) for layer reuse
                      |
          +-----------+-----------+
          |                       |
Stage 3 (parallel, main only):
  update-k8s job            security job
    - checkout                - Trivy scan frontend image
      k8s-Infra- repo          (CRITICAL + HIGH severity)
    - sed to update           - Trivy scan backend image
      image tags in             (CRITICAL + HIGH severity)
      values.yaml             - exit-code: 0 (report only,
    - git commit + push         doesn't block deploy)
```

### What Each Job Does

| Job | Trigger | Purpose |
|-----|---------|---------|
| `frontend` | push/PR to main | Install deps, lint (ESLint), build (Vite) |
| `backend` | push/PR to main | Install deps (`npm ci`) |
| `docker` | after frontend + backend pass | Build multi-stage Docker images, push to Docker Hub |
| `update-k8s` | main branch only, after docker | Update image tags in k8s-Infra- Helm values via `sed` |
| `security` | main branch only, after docker | Trivy vulnerability scan on both images |

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `DOCKERHUB_USERNAME` | Docker Hub login (`chenarrr`) |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `GIT_TOKEN` | GitHub PAT with repo scope (pushes to k8s-Infra-) |

### How Image Tags Get Updated

The `update-k8s` job checks out the `k8s-Infra-` repo and runs:

```bash
sed -i "s|tag: frontend-.*|tag: frontend-<sha>|" charts/notes-app/values.yaml
sed -i "s|tag: backend-.*|tag: backend-<sha>|" charts/notes-app/values.yaml
```

Then commits as `github-actions[bot]` and pushes. Flux picks up the new commit within 1 minute and deploys.

### Security Scanning (Trivy)

Both images are scanned after every push to main:

```yaml
- uses: aquasecurity/trivy-action@0.33.1
  with:
    image-ref: chenarrr/devops:frontend
    format: table
    exit-code: 0              # Report only (doesn't block pipeline)
    severity: CRITICAL,HIGH   # Only flag serious vulnerabilities
```

Scan results appear in the GitHub Actions logs. Currently set to `exit-code: 0` (non-blocking). Change to `exit-code: 1` to block deploys on vulnerabilities.

---

## Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | React 19 + Vite 7 | SPA served by Nginx 1.27-alpine |
| Backend | Express.js + Node 22 | REST API on port 5000 |
| Database | MongoDB 8 | Document store on port 27017 |
| Container | Docker (multi-stage) | Alpine-based, minimal image size |
| CI/CD | GitHub Actions | 5 jobs, parallel execution |
| Security | Trivy | Container image vulnerability scanning |
| GitOps | Flux CD | Auto-deploy from k8s-Infra- repo |
| Cluster | Kubernetes v1.28 | kubeadm, Flannel CNI |
| Ingress | NGINX Ingress Controller | Routes external traffic |
| Management | Rancher | Web UI for cluster |
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
|   +-- nginx.conf             <- Nginx config (SPA + reverse proxy to backend)
|   +-- vite.config.js         <- Vite dev server config
|   +-- Dockerfile             <- Multi-stage build (node -> nginx:1.27-alpine)
|   +-- package.json           <- Dependencies (react, axios, react-markdown)
|   +-- .dockerignore
+-- docker-compose.yml         <- Local dev environment (all 3 services)
+-- .github/
|   +-- workflows/
|       +-- ci.yml             <- Full CI/CD pipeline (5 jobs)
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

### Data Model (MongoDB)

```javascript
{
  title: String,
  content: String,
  pinned: Boolean (default: false),
  tags: [String] (default: []),
  createdAt: Date,         // auto via timestamps
  updatedAt: Date          // auto via timestamps
}
```

Notes are sorted by `pinned: -1, createdAt: -1` (pinned first, then newest).

---

## Docker Images

Both images use multi-stage builds for smaller size.

### Backend (`backend/Dockerfile`)

```dockerfile
# Stage 1: Install production deps only
FROM node:22-alpine AS deps
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production image
FROM node:22-alpine
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
EXPOSE 5000
HEALTHCHECK CMD curl -f http://localhost:5000/api/notes || exit 1
USER node                  # Runs as non-root
CMD ["node", "server.js"]
```

### Frontend (`frontend/Dockerfile`)

```dockerfile
# Stage 1: Build React app
FROM node:22-alpine AS build
RUN npm install && npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK CMD curl -f http://localhost:80/ || exit 1
```

### Image Tags

Pushed to Docker Hub as `chenarrr/devops`:

| Tag | Purpose |
|-----|---------|
| `frontend` | Latest from main (mutable) |
| `frontend-<7-char-sha>` | Specific commit (immutable) |
| `backend` | Latest from main (mutable) |
| `backend-<7-char-sha>` | Specific commit (immutable) |

Kubernetes always uses the SHA-tagged images for traceability.

---

## Nginx Configuration (`frontend/nginx.conf`)

```nginx
server {
    listen 80;

    location / {
        # Serve React SPA — all routes fall back to index.html
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        # Reverse proxy to backend service on port 5000
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

This works in both environments because the backend service is named `backend` in both Docker Compose and Kubernetes (Helm chart `backend.name: backend`).

---

## Local Development

### With Docker Compose

```bash
docker compose up --build
```

| Service | URL | Port Mapping |
|---------|-----|--------------|
| Frontend | http://localhost:3000 | 3000 -> 80 |
| Backend | http://localhost:5001 | 5001 -> 5000 |
| MongoDB | localhost:27017 | 27017 -> 27017 |

All services have health checks. Backend waits for MongoDB to be healthy. Frontend waits for backend.

### Without Docker

```bash
# Terminal 1 - MongoDB (needs to be running)
mongosh

# Terminal 2 - Backend
cd backend
npm install
npm run dev

# Terminal 3 - Frontend
cd frontend
npm install
npm run dev
```

Frontend dev server proxies `/api` requests to `backend:5000` (configure in `vite.config.js`).

---

## Environment Variables

| Variable | Default | Used By | In Kubernetes |
|----------|---------|---------|---------------|
| `MONGODB_URI` | `mongodb://localhost:27017/notes-app` | Backend | `mongodb://mongodb-service:27017/notes-app` |
| `NODE_ENV` | `production` | Backend | `production` |

---

## How the Full Pipeline Works (End to End)

```
1. Developer pushes code to DevSecOps repo (main branch)
       |
2. GitHub Actions triggers CI pipeline
       |
3. Frontend job: npm install -> lint -> build
   Backend job: npm ci (run in parallel)
       |
4. Docker job: build multi-stage images -> push to Docker Hub
       |
5. Security job: Trivy scans both images (CRITICAL + HIGH)
   update-k8s job: sed updates image tags in k8s-Infra-/values.yaml
       |
6. Flux CD detects new commit in k8s-Infra- (within 1 minute)
       |
7. Flux reads HelmRelease -> Helm renders templates with new tags
       |
8. Kubernetes rolling update -> new pods with new images
       |
9. App is live with zero downtime
```

---

## Kubernetes Deployment (via k8s-Infra- repo)

The Helm chart in the [k8s-Infra-](https://github.com/Chenarrr/k8s-Infra-) repo creates these resources:

| Resource | Name | Details |
|----------|------|---------|
| Deployment | backend | 1 replica, non-root, resource limits |
| Deployment | frontend | 1 replica, resource limits |
| StatefulSet | mongodb | 1 replica, 5Gi PV on hostPath |
| Service | backend | ClusterIP:5000 |
| Service | frontend | ClusterIP:80 |
| Service | mongodb-service | Headless (ClusterIP: None) |
| Ingress | notes-app-ingress | NGINX class, routes `/` to frontend |
| PersistentVolume | mongodb-pv | 5Gi, hostPath `/mnt/data/mongodb` |
| PersistentVolumeClaim | mongodb-pvc | Bound to mongodb-pv |

All resources use standard Kubernetes labels generated by Helm `_helpers.tpl`:

```yaml
helm.sh/chart: notes-app-0.1.0
app.kubernetes.io/managed-by: Helm
app.kubernetes.io/instance: notes-app
app.kubernetes.io/version: "1.0.0"
app.kubernetes.io/part-of: notes-app
app.kubernetes.io/name: <component>
app.kubernetes.io/component: <role>
```

See the [k8s-Infra- README](https://github.com/Chenarrr/k8s-Infra-) for full Helm chart documentation, cluster setup, and troubleshooting.

---

## Related Repos

| Repo | Purpose |
|------|---------|
| [DevSecOps](https://github.com/Chenarrr/DevSecOps) (this repo) | Application code + CI/CD pipeline |
| [k8s-Infra-](https://github.com/Chenarrr/k8s-Infra-) | Kubernetes infrastructure + Helm charts + Flux CD |
