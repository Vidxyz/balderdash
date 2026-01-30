# Balderdash Game

A multiplayer Balderdash/Fibbage-style game built with React frontend and Elixir/Phoenix backend, running on Kubernetes.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Elixir + Phoenix with WebSocket support
- **Database**: PostgreSQL
- **Message Broker**: Redis (via Helm)
- **Infrastructure**: Kubernetes (Minikube for local dev)

## Prerequisites

- Minikube installed
- kubectl configured
- Docker installed
- Terraform installed
- Elixir 1.16+ and Phoenix 1.7+
- Node.js 18+

## Quick Start

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

**TL;DR:**
```bash
./scripts/setup-minikube.sh
cd terraform && terraform init && terraform apply && cd ..  # Provisions Redis + PostgreSQL
./scripts/build-images.sh
./scripts/deploy.sh
# Add minikube IP to /etc/hosts as balderdash.local
# Access at http://balderdash.local
```

PostgreSQL and Redis are provisioned by Terraform. Run `terraform apply` before `deploy.sh`. Backend DB credentials are in `k8s/backend/secret.yaml` (default postgres/postgres; must match Postgres).

## Development

### Backend

```bash
cd apps/backend
mix deps.get
mix phx.server
```

### Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

## Project Structure

```
balderdash/
├── apps/
│   ├── frontend/          # React web app
│   └── backend/           # Elixir/Phoenix API
├── k8s/                   # Kubernetes manifests
│   ├── frontend/
│   ├── backend/
│   └── postgres/
├── terraform/             # Infrastructure as Code
├── scripts/               # Build and deployment scripts
└── README.md
```

## License

MIT
