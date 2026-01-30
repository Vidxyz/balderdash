# Balderdash System Overview

A staff/principal-level technical overview of the Balderdash multiplayer game: design, scalability, UX, persistence, and improvement roadmap.

---

## 1. High-Level Architecture: From Terraform to Services

### 1.1 Flow: Provisioning → Images → Deployment

```
Terraform (PostgreSQL + Redis)
    ↓
Kubernetes namespace + Helm releases
    ↓
scripts/build-images.sh → Docker images in Minikube
    ↓
scripts/deploy.sh → k8s manifests (backend, frontend, ingress)
    ↓
Users → Ingress (balderdash.local) → Frontend (/) or Backend (/api, /socket)
```

- **Terraform** provisions only **infrastructure**: PostgreSQL (custom Helm chart) and Redis (Bitnami Helm) in the `balderdash` namespace. It does **not** deploy the app.
- **App deployment** is done by `deploy.sh`: it applies `k8s/namespace.yaml`, then backend, frontend, and ingress. Backend expects Postgres/Redis to already exist (initContainers wait for them).
- **Images** are built with `build-images.sh` against Minikube’s Docker daemon (`balderdash-backend:latest`, `balderdash-frontend:latest`) and referenced in the deployments with `imagePullPolicy: IfNotPresent`.

### 1.2 Key Files

| Layer | Location | Purpose |
|-------|----------|---------|
| Terraform | `terraform/main.tf`, `postgres.tf`, `redis.tf`, `variables.tf` | K8s/Helm providers; Postgres and Redis modules |
| Postgres module | `terraform/modules/postgres/main.tf` | Helm release, `postgres-service` alias, wait + init DBs (including `balderdash`) |
| Redis module | `terraform/modules/redis/main.tf` | Bitnami Redis Helm, `redis-service` alias |
| K8s backend | `k8s/backend/` | ConfigMap, Secret, Deployment (initContainers for Postgres/Redis), Service |
| K8s frontend | `k8s/frontend/` | Deployment, Service, ConfigMap |
| Ingress | `k8s/ingress.yaml` | Host `balderdash.local`: `/` → frontend, `/socket`, `/api` → backend (WebSocket timeouts set) |
| Deploy | `scripts/deploy.sh` | Deletes then reapplies app manifests; leaves Terraform resources intact |
| Build | `scripts/build-images.sh` | Builds frontend and backend images inside Minikube Docker env |

---

## 2. Design

### 2.1 Component Model

- **Frontend**: React (Vite, TypeScript, Tailwind). Single-page app; game state is **authoritative on the backend** and synced via WebSockets and optional polling.
- **Backend**: Phoenix app with:
  - **Ecto Repo** → PostgreSQL (schema: cards, categories, `active_games`).
  - **Phoenix PubSub** → Redis-backed (multi-node broadcast).
  - **GameRegistry** (Elixir `Registry`) → one process per room keyed by `room_code`.
  - **GameProcess** (GenServer per game) → lobby, rounds, voting, scoring, timers; persists to DB and broadcasts on changes.

### 2.2 Game State Machine

```
lobby → playing → round_active → voting → results → (playing | game_over)
         ↑_______________|                    |
                         └── next round ──────┘
```

- **Lobby**: Players join; host starts game when ≥2 players.
- **Playing**: Between rounds; roundmaster starts next round.
- **Round active**: Answer timer (e.g. 90s); non–roundmaster submit answers; transition to voting when all submitted or time up.
- **Voting**: Correct + funniest votes; 30s voting timer; when all voted (and voting time considered), transition to results.
- **Results**: Scores and reasons computed; if any player ≥6 points → **game_over** (with winners list and optional funniest winner); else back to **playing**.

### 2.3 Key Backend Abstractions

