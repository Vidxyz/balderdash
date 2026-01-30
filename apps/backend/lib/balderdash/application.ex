defmodule Balderdash.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    pubsub_opts = Application.get_env(:balderdash, :pubsub_options) || [name: Balderdash.PubSub]

    children = [
      Balderdash.Repo,
      {Phoenix.PubSub, pubsub_opts},
      Balderdash.GameRegistry,
      BalderdashWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: Balderdash.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    BalderdashWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
