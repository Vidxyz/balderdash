# Quick Start Guide

This guide will help you get the Balderdash game running locally with Minikube.

## Prerequisites

- Minikube installed and running
- kubectl configured
- Docker installed
- Terraform installed
- Elixir 1.16+ and Phoenix 1.7+ (for local backend development)
- Node.js 18+ (for local frontend development)

## Step 1: Set Up Minikube

```bash
./scripts/setup-minikube.sh
```

Or manually:
```bash
minikube start -p balderdash
minikube profile set balderdash
minikube addons enable ingress
kubectl config use-context balderdash
```

## Step 2: Provision Infrastructure with Terraform

```bash
cd terraform
terraform init
terraform apply
```

This will deploy to your Kubernetes cluster:
- **Redis** via the Bitnami Helm chart
- **PostgreSQL** via the postgres module (`terraform/modules/postgres`), including the `balderdash` database

## Step 3: Build Docker Images

```bash
./scripts/build-images.sh
```

This script:
- Sets up the minikube Docker environment
- Builds the frontend image
- Builds the backend image
- Makes images available to minikube

## Step 4: Deploy to Kubernetes

```bash
./scripts/deploy.sh
```

This will:
- Create the namespace
- Deploy backend (PostgreSQL and Redis are provisioned by Terraform)
- Deploy frontend
- Set up Ingress

## Step 5: Access the Application

1. Get the minikube IP:
   ```bash
   minikube ip -p balderdash
   ```

2. Add to `/etc/hosts` (may require sudo):
   ```bash
   echo "$(minikube ip -p balderdash) balderdash.local" | sudo tee -a /etc/hosts
   ```

3. Access the application:
   - Open browser: `http://balderdash.local`

## Step 6: Set Up Database (First Time Only)

After Terraform has applied (PostgreSQL is running), run migrations:

```bash
# Migrations and seeding run on backend app startup (idempotent).
# Optional: run seed manually (e.g. for re-seeding):
# BACKEND_POD=$(kubectl get pods -n balderdash -l app=backend -o jsonpath='{.items[0].metadata.name}')
# kubectl exec -it $BACKEND_POD -n balderdash -- /app/bin/balderdash eval "Balderdash.Release.seed()"
```

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n balderdash
```

### View Logs
```bash
# Backend logs
kubectl logs -f deployment/backend -n balderdash

# Frontend logs
kubectl logs -f deployment/frontend -n balderdash

# PostgreSQL logs
kubectl logs -f statefulset/postgres -n balderdash
```

### Check Services
```bash
kubectl get svc -n balderdash
```

### Check Ingress
```bash
kubectl get ingress -n balderdash
```

### Restart a Deployment
```bash
kubectl rollout restart deployment/backend -n balderdash
kubectl rollout restart deployment/frontend -n balderdash
```

### Get Redis Password
```bash
kubectl get secret redis -n balderdash -o jsonpath='{.data.redis-password}' | base64 -d
```

Update the secret:
```bash
kubectl create secret generic backend-secrets \
  --from-literal=REDIS_PASSWORD='<password-from-above>' \
  --dry-run=client -o yaml | kubectl apply -f - -n balderdash
```

## Local Development (Without Kubernetes)

### Backend
```bash
cd apps/backend
mix deps.get
mix ecto.setup
mix phx.server
```

### Frontend
```bash
cd apps/frontend
npm install
npm run dev
```

## Clean Up

To remove everything:
```bash
kubectl delete namespace balderdash
cd terraform && terraform destroy
minikube stop -p balderdash
```