- **GameRegistry.get_or_create(room_code)**: Look up process by `room_code` or start `GameProcess` and register it.
- **GameProcess** is named via Registry: `{:via, Registry, {Balderdash.GameRegistry, room_code}}`, so any node that has the process can be reached by room code.
- **GameChannel** (`game:lobby:#{room_code}`): On join, subscribes to PubSub topic `game:#{room_code}`, gets/creates game process, and replies with current state. All mutations go through `GameProcess`; it persists and then broadcasts `{:game_state_updated, state}`. Subscribed channels receive it and push `state_update` to clients.

### 2.4 Design Choices

- **One GenServer per game**: Simple, clear ownership of state and timers; scales with number of active games, not connections.
- **State in DB**: Full game state is serialized in `active_games.state_json` so a restarted process can reload and continue (with timers advanced as described below).
- **Redis PubSub**: Allows multiple backend replicas to share broadcast; any replica can serve a channel, and the one that “has” the GameProcess (or can reach it) participates in the flow.
- **No sticky sessions**: Ingress does not pin a client to a specific backend pod; WebSocket is long-lived to one pod, but game logic is in a process that can be on any pod (and is looked up by room code).

---

## 3. Scalability and Availability

### 3.1 Current Setup

- **Backend**: 2 replicas; initContainers wait for Postgres and Redis; liveness/readiness on `/api/health`.
- **Frontend**: 2 replicas; static assets served by nginx.
- **PostgreSQL**: Single instance (Helm); persistent volume.
- **Redis**: Standalone; used for PubSub only (no game state in Redis).

### 3.2 Scalability Characteristics

- **Horizontal scaling of backend**: More replicas can be added. Game processes are created on the node that first serves a given room; other nodes subscribe via Redis PubSub and receive broadcasts. **Caveat**: GameProcess is **local** to one node. If a client connects to a different pod, that pod still joins the same Phoenix channel and receives broadcasts, but **calls** (e.g. `join_room`, `start_round`) are handled by the channel’s node, which then does `GenServer.call(via_tuple(room_code), ...)`. With a global Registry or process group, the process might live on another node; currently Registry is **local**, so all connections for a given room must hit the same node that owns that room’s process, or you need a mechanism to route to the correct node (e.g. libcluster + global registry, or Phoenix.Presence and route by `current_pod`).
- **Database**: Single Postgres; bottleneck for write volume. Checkpointing is per-game and every 30s; under heavy load, connection pool and write throughput matter.
- **Redis**: Single instance; sufficient for PubSub for moderate replica counts.

### 3.3 Availability

- **Process restart**: If a GameProcess crashes, it is restarted by the supervisor only if something triggers `GameRegistry.get_or_create(room_code)` again (e.g. next channel join). On restart, `init` loads state from DB and, if state was `round_active` or `voting`, advances to the next phase (timers cannot be restored, so it moves on). So games **can** recover after a process crash, but there is no automatic “restart all rooms” — recovery is on next client interaction.
- **Pod restarts**: When a backend pod is killed, its in-memory GameProcesses are lost; state is only in DB. New joins to those rooms will create a new process and load from DB (with the same timer-advance logic).
- **No cleanup of old games**: Ended games remain in `active_games` and their processes may stay in memory until the node is restarted or the process is garbage-collected; there is no TTL or explicit shutdown on game over.

---

## 4. User Experience and Consistency

### 4.1 State Authority and Sync

- **Single source of truth**: Backend GameProcess holds authoritative state. Frontend never mutates game state locally except via the store updated from server messages.
- **Join reply**: On channel join, the server sends current state in the reply so refresh or reconnect immediately shows correct state without an extra round-trip.
- **Broadcasts**: After every meaningful update, GameProcess calls `broadcast_state(state)` → PubSub → each subscribed channel pushes `state_update` to its client. Frontend `gameStore.setGameState` is called from the channel handler (using `useGameStore.getState().setGameState` to avoid stale closures).
- **Polling fallback**: In lobby and between rounds, the frontend also polls `get_state` every 1.5s so that if a push is missed (e.g. reconnect), the UI still converges.

### 4.2 Reconnect and Host Refresh

