import Config

config :balderdash, BalderdashWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4000],
  debug_errors: true,
  code_reloader: true,
  check_origin: false,
  watchers: []

config :balderdash, Balderdash.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "balderdash_dev",
  pool_size: 10,
  stacktrace: true,
  show_sensitive_data_on_connection_error: true

config :logger, :console, format: "[$level] $message\n"

config :phoenix, :stacktrace_depth, 20
config :phoenix, :plug_init_mode, :runtime
