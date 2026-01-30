#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building Docker images...${NC}"

# Get minikube docker environment
eval $(minikube -p balderdash docker-env)

# Build frontend image
echo -e "${GREEN}Building frontend image...${NC}"
cd ../apps/frontend
docker build -t balderdash-frontend:latest .

# Build backend image
echo -e "${GREEN}Building backend image...${NC}"
cd ../backend
docker build -t balderdash-backend:latest .
cd ../..

echo -e "${GREEN}Images built successfully!${NC}"
echo -e "${BLUE}Images are now available in minikube's Docker daemon${NC}"
