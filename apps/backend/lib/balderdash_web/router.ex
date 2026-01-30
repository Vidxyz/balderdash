defmodule BalderdashWeb.Router do
  use BalderdashWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", BalderdashWeb do
    pipe_through :api

    get "/health", HealthController, :check
  end
end
