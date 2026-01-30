defmodule Balderdash.Repo do
  use Ecto.Repo,
    otp_app: :balderdash,
    adapter: Ecto.Adapters.Postgres
end
