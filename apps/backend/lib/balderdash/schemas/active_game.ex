defmodule Balderdash.Schemas.ActiveGame do
  use Ecto.Schema
  import Ecto.Changeset

  schema "active_games" do
    field :room_code, :string
    field :state_json, :map
    field :current_pod, :string
    field :last_updated, :utc_datetime

    timestamps()
  end

  @doc false
  def changeset(active_game, attrs) do
    active_game
    |> cast(attrs, [:room_code, :state_json, :current_pod, :last_updated])
    |> validate_required([:room_code, :state_json])
    |> unique_constraint(:room_code)
  end
end
