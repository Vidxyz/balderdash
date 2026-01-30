# Build stage
FROM elixir:1.16-alpine AS builder

# Install build dependencies
RUN apk add --no-cache build-base git

WORKDIR /app

# Install hex and rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Copy mix files
COPY mix.exs mix.lock ./

# Install dependencies
RUN mix deps.get --only prod
RUN mix deps.compile

# Copy source code
COPY . .

# Compile the application
RUN MIX_ENV=prod mix compile

# Create release
RUN MIX_ENV=prod mix release

# Runtime stage
FROM alpine:latest

# Install runtime dependencies (libstdc++ required by ERTS/beam.smp for C++ ABI symbols)
RUN apk add --no-cache openssl ncurses-libs libstdc++

WORKDIR /app

# Copy release from builder
COPY --from=builder /app/_build/prod/rel/balderdash .

# Create non-root user
RUN adduser -D -s /bin/sh appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 4000

ENV MIX_ENV=prod
ENV PORT=4000

CMD ["./bin/balderdash", "start"]
