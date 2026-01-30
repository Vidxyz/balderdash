defmodule BalderdashWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :balderdash

  socket "/socket", BalderdashWeb.UserSocket,
    websocket: true,
    longpoll: false

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Jason

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session, store: :cookie, key: "_balderdash_key", signing_salt: "balderdash_salt"

  plug BalderdashWeb.Router
end
