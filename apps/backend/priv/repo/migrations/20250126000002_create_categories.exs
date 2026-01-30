defmodule Balderdash.Repo.Migrations.CreateCategories do
  use Ecto.Migration

  def change do
    create table(:categories) do
      add :category_name, :string, null: false
      add :question, :text, null: false
      add :answer, :text, null: false
      add :card_id, references(:cards, on_delete: :delete_all), null: false

      timestamps()
    end

    create index(:categories, [:card_id])
  end
end
