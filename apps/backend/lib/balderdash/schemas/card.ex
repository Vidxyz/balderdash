defmodule Balderdash.Schemas.Card do
  use Ecto.Schema
  import Ecto.Changeset

  schema "cards" do
    field :card_number, :integer
    has_many :categories, Balderdash.Schemas.Category

    timestamps()
  end

  @doc false
  def changeset(card, attrs) do
    card
    |> cast(attrs, [:card_number])
    |> validate_required([:card_number])
    |> unique_constraint(:card_number)
  end
end
