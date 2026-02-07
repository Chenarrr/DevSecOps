# k8s-Infra-

Kubernetes manifests for the [DevSecOps Notes App](https://github.com/Chenarrr/DevSecOps). Image tags are automatically updated by the CI/CD pipeline via GitOps.

## How It Works

```
DevSecOps repo (push to main)
  └──> GitHub Actions builds Docker images
        └──> CI updates image tags in this repo
              └──> GitOps tool (e.g. ArgoCD) syncs to cluster
```

1. A push to `main` in the [DevSecOps](https://github.com/Chenarrr/DevSecOps) repo triggers CI
2. Docker images are built and pushed to Docker Hub with a git SHA tag
3. The CI job updates the image tags in this repo's deployment manifests
4. A GitOps controller detects the change and deploys to the cluster

## Manifests

| File | Description |
|------|-------------|
| `frontend-deployment.yaml` | Frontend deployment (Nginx serving React app) |
| `backend-deployment.yaml` | Backend deployment (Express API) |

## Image Tags

Images follow the format:

```
chenarrr/devops:frontend-<git-sha>
chenarrr/devops:backend-<git-sha>
```

Tags are updated automatically by the `update-k8s` job in the [CI workflow](https://github.com/Chenarrr/DevSecOps/blob/main/.github/workflows/ci.yml).
