# PostgreSQL is provisioned via the postgres module (Helm chart).
module "postgres" {
  source = "./modules/postgres"

  namespace         = var.namespace
  postgres_username = var.postgres_username
  postgres_password = var.postgres_password
}
