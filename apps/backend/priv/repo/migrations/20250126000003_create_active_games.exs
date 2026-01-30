defmodule Balderdash.Repo.Migrations.CreateActiveGames do
  use Ecto.Migration

  def change do
    create table(:active_games) do
      add :room_code, :string, null: false
      add :state_json, :map, null: false
      add :current_pod, :string
      add :last_updated, :utc_datetime

      timestamps()
    end

    create unique_index(:active_games, [:room_code])
    create index(:active_games, [:last_updated])
  end
end
