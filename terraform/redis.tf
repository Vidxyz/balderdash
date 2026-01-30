# Redis is provisioned via the redis module (Bitnami Helm chart).
# This replaces the previous inline helm_release.

module "redis" {
  source = "./modules/redis"

  namespace       = var.namespace
  chart_version   = var.redis_version
  redis_password  = var.redis_password
  redis_memory_limit = var.redis_memory_limit
  redis_cpu_limit   = var.redis_cpu_limit
  redis_image_tag   = var.redis_image_tag
}
