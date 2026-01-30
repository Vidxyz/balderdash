#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up Minikube...${NC}"

# Start minikube
echo -e "${GREEN}Starting Minikube cluster...${NC}"
minikube start -p balderdash --driver=docker --kubernetes-version=v1.30.0 --addons=ingress

# Set profile
minikube profile set balderdash

# Configure kubectl
kubectl config use-context balderdash

echo -e "${GREEN}Minikube setup complete!${NC}"
echo -e "${BLUE}Cluster is ready for deployment${NC}"