- **Stored player**: Frontend stores `playerId` and `playerName` per room in `localStorage` (`balderdash_<roomCode>`). On load, if a stored player exists, the channel is joined **with** `player_id` in params; the backend does **not** call `join_room` again (assigns `player_id` to socket). Join reply already contains state, so the host sees the same lobby/game.
- **Host identity**: Host is derived from `gameState.players` (first player has `role: :host`). No separate “isHost” in URL or session; so refresh does not lose host status as long as the same player id is re-associated via stored player.

### 4.3 Spectator and Join Form

- If the user has **no** stored player and the game is **not** in lobby, they are treated as **spectator**: `playerId` stays `null`, no `join_room`, UI shows “You’re watching as a spectator” and hides submit/vote buttons.
- If the game is in lobby and there is no stored player but there **is** a name from Host/Join page (e.g. `location.state.playerName`), the client auto-sends `join_room` so the host can start without manually re-entering.
- If in lobby and no stored player and no name, the join form is shown so they can join as a new player.

### 4.4 Timers and Consistency

- Answer and voting timers are driven by the backend (GenServer `send_after`). On reload from DB, timers are not restored; `init` advances `round_active` → voting and `voting` → results so that after a restart everyone sees a consistent phase (e.g. voting or results) instead of a stuck “round active” with no timer.

---

## 5. Technologies and Key Code

### 5.1 Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind, Zustand, Phoenix JS (WebSocket) |
| Backend | Elixir 1.16, Phoenix 1.7, Ecto, GenServer, Registry |
| DB | PostgreSQL (Ecto, migrations, `active_games` + cards/categories) |
| PubSub | Phoenix.PubSub over Redis |
| Infra | Kubernetes (Minikube), Terraform, Helm (Postgres + Redis) |
| Runtime | Backend: Distillery/Release; Frontend: nginx serving Vite build |

### 5.2 Backend: Game Process and Persistence

**Registry and process creation** (`game_registry.ex`):

```elixir
def get_or_create(room_code) do
  case get_game(room_code) do
    {:ok, pid} -> {:ok, pid}
    {:error, :not_found} -> create_game(room_code)
  end
end
```

**Init: load or new** (`game_process.ex`):

```elixir
def init({room_code, max_players}) do
  state =
    case GameRepo.load_state(room_code) do
      nil ->
        new_state = GameState.new(room_code, max_players)
        persist_state(new_state)
        new_state
      loaded_state ->
        # Advance round_active/voting so timers are consistent after restart
        case loaded_state.game_state do
          :round_active -> transition_to_voting(...)
          :voting -> transition_to_results(...)
          _ -> loaded_state
        end
    end
  schedule_checkpoint()  # every 30s
  {:ok, state}
end
```

**Broadcast and persist** (after mutations):

```elixir
defp broadcast_state(state) do
  Phoenix.PubSub.broadcast(Balderdash.PubSub, "game:#{state.room_code}", {:game_state_updated, state})
end
defp persist_state(state) do
  GameRepo.save_state(state)
end
```

### 5.3 Backend: Channel Join and State Reply

**Join** (`game_channel.ex`): Subscribe to topic, get or create process, attach `player_id` if provided, reply with current state:

```elixir
def join("game:lobby:" <> room_code, payload, socket) do
  Phoenix.PubSub.subscribe(Balderdash.PubSub, "game:#{room_code}")
  case Balderdash.GameRegistry.get_or_create(room_code) do
    {:ok, _pid} ->
      state = GameProcess.get_state(room_code)
      socket = socket |> assign(:room_code, room_code) |> maybe_assign_player_id(payload)
      {:ok, %{state: state}, socket}
    ...
  end
end
```

**State push** (on broadcast):

```elixir
def handle_info({:game_state_updated, _state}, socket) do
  room_code = socket.assigns.room_code
  state = GameProcess.get_state(room_code)  # serializable shape, no timer_ref
  push(socket, "state_update", state)
  {:noreply, socket}
end
```

### 5.4 Frontend: WebSocket and Store

**Socket URL** (same host as page, correct ws/wss):

