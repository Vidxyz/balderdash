#!/bin/bash
# Create the balderdash database if it does not exist (for existing Postgres clusters).
# Run from repo root: ./scripts/create-balderdash-db.sh
set -e
NAMESPACE="${NAMESPACE:-balderdash}"
POD=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
if [ -z "$POD" ]; then
  echo "No Postgres pod found in namespace $NAMESPACE"
  exit 1
fi
ADMIN_USER=$(kubectl exec -n "$NAMESPACE" "$POD" -- printenv POSTGRES_USER 2>/dev/null || echo "postgres")
ADMIN_PASS=$(kubectl exec -n "$NAMESPACE" "$POD" -- printenv POSTGRES_PASSWORD 2>/dev/null || true)
if [ -z "$ADMIN_PASS" ]; then
  echo "Could not get POSTGRES_PASSWORD from pod"
  exit 1
fi
DB_EXISTS=$(kubectl exec -n "$NAMESPACE" "$POD" -- env PGPASSWORD="$ADMIN_PASS" psql -U "$ADMIN_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='balderdash'" 2>/dev/null || echo "")
if [ -z "$DB_EXISTS" ]; then
  echo "Creating database balderdash..."
  kubectl exec -n "$NAMESPACE" "$POD" -- env PGPASSWORD="$ADMIN_PASS" psql -U "$ADMIN_USER" -d postgres -c "CREATE DATABASE balderdash;"
  echo "Done. Restart backend: kubectl rollout restart deployment/backend -n $NAMESPACE"
else
  echo "Database balderdash already exists."
fi
