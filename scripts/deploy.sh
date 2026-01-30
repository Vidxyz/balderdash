#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Deploying to Kubernetes...${NC}"

# Destroy existing app manifests (ingress, frontend, backend) so we reapply cleanly.
# Namespace is not deleted so Terraform-provisioned Postgres/Redis stay.
echo -e "${YELLOW}Removing existing manifests...${NC}"
kubectl delete -f ../k8s/ingress.yaml --ignore-not-found=true 2>/dev/null || true
kubectl delete -f ../k8s/frontend/ --ignore-not-found=true 2>/dev/null || true
kubectl delete -f ../k8s/backend/ --ignore-not-found=true 2>/dev/null || true

# Apply namespace
kubectl apply -f ../k8s/namespace.yaml

# PostgreSQL and Redis are provisioned by Terraform. Run 'terraform apply'
# from the terraform/ directory before deploy. Backend DB creds come from
# k8s/backend/secret.yaml (must match Postgres; default postgres/postgres).

# Apply backend (migrations run on app startup; Ecto runs only pending migrations)
echo -e "${GREEN}Deploying backend...${NC}"
kubectl apply -f ../k8s/backend/

# Apply frontend
echo -e "${GREEN}Deploying frontend...${NC}"
kubectl apply -f ../k8s/frontend/

# Apply ingress
echo -e "${GREEN}Deploying ingress...${NC}"
kubectl apply -f ../k8s/ingress.yaml

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${BLUE}Get minikube IP: minikube ip -p balderdash${NC}"
echo -e "${BLUE}Add to /etc/hosts: <minikube-ip> balderdash.local${NC}"
