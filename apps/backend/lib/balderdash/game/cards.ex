defmodule Balderdash.Game.Cards do
  @moduledoc """
  Handles card and category selection logic.
  """

  import Ecto.Query
  alias Balderdash.Repo
  alias Balderdash.Schemas.Card
  alias Balderdash.Schemas.Category

  @doc """
  Selects a random card and category based on die roll.
  Returns {card_number, category}
  """
  def select_card_and_category(die_roll) when die_roll in 1..5 do
    # Get a random card (1-10)
    card_number = :rand.uniform(10)
    
    # Get the card from database
    card = Repo.get_by!(Card, card_number: card_number)
    
    # Get all categories for this card
    categories = Repo.all(
      from c in Category,
      where: c.card_id == ^card.id,
      order_by: c.id
    )

    # Select category based on die roll (1-5 maps to category index 0-4)
    category = Enum.at(categories, die_roll - 1)

    %{
      card_id: card.id,
      card_number: card_number,
      category: %{
        id: category.id,
        name: category.category_name,
        question: category.question,
        answer: category.answer
      }
    }
  end

  @doc """
  Rolls a die (1-5).
  """
  def roll_die do
    :rand.uniform(5)
  end
end
