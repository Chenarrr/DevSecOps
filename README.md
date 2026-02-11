# Kubernetes Full-Stack Deployment with Flux CD (GitOps)

## 🏗️ Infrastructure Overview

```
Your Laptop
    ↓ git push
GitHub (k8s-Infra- repo)
    ↓ Flux detects change (1 min)
DigitalOcean VM1 (142.93.28.130)
    └── Multipass
        ├── cp-1 (Control Plane)
        └── worker-1 (Worker Node)
            └── Notes App (Frontend + Backend + MongoDB)
```

---

## 📦 What's Running

| Component | Namespace | Purpose |
|-----------|-----------|---------|
| Frontend (React) | notes-app | User interface |
| Backend (Express) | notes-app | API server |
| MongoDB | notes-app | Database |
| NGINX Ingress | ingress-nginx | Routes traffic |
| Flannel | kube-flannel | Pod networking (CNI) |
| Flux CD | flux-system | GitOps auto-deployment |

---

## ⚙️ How GitOps Works (Flux CD)

```
1. You edit code on laptop
        ↓
2. git push to GitHub
        ↓
3. GitHub Actions builds new Docker image
        ↓
4. GitHub Actions updates image tag in k8s-Infra- repo
        ↓
5. Flux detects change in k8s-Infra- repo (every 1 min)
        ↓
6. Flux applies new manifests to cluster automatically
        ↓
7. Kubernetes rolling update (zero downtime)
        ↓
8. New pods running with new image ✅
```

**You only need to push code. Everything else is automatic!**

---

## ⚠️ STATIC - Copy Paste Exactly (Never Changes)

### Step 1: Fix DNS on VM1 (Run Once)

```bash
# On VM1 (DigitalOcean)
sudo systemctl disable systemd-resolved
sudo systemctl stop systemd-resolved
sudo rm /etc/resolv.conf
sudo tee /etc/resolv.conf <<EOF
nameserver 8.8.8.8
nameserver 8.8.4.4
EOF
```

### Step 2: Create VMs

```bash
multipass launch --name cp-1 --cpus 2 --memory 2.5G --disk 20G 22.04
multipass launch --name worker-1 --cpus 2 --memory 2G --disk 20G 22.04
```

### Step 3: Setup cp-1

```bash
multipass shell cp-1

# Install dependencies
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gpg containerd

# Add Kubernetes repo
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list

# Install Kubernetes tools
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

# Configure containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl restart containerd

# Fix DNS on cp-1
sudo mkdir -p /etc/systemd/resolved.conf.d
sudo tee /etc/systemd/resolved.conf.d/dns.conf <<EOF
[Resolve]
DNS=8.8.8.8 8.8.4.4
FallbackDNS=1.1.1.1
EOF
sudo systemctl restart systemd-resolved

# Disable swap
sudo swapoff -a

# Init cluster (use cp-1 IP)
sudo kubeadm init --pod-network-cidr=10.244.0.0/16 --apiserver-advertise-address=$(hostname -I | awk '{print $1}')

# Setup kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Install Flannel CNI
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
```

### Step 4: Setup worker-1

```bash
# On worker-1 - fix DNS first
multipass shell worker-1

sudo mkdir -p /etc/systemd/resolved.conf.d
sudo tee /etc/systemd/resolved.conf.d/dns.conf <<EOF
[Resolve]
DNS=8.8.8.8 8.8.4.4
FallbackDNS=1.1.1.1
EOF
sudo systemctl restart systemd-resolved

# Same Kubernetes install steps as cp-1 (except kubeadm init)
# Then run join command from Step 5
```

### Step 5: Install Ingress Controller

```bash
# On cp-1
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/baremetal/deploy.yaml
```

### Step 6: Deploy Notes App

```bash
# On cp-1
git clone https://github.com/Chenarrr/k8s-Infra-.git
cd k8s-Infra-

kubectl apply -f namespace.yaml
kubectl apply -f mongodb/
kubectl apply -f backend/
kubectl apply -f frontend/
kubectl apply -f ingress.yaml
```

### Step 7: Fix CoreDNS

```bash
kubectl get configmap coredns -n kube-system -o yaml | \
  sed 's|forward . /etc/resolv.conf|forward . 8.8.8.8 8.8.4.4|g' | \
  kubectl apply -f -

kubectl delete pods -n kube-system -l k8s-app=kube-dns
```

### Step 8: Install Flux CD

```bash
# Install Flux CLI
curl -LO https://github.com/fluxcd/flux2/releases/download/v2.2.3/flux_2.2.3_linux_amd64.tar.gz
tar -xzf flux_2.2.3_linux_amd64.tar.gz
sudo mv flux /usr/local/bin/

# Set GitHub token
export GITHUB_TOKEN=your_github_token_here

# Bootstrap Flux
flux bootstrap github \
  --owner=Chenarrr \
  --repository=k8s-Infra- \
  --branch=main \
  --path=flux-system \
  --personal

# Verify
flux get all
```

---

## ⚡ DYNAMIC - Check Every Time After Restart

### Get cp-1 IP

```bash
multipass list
# cp-1 IP changes after every VM recreation
```

### Get Worker Join Command

```bash
# On cp-1 - regenerate if lost
kubeadm token create --print-join-command
```

