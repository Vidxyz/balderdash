defmodule Balderdash.Game.GameRepo do
  @moduledoc """
  Repository for persisting and loading game state from the database.
  """

  alias Balderdash.Repo
  alias Balderdash.Schemas.ActiveGame
  alias Balderdash.GameState

  @doc """
  Saves game state to the database.
  """
  def save_state(state) do
    state_json = state_to_json(state)
    current_pod = System.get_env("HOSTNAME") || "unknown"

    case Repo.get_by(ActiveGame, room_code: state.room_code) do
      nil ->
        # Create new
        %ActiveGame{}
        |> ActiveGame.changeset(%{
          room_code: state.room_code,
          state_json: state_json,
          current_pod: current_pod,
          last_updated: DateTime.utc_now()
        })
        |> Repo.insert()

      existing ->
        # Update existing
        existing
        |> ActiveGame.changeset(%{
          state_json: state_json,
          current_pod: current_pod,
          last_updated: DateTime.utc_now()
        })
        |> Repo.update()
    end
  end

  @doc """
  Loads game state from the database.
  """
  def load_state(room_code) do
    case Repo.get_by(ActiveGame, room_code: room_code) do
      nil -> nil
      active_game -> json_to_state(active_game.state_json)
    end
  end

  @doc """
  Deletes game state from the database (when game ends).
  """
  def delete_state(room_code) do
    case Repo.get_by(ActiveGame, room_code: room_code) do
      nil -> {:ok, nil}
      active_game -> Repo.delete(active_game)
    end
  end

  # Convert GameState struct to JSON-serializable map
  defp state_to_json(state) do
    %{
      room_code: state.room_code,
      players: state.players,
      game_state: Atom.to_string(state.game_state),
      current_round: round_to_json(state.current_round),
      round_number: state.round_number,
      winners: Enum.map(state.winners || [], &player_to_json/1),
      max_players: state.max_players,
      last_round_score_reasons: state.last_round_score_reasons || %{},
      funniest_votes_per_player: state.funniest_votes_per_player || %{}
    }
  end

  defp round_to_json(nil), do: nil

  defp round_to_json(round) do
    %{
      roundmaster_id: round.roundmaster_id,
      card_id: round.card_id,
      card_number: round.card_number,
      die_roll: round.die_roll,
      category: round.category,
      answers: round.answers,
      votes_correct: round.votes_correct,
      votes_funniest: round.votes_funniest,
      timer_remaining: round.timer_remaining,
      all_answers_submitted: round.all_answers_submitted,
      all_votes_submitted: round.all_votes_submitted
    }
  end

  defp player_to_json(nil), do: nil
  defp player_to_json(player), do: player

  # Convert JSON map back to GameState struct
  defp json_to_state(nil), do: nil

  defp json_to_state(json) do
    game_state_str = json["game_state"] || json[:game_state] || "lobby"
    game_state_atom = 
      if is_atom(game_state_str) do
        game_state_str
      else
        String.to_existing_atom(game_state_str)
      end

    %GameState{
      room_code: json["room_code"] || json[:room_code],
      players: normalize_players(json["players"] || json[:players] || []),
      game_state: game_state_atom,
      current_round: json_to_round(json["current_round"] || json[:current_round]),
      round_number: json["round_number"] || json[:round_number] || 0,
      winners: normalize_winners(json["winners"] || json[:winners] || json["winner"] || json[:winner]),
      max_players: json["max_players"] || json[:max_players] || 10,
      last_round_score_reasons: normalize_score_reasons(json["last_round_score_reasons"] || json[:last_round_score_reasons] || %{}),
      funniest_votes_per_player: normalize_funniest_votes(json["funniest_votes_per_player"] || json[:funniest_votes_per_player] || %{})
    }
  end

  defp normalize_funniest_votes(map) when is_map(map) do
    map
    |> Enum.map(fn
      {k, v} when is_integer(v) -> {normalize_id(k), v}
      {k, v} when is_float(v) -> {normalize_id(k), trunc(v)}
      {k, _} -> {normalize_id(k), 0}
    end)
    |> Map.new()
  end
  defp normalize_funniest_votes(_), do: %{}

  defp normalize_score_reasons(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_list(v) -> {normalize_id(k), Enum.map(v, &to_string/1)}
      {k, v} -> {normalize_id(k), [to_string(v)]}
    end)
  end
  defp normalize_score_reasons(_), do: %{}

  defp normalize_id(k) when is_binary(k), do: k
  defp normalize_id(k) when is_atom(k), do: to_string(k)
  defp normalize_id(k), do: to_string(k)

  defp normalize_players(players) when is_list(players) do
    Enum.map(players, &normalize_player/1)
  end

  defp normalize_winners(nil), do: []
  defp normalize_winners([]), do: []
  defp normalize_winners(players) when is_list(players), do: Enum.map(players, &normalize_player/1)
  defp normalize_winners(single) when is_map(single), do: [normalize_player(single)]

  defp normalize_player(nil), do: nil
  defp normalize_player(player) when is_map(player) do
    %{
      id: player["id"] || player[:id],
      name: player["name"] || player[:name],
      role: normalize_role(player["role"] || player[:role]),
      points: player["points"] || player[:points] || 0
    }
  end

  defp normalize_role(role) when is_atom(role), do: role
  defp normalize_role(role) when is_binary(role), do: String.to_existing_atom(role)
  defp normalize_role(_), do: :guest

  defp json_to_round(nil), do: nil

  defp json_to_round(round_json) do
    category = round_json["category"] || round_json[:category] || %{}
    
    %{
      roundmaster_id: round_json["roundmaster_id"] || round_json[:roundmaster_id],
      card_id: round_json["card_id"] || round_json[:card_id],
      card_number: round_json["card_number"] || round_json[:card_number],
      die_roll: round_json["die_roll"] || round_json[:die_roll],
      category: %{
        id: category["id"] || category[:id],
        name: category["name"] || category[:name],
        question: category["question"] || category[:question],
        answer: category["answer"] || category[:answer]
      },
      answers: normalize_map(round_json["answers"] || round_json[:answers] || %{}),
      votes_correct: normalize_map(round_json["votes_correct"] || round_json[:votes_correct] || %{}),
      votes_funniest: normalize_map(round_json["votes_funniest"] || round_json[:votes_funniest] || %{}),
      timer_remaining: round_json["timer_remaining"] || round_json[:timer_remaining] || 0,
      timer_ref: nil, # Don't restore timer ref
      all_answers_submitted: round_json["all_answers_submitted"] || round_json[:all_answers_submitted] || false,
      all_votes_submitted: round_json["all_votes_submitted"] || round_json[:all_votes_submitted] || false
    }
  end

  defp normalize_map(map) when is_map(map) do
    map
    |> Enum.map(fn 
      {k, v} when is_binary(k) -> {k, v}
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
    |> Map.new()
  end
  defp normalize_map(other), do: other

end
