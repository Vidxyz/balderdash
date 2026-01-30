import Config

config :balderdash, BalderdashWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  server: false

config :balderdash, Balderdash.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "balderdash_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: 10

config :logger, level: :warning
config :phoenix, :plug_init_mode, :runtime
