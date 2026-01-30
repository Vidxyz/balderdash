defmodule Balderdash.Schemas.Category do
  use Ecto.Schema
  import Ecto.Changeset

  schema "categories" do
    field :category_name, :string
    field :question, :string
    field :answer, :string
    belongs_to :card, Balderdash.Schemas.Card

    timestamps()
  end

  @doc false
  def changeset(category, attrs) do
    category
    |> cast(attrs, [:category_name, :question, :answer, :card_id])
    |> validate_required([:category_name, :question, :answer, :card_id])
    |> assoc_constraint(:card)
  end
end
