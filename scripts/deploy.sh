#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Deploying to Kubernetes...${NC}"

# Apply namespace
kubectl apply -f ../k8s/namespace.yaml

# PostgreSQL and Redis are provisioned by Terraform. Backend secrets
# (DATABASE_PASSWORD, REDIS_PASSWORD) are also created by Terraform so they
# match. Run 'terraform apply' from the terraform/ directory before deploy.

# Apply backend
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
