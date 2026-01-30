defmodule Balderdash.Game.Scoring do
  @moduledoc """
  Handles scoring calculations for game rounds.
  """

  @doc """
  Calculates scores for a round based on votes.
  Returns {updated_players, score_changes_map}
  """
  def calculate_scores(players, round) do
    correct_answer = round.category.answer
    roundmaster_id = round.roundmaster_id

    # Create a map of answer_id => {player_id, answer_text}
    answer_map = 
      round.answers
      |> Enum.map(fn {player_id, answer_text} ->
        answer_id = generate_answer_id(player_id)
        {answer_id, {player_id, answer_text}}
      end)
      |> Map.new()

    # Add the correct answer to the map
    correct_answer_id = "correct"
    answer_map = Map.put(answer_map, correct_answer_id, {nil, correct_answer})

    # Initialize score changes
    score_changes = 
      players
      |> Enum.map(fn p -> {p.id, 0} end)
      |> Map.new()

    # Calculate scores - first handle correct answer votes
    correct_voters = 
      round.votes_correct
      |> Enum.filter(fn {_voter_id, voted_answer_id} -> voted_answer_id == correct_answer_id end)
      |> Enum.map(fn {voter_id, _} -> voter_id end)

    # Give 2 points to each correct voter
    score_changes = 
      Enum.reduce(correct_voters, score_changes, fn voter_id, acc ->
        Map.update(acc, voter_id, 2, &(&1 + 2))
      end)

    # Calculate scores for incorrect answers (fooling points)
    score_changes = 
      Enum.reduce(answer_map, score_changes, fn {answer_id, {answer_author_id, _answer_text}}, acc ->
        if answer_id != correct_answer_id && answer_author_id do
          # Count votes for this incorrect answer
          votes_count = 
            round.votes_correct
            |> Enum.filter(fn {_voter_id, voted_answer_id} -> voted_answer_id == answer_id end)
            |> length()

          # Give 1 point per voter to the answer author
          if votes_count > 0 do
            Map.update(acc, answer_author_id, votes_count, &(&1 + votes_count))
          else
            acc
          end
        else
          acc
        end
      end)

    # Check if anyone guessed correctly
    correct_guesses = length(correct_voters)

    # If no one guessed correctly, roundmaster gets 2 points
    score_changes = 
      if correct_guesses == 0 do
        Map.update(score_changes, roundmaster_id, 2, &(&1 + 2))
      else
        score_changes
      end

    # Apply score changes to players
    updated_players = 
      players
      |> Enum.map(fn player ->
        points_to_add = Map.get(score_changes, player.id, 0)
        %{player | points: player.points + points_to_add}
      end)

    {updated_players, score_changes}
  end

  defp generate_answer_id(player_id) do
    "answer_#{player_id}"
  end
end
