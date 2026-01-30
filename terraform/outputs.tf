output "redis_password" {
  description = "Redis password (from var.redis_password if set)"
  value       = var.redis_password != "" ? "Set via variable" : "No password"
  sensitive   = true
}

output "redis_service_name" {
  description = "Redis service name"
  value       = module.redis.service_name
}

output "redis_service_host" {
  description = "Redis service host for application connection"
  value       = module.redis.service_host
}

output "redis_port" {
  description = "Redis port"
  value       = module.redis.service_port
}

# PostgreSQL (from postgres module)
output "postgres_service_host" {
  description = "PostgreSQL service host for application connection"
  value       = module.postgres.service_host
}

output "postgres_service_name" {
  description = "PostgreSQL service name"
  value       = module.postgres.service_name
}

output "postgres_service_port" {
  description = "PostgreSQL service port"
  value       = module.postgres.service_port
}
