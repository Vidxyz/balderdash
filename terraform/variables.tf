variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "kubeconfig_context" {
  description = "Kubernetes context to use"
  type        = string
  default     = "balderdash"
}

variable "namespace" {
  description = "Kubernetes namespace for Redis and PostgreSQL"
  type        = string
  default     = "balderdash"
}

# Redis
variable "redis_version" {
  description = "Redis Helm chart version (leave empty for latest)"
  type        = string
  default     = "19.1.0"
}

variable "redis_password" {
  description = "Redis password (leave empty for no password)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "redis_memory_limit" {
  description = "Memory limit for Redis (e.g., '256Mi')"
  type        = string
  default     = "256Mi"
}

variable "redis_cpu_limit" {
  description = "CPU limit for Redis (e.g., '500m')"
  type        = string
  default     = "500m"
}

variable "redis_image_tag" {
  description = "Redis image tag (e.g., '7.2')"
  type        = string
  default     = "7.2"
}

# PostgreSQL
variable "postgres_username" {
  description = "PostgreSQL admin username"
  type        = string
  default     = "postgres"
}

variable "postgres_password" {
  description = "PostgreSQL admin password"
  type        = string
  default     = "postgres"
  sensitive   = true
}
