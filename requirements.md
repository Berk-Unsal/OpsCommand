# OpsCommand Requirements

This document lists the software and environment requirements needed to run OpsCommand.

## 1. Core Requirements

- macOS, Linux, or Windows with WSL2
- CPU: 2+ cores (4 recommended)
- RAM: 8 GB minimum (12-16 GB recommended for Kubernetes workflows)
- Free disk space: 10 GB+

## 2. Required Software

### Runtime and Package Manager
- Node.js 22.x (project Dockerfiles use `node:22-alpine`)
- npm 10+

### Containers and Local Orchestration
- Docker Engine / Docker Desktop (latest stable)
- Docker Compose v2 (usually bundled with Docker Desktop)

### Kubernetes Tooling
- kubectl (version compatible with your cluster)
- Kubernetes cluster access (local or remote)
- Skaffold v4+ (project uses `apiVersion: skaffold/v4beta11`)

### Local Cluster (Recommended for Local Development)
- kind (Kubernetes in Docker)
- NGINX Ingress Controller installed in the cluster (Ingress uses `ingressClassName: nginx`)

## 3. Project Service Requirements

- Backend: Node.js + Express service on port `4000`
- Frontend: Vite + React service on port `5173`
- Database: MongoDB `6.0` (used in both Docker Compose and Kubernetes manifests)

## 4. Environment Variables

Backend variables:
- `PORT` (default: `4000`)
- `MONGO_URI` (for local compose: `mongodb://mongo:27017/opscommand`)
- `JWT_SECRET` (must be set to a secure value)

Frontend variables:
- `VITE_BACKEND_URL` (for ingress workflow: `http://opscommand.local`)

## 5. Networking and Hostname Requirements

For Kubernetes ingress-based access, add this hosts entry:

- `127.0.0.1 opscommand.local`

If using kind with the provided config, ports `80` and `443` are mapped from the cluster control-plane container to your host.

## 6. Verify Installed Tools

Run the following commands before starting:

```bash
node -v
npm -v
docker --version
docker compose version
kubectl version --client
skaffold version
kind version
```

## 7. Optional but Useful

- Git 2.30+
- A terminal that supports long-running log streams
- An API client (Postman/Insomnia/curl) for auth endpoint testing

## 8. Notes

- The backend uses Kubernetes client libraries and RBAC resources; cluster permissions must allow the configured service account actions.
- Ensure your cluster has enough resources for frontend, backend, and MongoDB pods to schedule successfully.