### Get Ingress NodePort

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
# Look for 80:XXXXX/TCP
```

### Start Port Forwarding (After Every VM1 Restart)

```bash
# Replace XXXXX with NodePort
# Replace CP1_IP with cp-1 IP from multipass list
sudo socat TCP-LISTEN:XXXXX,bind=0.0.0.0,fork,reuseaddr TCP:<CP1_IP>:XXXXX &
sudo ufw allow XXXXX/tcp
```

**App URL:** `http://142.93.28.130:XXXXX`

---

## 🔁 After Every Restart Checklist

```bash
# 1. Check VMs running
multipass list

# 2. Shell into cp-1
multipass shell cp-1

# 3. Check cluster
kubectl get nodes
kubectl get pods -n notes-app
kubectl get pods -n flux-system

# 4. Get NodePort
kubectl get svc -n ingress-nginx ingress-nginx-controller

# 5. Exit and start socat on VM1
exit
sudo socat TCP-LISTEN:XXXXX,bind=0.0.0.0,fork,reuseaddr TCP:<CP1_IP>:XXXXX &

# 6. Check Flux is syncing
multipass shell cp-1
flux get kustomizations
```

---

## 🔧 Daily Flux Commands

```bash
# Check what commit Flux has pulled
flux get source git

# Check if Flux applied changes
flux get kustomizations

# Force Flux to sync NOW (don't wait 1 min)
flux reconcile source git flux-system
flux reconcile kustomization flux-system

# Watch Flux deploy in real time
flux get kustomizations -w

# Check Flux logs
flux logs --all-namespaces

# Check all Flux resources
flux get all
```

---

## 🔧 Useful kubectl Commands

```bash
# Check everything
kubectl get pods -A

# Check app
kubectl get pods -n notes-app

# Check logs
kubectl logs -n notes-app <pod-name>

# Restart a pod
kubectl delete pod <pod-name> -n notes-app

# Force redeploy
kubectl rollout restart deployment backend -n notes-app
kubectl rollout restart deployment frontend -n notes-app
```

---

## 🚀 How to Deploy New Code

```bash
# On your laptop:
# 1. Edit code in DevSecOps repo
# 2. git push

# GitHub Actions will:
# - Build new Docker image
# - Push to Docker Hub
# - Update image tag in k8s-Infra- repo

# Flux will automatically:
# - Detect new commit in k8s-Infra- (within 1 min)
# - Apply new manifests to cluster
# - Rolling update with zero downtime

# To verify deployment:
flux get kustomizations
kubectl get pods -n notes-app
```

---

## 🐛 Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name> -n notes-app
kubectl logs <pod-name> -n notes-app
```

### Flux not syncing
```bash
flux logs
flux reconcile source git flux-system
```

### Flux SSH key error (after rebuilding cluster)
This happens when you rebuild the cluster but old deploy key is still on GitHub.
```bash
# 1. Go to: https://github.com/Chenarrr/k8s-Infra-/settings/keys
# 2. Delete the key named: flux-system-main-flux-system-./flux-system
# 3. Delete old flux-system folder from repo
cd k8s-Infra-
rm -rf flux-system
git add .
git commit -m "Remove old Flux config"
git push

# 4. Re-bootstrap Flux
export GITHUB_TOKEN=your_token_here
flux bootstrap github \
  --owner=Chenarrr \
  --repository=k8s-Infra- \
  --branch=main \
  --path=flux-system \
  --personal
```

### Flux pulled commit but pods not updated
Your local clone on cp-1 is outdated. Pull and apply manually once:
```bash
cd ~/k8s-Infra-
git pull
kubectl apply -f backend/
kubectl apply -f frontend/
```

### Pods stuck in Pending (Insufficient CPU)
Worker-1 is out of CPU. Delete old pods first:
```bash
kubectl delete pods --all -n notes-app
kubectl get pods -n notes-app -w
```

### DNS issues
```bash
# On cp-1
cat /etc/resolv.conf
# Should show 8.8.8.8

# If broken
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
```

### Can't access app
```bash
# Check socat is running on VM1
ps aux | grep socat

# Check NodePort
kubectl get svc -n ingress-nginx ingress-nginx-controller

# Restart socat
sudo pkill socat
sudo socat TCP-LISTEN:XXXXX,bind=0.0.0.0,fork,reuseaddr TCP:<CP1_IP>:XXXXX &
```

### Cluster not responding
```bash
# Check kubelet
sudo systemctl status kubelet
sudo systemctl restart kubelet

# Check containerd
sudo systemctl status containerd
sudo systemctl restart containerd
```

---

## 📋 Infrastructure Info

| Component | Value |
|-----------|-------|
| VM1 IP | 142.93.28.130 |
| cp-1 IP | `multipass list` |
| worker-1 IP | `multipass list` |
| Kubernetes Version | v1.28 |
| CNI | Flannel |
| GitOps Tool | Flux CD v2.2.3 |
| App Namespace | notes-app |
| Ingress Namespace | ingress-nginx |
| Flux Namespace | flux-system |
| App Repo | https://github.com/Chenarrr/DevSecOps |
| Infra Repo | https://github.com/Chenarrr/k8s-Infra- |

---

## 🗂️ Repo Structure (k8s-Infra-)

```
k8s-Infra-/
├── backend/
│   ├── backend-deployment.yaml
│   └── backend-service.yaml
├── frontend/
│   ├── frontend-deployment.yaml
│   └── frontend-service.yaml
├── mongodb/
│   ├── mongodb-statefulset.yaml
│   ├── mongodb-service.yaml
│   └── mongodb-storage.yaml
├── flux-system/
│   └── (Flux CD configs - auto-generated)
├── namespace.yaml
└── ingress.yaml
```