```ts
const socketUrl = import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/socket`
```

**State updates** (Zustand; points-gain detection in store):

```ts
setGameState: (state) => {
  const { playerId, lastSeenPoints } = get()
  // ... compute pointsGained if current player's points increased
  set({ gameState: state, lastSeenPoints: newLastSeenPoints, ... })
}
```

Channel handler uses `useGameStore.getState().setGameState(payload)` so the latest store reference is used.

### 5.5 Database: Active Games and GameRepo

**Schema** (`schemas/active_game.ex`): `room_code` (unique), `state_json` (map), `current_pod`, `last_updated`.

**Save** (`game_repo.ex`): Upsert by `room_code`; serialize state (players, game_state, current_round, winners, score reasons, funniest votes, etc.); store `current_pod` and `last_updated`.

**Load** (`game_repo.ex`): `get_by(ActiveGame, room_code: room_code)` then `json_to_state(active_game.state_json)` with normalization for players, round, winners, score reasons, funniest votes (and no `timer_ref`/`voting_timer_ref`).

---

## 6. How the Game Is Saved, Fetched, and Persisted

### 6.1 When State Is Written

- **On every meaningful transition**: After `join_room`, `start_game`, `start_round`, `submit_answer`, `vote_correct`, `vote_funniest`, and after internal transitions (`transition_to_voting`, `transition_to_results`), `persist_state(state)` is called.
- **Periodic checkpoint**: Every 30 seconds the GameProcess receives `:checkpoint` and calls `persist_state(state)` again. This limits data loss to at most ~30 seconds of in-memory updates if the process dies without a recent transition.

### 6.2 When State Is Read

- **Process start**: `GameProcess.init/1` calls `GameRepo.load_state(room_code)`. If a row exists, state is deserialized and, if phase was `round_active` or `voting`, the state machine is advanced (timers zeroed, next phase).
- **Channel join**: Does not read from DB directly; it calls `GameProcess.get_state(room_code)`, which returns the in-memory state (already loaded or created in `init`). So “fetch” for a joining client is always from the process, which may have been initialized from DB.

### 6.3 Serialized Shape

`state_json` includes: `room_code`, `players`, `game_state` (string), `current_round` (with answers, votes, timers; no refs), `round_number`, `winners`, `max_players`, `last_round_score_reasons`, `funniest_votes_per_player`. Timer refs and other non-serializable fields are omitted when saving and when returning state to the channel/frontend.

---

## 7. What Happens to Games That Have Ended

- **In memory**: The GameProcess for a room continues to exist. Its state is `game_state: :game_over` with `winners` (and optionally `funniest_winner`) set. No further transitions occur.
- **In DB**: The row in `active_games` remains. There is **no** automatic delete on game over. `GameRepo.delete_state(room_code)` and `GameProcess._cleanup_state(room_code)` exist but **are never called** from the current flow.
- **Re-join**: If someone opens the same room again, `GameRegistry.get_or_create(room_code)` returns the existing process (or starts one that loads the same game_over state from DB). So ended games stay viewable and their data is retained indefinitely until some future cleanup is implemented.

---

## 8. Deficiencies and What to Do Next

### 8.1 Player Joins Then Leaves / Abandons

- **Current behavior**: Once a player has called `join_room`, they are in `state.players` and stay there. There is no “leave room” or “kick” or “mark disconnected.” If they close the tab, they remain in the list; their answer/vote slots are simply missing (handled as “not yet submitted”).
- **Problems**:  
  - In round_active, “all submitted” is based on non-roundmaster count; if someone leaves, the round can wait forever unless the roundmaster is given a way to “skip” or “consider only present players.”  
  - In voting, same: “all voted” depends on non-roundmaster count; a departed player never votes, so the round can hang.  
  - No distinction between “disconnected” and “still thinking”; no UI for “X left” or “skip waiting for X.”

**Recommended next steps:**

- Add **leave_room** (and optionally **handle channel disconnect**): Remove player from `state.players` (and from round answers/votes if needed), persist and broadcast. If the host leaves, assign new host (e.g. first remaining player) or end game.
- For **round_active** and **voting**: Base “all submitted” / “all voted” on **currently connected** non-roundmaster players (e.g. track presence via Phoenix.Presence or a heartbeat), or add a **host action**: “Skip waiting for missing players” / “Count only connected players.”
- Optionally: **timeout for inactivity** (e.g. if a player has not submitted and 90s have passed, treat as “skipped” for that round) to avoid permanent stalls.

### 8.2 Ended Games and Cleanup

- **Data**: Ended games remain in `active_games` and in memory. For a single-node or small deployment this is acceptable; for long-running production, table and process count grow.
- **Improvements**:  
  - **On game over**: Call `_cleanup_state(room_code)` (or a dedicated “archive then delete” step) so the row is removed (or moved to an `ended_games`/history table) and optionally terminate the GameProcess to free memory.  
  - **Scheduled job**: Periodically delete or archive rows where `game_state` = 'game_over' and `last_updated` is older than N days.  
  - **Process exit**: When cleaning up DB state, consider exiting the GenServer so the process is not kept alive forever.

### 8.3 Multi-Node and Sticky Sessions

- **Current**: Registry is local. If you run multiple backend nodes, each node has its own Registry and its own set of GameProcesses. A client that connects to node A might create a process on A; a client that connects to node B for the same room would create a **different** process on B and load from DB, leading to split state if both are used.
- **Improvements**: Use **libcluster** (or similar) and a **global** process registry (e.g. `:global` or Horde/Swarm), or ensure that **all** connections for a given room are routed to the same node (e.g. ingress sticky session by room code, or a router service that forwards to the node that owns the room). Then keep the “one process per room” model but with a single logical process cluster-wide.

### 8.4 Polish and Product

- **Validation and UX**: Clearer errors for “room full,” “game already started,” “not in game” (e.g. when submitting as spectator); disable buttons when action is not allowed.  
- **Reconnection**: On socket reconnect, re-join channel with stored `player_id` (already done); consider showing “Reconnected” and re-requesting state once.  
- **Audit and safety**: Idempotency where possible (e.g. submit_answer/vote if already submitted); optional idempotency keys to avoid double-counting on retries.  
- **Observability**: Logging, metrics (round duration, active games, errors), and optional tracing for game flow.  
- **Testing**: Integration tests for GameProcess transitions and GameRepo save/load; E2E for join → start → round → vote → results → game over.

---

## 9. Summary Diagram

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                   balderdash.local                      │
                    │  / → frontend (nginx)   /socket, /api → backend        │
                    └─────────────────────────────┬───────────────────────────┘
                                                  │
         ┌────────────────────────────────────────┼────────────────────────────────────────┐
         │                                        │                                        │
         ▼                                        ▼                                        ▼
  ┌──────────────┐                        ┌──────────────┐                        ┌──────────────┐
  │   Frontend   │  ws /socket            │   Backend    │                        │   Backend    │
  │  (React SPA) │◄─────────────────────►│   (Phoenix)  │                        │   (Phoenix)  │
  │   replicas   │  state_update,         │   replicas   │                        │   replicas   │
  └──────────────┘  join_room, etc.      └──────┬───────┘                        └──────┬───────┘
                                                │                                        │
                    ┌───────────────────────────┼────────────────────────────────────────┘
                    │ PubSub (Redis)            │
                    │ "game:#{room_code}"       │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │  GameRegistry (Registry)  │
                    │  room_code → GameProcess  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐     persist_state / load_state
                    │  GameProcess (GenServer)   │◄────────────────────────────┐
                    │  lobby → playing → rounds   │                              │
                    └────────────────────────────┘                              │
                                                                                │
                    ┌────────────────────────────────────────────────────────────┐
                    │  PostgreSQL: active_games (room_code, state_json, ...);    │
                    │  cards, categories                                          │
                    └────────────────────────────────────────────────────────────┘
```

This document should give a staff/principal engineer a complete picture of how the system is designed, how it scales, how state is kept consistent, how games are saved and what happens when they end, and what to improve next (especially around player leave/abandon and cleanup).
