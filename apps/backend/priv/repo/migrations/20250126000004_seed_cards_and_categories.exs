defmodule Balderdash.Repo.Migrations.SeedCardsAndCategories do
  use Ecto.Migration

  def up do
    Balderdash.Seeds.run(repo())
  end

  def down do
    execute "DELETE FROM categories"
    execute "DELETE FROM cards"
  end
end
