import Config

if config_env() == :prod do
  # Support either DATABASE_URL or individual vars (e.g. from Kubernetes ConfigMap/Secret)
  database_url =
    System.get_env("DATABASE_URL") ||
      case {System.get_env("DATABASE_HOST"), System.get_env("DATABASE_USER"), System.get_env("DATABASE_PASSWORD"), System.get_env("DATABASE_NAME")} do
        {host, user, pass, name} when is_binary(host) and is_binary(user) and is_binary(name) ->
          port = System.get_env("DATABASE_PORT", "5432")
          user_enc = URI.encode_www_form(user)
          pass_enc = if is_binary(pass), do: ":#{URI.encode_www_form(pass)}", else: ""
          "ecto://#{user_enc}#{pass_enc}@#{host}:#{port}/#{name}"
        _ ->
          raise """
          Database config missing. Set DATABASE_URL or all of:
          DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME
          """
      end

  maybe_ipv6 = if System.get_env("ECTO_IPV6") == "true", do: [:inet6], else: []

  config :balderdash, Balderdash.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    socket_options: maybe_ipv6

  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = System.get_env("PHX_HOST") || "example.com"
  port = String.to_integer(System.get_env("PORT") || "4000")

  config :balderdash, BalderdashWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      ip: {0, 0, 0, 0, 0, 0, 0, 0},
      port: port
    ],
    secret_key_base: secret_key_base,
    server: true

  # Redis PubSub: start in application tree; endpoint only references the server name
  # Default to localhost when not in K8s (e.g. local prod run); in-cluster use short name "redis-service"
  redis_host = System.get_env("REDIS_HOST", "localhost")
  redis_port = String.to_integer(System.get_env("REDIS_PORT", "6379"))
  redis_password = System.get_env("REDIS_PASSWORD")

  # Only pass password when set; sending AUTH when Redis has no password causes "AUTH called without any password configured"
  pubsub_base = [
    adapter: Phoenix.PubSub.Redis,
    name: Balderdash.PubSub,
    node_name: System.get_env("NODE_NAME", "balderdash@#{System.get_env("HOSTNAME", "unknown")}"),
    host: redis_host,
    port: redis_port
  ]
  pubsub_opts = if is_binary(redis_password) and redis_password != "", do: Keyword.put(pubsub_base, :password, redis_password), else: pubsub_base

  config :balderdash, :pubsub_options, pubsub_opts

  config :balderdash, BalderdashWeb.Endpoint,
    pubsub_server: Balderdash.PubSub
end
