defmodule Balderdash.Repo.Migrations.CreateCards do
  use Ecto.Migration

  def change do
    create table(:cards) do
      add :card_number, :integer, null: false
      timestamps()
    end

    create unique_index(:cards, [:card_number])
  end
end
