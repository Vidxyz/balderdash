import Config

config :balderdash, BalderdashWeb.Endpoint,
  url: [host: "localhost", port: 4000],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: "dev-secret-key-base-change-in-production",
  watchers: [],
  pubsub_server: Balderdash.PubSub

config :balderdash, Balderdash.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "balderdash_dev",
  stacktrace: true,
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

config :balderdash, :phoenix, json_library: Jason

config :balderdash, ecto_repos: [Balderdash.Repo]

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :plug_init_mode, :runtime
