#!/bin/bash
# Ensure role "postgres" exists with password 'postgres' so the backend (k8s/backend/secret.yaml) can connect.
# The chart may create a different superuser (e.g. from POSTGRES_USER); we create/update "postgres" to match the backend.
# Run from repo root: ./scripts/fix-postgres-password.sh
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
  echo "Could not get POSTGRES_PASSWORD from pod; cannot connect."
  exit 1
fi
echo "Using superuser $ADMIN_USER to ensure role postgres exists with password 'postgres'..."
kubectl exec -n "$NAMESPACE" "$POD" -- env PGPASSWORD="$ADMIN_PASS" psql -U "$ADMIN_USER" -d postgres -v ON_ERROR_STOP=1 -c "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    CREATE USER postgres WITH PASSWORD 'postgres' SUPERUSER;
    RAISE NOTICE 'Created user postgres';
  ELSE
    ALTER USER postgres WITH PASSWORD 'postgres';
    RAISE NOTICE 'Updated password for user postgres';
  END IF;
END \$\$;
"
echo "Done. Restart backend: kubectl rollout restart deployment/backend -n $NAMESPACE"
