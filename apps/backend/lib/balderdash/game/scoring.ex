defmodule Balderdash.Game.Scoring do
  @moduledoc """
  Handles scoring calculations for game rounds.
  """

  @doc """
  Calculates scores for a round based on votes.
  Returns {updated_players, score_changes_map, score_reasons_map}
  score_reasons_map: %{player_id => [reason_string]}
  """
  def calculate_scores(players, round) do
    correct_answer = round.category.answer
    roundmaster_id = round.roundmaster_id
    player_by_id = Map.new(players, fn p -> {p.id, p} end)

    # Create a map of answer_id => {player_id, answer_text}
    answer_map = 
      round.answers
      |> Enum.map(fn {player_id, answer_text} ->
        answer_id = generate_answer_id(player_id)
        {answer_id, {player_id, answer_text}}
      end)
      |> Map.new()

    correct_answer_id = "correct"
    answer_map = Map.put(answer_map, correct_answer_id, {nil, correct_answer})

    score_changes = Enum.map(players, fn p -> {p.id, 0} end) |> Map.new()
    score_reasons = Enum.map(players, fn p -> {p.id, []} end) |> Map.new()

    # Correct answer votes: +2 each, reason "You guessed the correct answer!"
    correct_voters = 
      round.votes_correct
      |> Enum.filter(fn {_voter_id, voted_answer_id} -> voted_answer_id == correct_answer_id end)
      |> Enum.map(fn {voter_id, _} -> voter_id end)

    {score_changes, score_reasons} =
      Enum.reduce(correct_voters, {score_changes, score_reasons}, fn voter_id, {acc_changes, acc_reasons} ->
        changes = Map.update(acc_changes, voter_id, 2, &(&1 + 2))
        reasons = Map.update(acc_reasons, voter_id, ["You guessed the correct answer!"], fn list -> ["You guessed the correct answer!" | list] end)
        {changes, reasons}
      end)

    # Fooling points: +1 per *other* voter to answer author (exclude self-votes)
    {score_changes, score_reasons} =
      Enum.reduce(answer_map, {score_changes, score_reasons}, fn {answer_id, {answer_author_id, _answer_text}}, {acc_changes, acc_reasons} ->
        if answer_id != correct_answer_id && answer_author_id do
          voters = 
            round.votes_correct
            |> Enum.filter(fn {voter_id, voted_answer_id} -> voted_answer_id == answer_id && voter_id != answer_author_id end)
            |> Enum.map(fn {voter_id, _} -> voter_id end)
          votes_count = length(voters)
          if votes_count > 0 do
            voter_names = Enum.map(voters, fn id -> Map.get(player_by_id[id] || %{}, :name) || "Someone" end) |> Enum.join(", ")
            reason = "#{voter_names} selected your answer"
            changes = Map.update(acc_changes, answer_author_id, votes_count, &(&1 + votes_count))
            reasons = Map.update(acc_reasons, answer_author_id, [reason], fn list -> [reason | list] end)
            {changes, reasons}
          else
            {acc_changes, acc_reasons}
          end
        else
          {acc_changes, acc_reasons}
        end
      end)

    correct_guesses = length(correct_voters)

    # No one guessed correctly: roundmaster gets +2, reason "No one guessed the right answer"
    {score_changes, score_reasons} =
      if correct_guesses == 0 do
        changes = Map.update(score_changes, roundmaster_id, 2, &(&1 + 2))
        reasons = Map.update(score_reasons, roundmaster_id, ["No one guessed the right answer"], fn list -> ["No one guessed the right answer" | list] end)
        {changes, reasons}
      else
        {score_changes, score_reasons}
      end

    updated_players = 
      Enum.map(players, fn player ->
        points_to_add = Map.get(score_changes, player.id, 0)
        %{player | points: player.points + points_to_add}
      end)

    # Reverse reason lists so order is logical (correct guess first, then fooling, then roundmaster)
    score_reasons = Map.new(score_reasons, fn {id, list} -> {id, Enum.reverse(list)} end)

    {updated_players, score_changes, score_reasons}
  end

  defp generate_answer_id(player_id) do
    "answer_#{player_id}"
  end
end
