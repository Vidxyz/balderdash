defmodule Balderdash.GameProcess do
  @moduledoc """
  GenServer that manages the state of a single game.
  Handles all game logic including rounds, voting, scoring, and timers.
  """
  use GenServer
  require Logger

  alias Balderdash.GameState
  alias Balderdash.Game.Cards
  alias Balderdash.Game.Scoring
  alias Balderdash.Game.GameRepo

  # Client API

  def start_link(room_code, max_players \\ 10) do
    GenServer.start_link(__MODULE__, {room_code, max_players}, name: via_tuple(room_code))
  end

  def get_state(room_code) do
    GenServer.call(via_tuple(room_code), :get_state)
  end

  def join_room(room_code, player_id, player_name) do
    GenServer.call(via_tuple(room_code), {:join_room, player_id, player_name})
  end

  def start_game(room_code) do
    GenServer.call(via_tuple(room_code), :start_game)
  end

  def start_round(room_code) do
    GenServer.call(via_tuple(room_code), :start_round)
  end

  def submit_answer(room_code, player_id, answer) do
    GenServer.call(via_tuple(room_code), {:submit_answer, player_id, answer})
  end

  def vote_correct(room_code, player_id, answer_id) do
    GenServer.call(via_tuple(room_code), {:vote_correct, player_id, answer_id})
  end

  def vote_funniest(room_code, player_id, answer_id) do
    GenServer.call(via_tuple(room_code), {:vote_funniest, player_id, answer_id})
  end

  defp via_tuple(room_code) do
    {:via, Registry, {Balderdash.GameRegistry, room_code}}
  end

  # Server callbacks

  def init({room_code, max_players}) do
    # Try to load state from DB, otherwise create new
    state =
      case GameRepo.load_state(room_code) do
        nil ->
          new_state = GameState.new(room_code, max_players)
          persist_state(new_state)
          new_state
        loaded_state ->
          # Preserve round_active/voting so reconnecting clients see the right phase.
          # We can't restore timers; advance to next phase so game progresses and UI is consistent.
          case loaded_state.game_state do
            :round_active when is_map(loaded_state.current_round) ->
              round_cleared = %{loaded_state.current_round | timer_remaining: 0, timer_ref: nil}
              state_with_round = %{loaded_state | current_round: round_cleared}
              transition_to_voting(state_with_round)
            :voting when is_map(loaded_state.current_round) ->
              round_cleared = %{loaded_state.current_round | voting_timer_remaining: 0, voting_timer_ref: nil}
              state_with_round = %{loaded_state | current_round: round_cleared}
              transition_to_results(state_with_round)
            _ ->
              loaded_state
          end
      end

    # Schedule periodic checkpointing (every 30 seconds)
    schedule_checkpoint()

    {:ok, state}
  end

  def handle_call(:get_state, _from, state) do
    # Convert state to map for JSON serialization; drop refs (not serializable)
    current_round = 
      if state.current_round do
        Map.drop(state.current_round, [:timer_ref, :voting_timer_ref])
      else
        nil
      end

    funniest_winner = if state.game_state == :game_over, do: GameState.get_funniest_winner(state), else: []

    state_map = %{
      room_code: state.room_code,
      players: state.players,
      game_state: state.game_state,
      current_round: current_round,
      round_number: state.round_number,
      winners: state.winners || [],
      max_players: state.max_players,
      last_round_score_reasons: state.last_round_score_reasons || %{},
      funniest_votes_per_player: state.funniest_votes_per_player || %{},
      funniest_winner: funniest_winner
    }
    {:reply, state_map, state}
  end

  def handle_call({:join_room, player_id, player_name}, _from, state) do
    cond do
      state.game_state != :lobby ->
        {:reply, {:error, "Game already started"}, state}
      length(state.players) >= state.max_players ->
        {:reply, {:error, "Room is full"}, state}
      GameState.get_player(state, player_id) != nil ->
        {:reply, {:error, "Already in game"}, state}
      true ->
        updated_state = GameState.add_player(state, player_id, player_name)
        persist_state(updated_state)
        broadcast_state(updated_state)
        {:reply, :ok, updated_state}
    end
  end

  def handle_call(:start_game, _from, state) do
    if GameState.can_start?(state) do
      updated_state = %{state | game_state: :playing, round_number: 0}
      persist_state(updated_state)
      broadcast_state(updated_state)
      {:reply, :ok, updated_state}
    else
      {:reply, {:error, "Need at least 2 players"}, state}
    end
  end

  def handle_call(:start_round, _from, state) do
    if state.game_state != :playing && state.game_state != :results do
      {:reply, {:error, "Game not in correct state"}, state}
    else
      roundmaster = GameState.get_next_roundmaster(state)
      die_roll = Cards.roll_die()
      card_data = Cards.select_card_and_category(die_roll)
      round = %{
        roundmaster_id: roundmaster.id,
        card_id: card_data.card_id,
        card_number: card_data.card_number,
        die_roll: die_roll,
        category: card_data.category,
        answers: %{},
        votes_correct: %{},
        votes_funniest: %{},
        timer_remaining: 90,
        timer_ref: nil,
        all_answers_submitted: false,
        all_votes_submitted: false
      }
      updated_state = %{
        state
        | game_state: :round_active,
          current_round: round,
          round_number: state.round_number + 1,
          last_round_score_reasons: %{}
      }
      timer_ref = Process.send_after(self(), :timer_tick, 1000)
      updated_round = %{round | timer_ref: timer_ref}
      updated_state = %{updated_state | current_round: updated_round}
      persist_state(updated_state)
      broadcast_state(updated_state)
      {:reply, :ok, updated_state}
    end
  end

  def handle_call({:submit_answer, player_id, answer}, _from, state) do
    cond do
      not player_in_game?(state, player_id) ->
        {:reply, {:error, "Not a player in this game"}, state}
      state.game_state != :round_active ->
        {:reply, {:error, "Not in answer submission phase"}, state}
      GameState.is_roundmaster?(state, player_id) ->
        {:reply, {:error, "Roundmaster cannot submit answers"}, state}
      true ->
        # Add answer
        updated_answers = Map.put(state.current_round.answers, player_id, answer)
        updated_round = %{state.current_round | answers: updated_answers}

        # Check if all non-roundmaster players have submitted
        non_roundmaster_players = GameState.get_non_roundmaster_players(state)
        all_submitted = length(Map.keys(updated_answers)) >= length(non_roundmaster_players)

        round_with_submitted = %{updated_round | all_answers_submitted: all_submitted}

        # Cancel timer if all submitted
        round_final =
          if all_submitted && round_with_submitted.timer_ref do
            Process.cancel_timer(round_with_submitted.timer_ref)
            %{round_with_submitted | timer_remaining: 0, timer_ref: nil}
          else
            round_with_submitted
          end

        state_with_round = %{state | current_round: round_final}

        # If all submitted, transition to voting
        final_state =
          if all_submitted do
            transition_to_voting(state_with_round)
          else
            persist_state(state_with_round)
            broadcast_state(state_with_round)
            state_with_round
          end

        {:reply, :ok, final_state}
    end
  end

  def handle_call({:vote_correct, player_id, answer_id}, _from, state) do
    cond do
      not player_in_game?(state, player_id) ->
        {:reply, {:error, "Not a player in this game"}, state}
      state.game_state != :voting ->
        {:reply, {:error, "Not in voting phase"}, state}
      true ->
        updated_votes = Map.put(state.current_round.votes_correct, player_id, answer_id)
        updated_round = %{state.current_round | votes_correct: updated_votes}
        non_roundmaster_players = GameState.get_non_roundmaster_players(state)
        all_voted = length(Map.keys(updated_votes)) >= length(non_roundmaster_players)
        round_with_votes = %{updated_round | all_votes_submitted: all_voted}
        state_with_round = %{state | current_round: round_with_votes}
        final_state =
          if all_voted && all_funniest_votes_submitted?(state_with_round) do
            transition_to_results(state_with_round)
          else
            persist_state(state_with_round)
            broadcast_state(state_with_round)
            state_with_round
          end
        {:reply, :ok, final_state}
    end
  end

  def handle_call({:vote_funniest, player_id, answer_id}, _from, state) do
    cond do
      not player_in_game?(state, player_id) ->
        {:reply, {:error, "Not a player in this game"}, state}
      state.game_state != :voting ->
        {:reply, {:error, "Not in voting phase"}, state}
      true ->
        updated_votes = Map.put(state.current_round.votes_funniest, player_id, answer_id)
        round_with_funniest = %{state.current_round | votes_funniest: updated_votes}
        state_with_round = %{state | current_round: round_with_funniest}
        final_state =
          if all_funniest_votes_submitted?(state_with_round) &&
               all_correct_votes_submitted?(state_with_round) do
            transition_to_results(state_with_round)
          else
            persist_state(state_with_round)
            broadcast_state(state_with_round)
            state_with_round
          end
        {:reply, :ok, final_state}
    end
  end

  def handle_info(:timer_tick, state) do
    if state.game_state == :round_active && state.current_round do
      updated_remaining = state.current_round.timer_remaining - 1

      if updated_remaining <= 0 do
        # Time's up, transition to voting
        round_cleared = %{state.current_round | timer_remaining: 0, timer_ref: nil}
        state_cleared = %{state | current_round: round_cleared}
        final_state = transition_to_voting(state_cleared)
        {:noreply, final_state}
      else
        # Continue timer
        round_ticked = %{state.current_round | timer_remaining: updated_remaining}
        timer_ref = Process.send_after(self(), :timer_tick, 1000)
        round_with_timer = %{round_ticked | timer_ref: timer_ref}
        state_ticked = %{state | current_round: round_with_timer}

        broadcast_state(state_ticked)
        {:noreply, state_ticked}
      end
    else
      {:noreply, state}
    end
  end

  def handle_info(:checkpoint, state) do
    # Periodic checkpoint - save state to DB
    persist_state(state)
    schedule_checkpoint()
    {:noreply, state}
  end

  # Private helpers

  defp transition_to_voting(state) do
    round_with_timer = Map.merge(state.current_round, %{voting_timer_remaining: 30, voting_timer_ref: nil})
    timer_ref = Process.send_after(self(), :voting_timer_tick, 1000)
    round_with_timer = %{round_with_timer | voting_timer_ref: timer_ref}
    updated_state = %{state | game_state: :voting, current_round: round_with_timer}
    persist_state(updated_state)
    broadcast_state(updated_state)
    updated_state
  end

  defp transition_to_results(state) do
    # Cancel voting timer if running
    state = maybe_cancel_voting_timer(state)
    # Calculate scores and reasons
    {updated_players, _score_changes, score_reasons} = Scoring.calculate_scores(state.players, state.current_round)

    # Accumulate funniest votes this round into game total (player_id => count of "funniest" votes received)
    round_funniest = round_funniest_counts(state)
    accumulated_funniest =
      Enum.reduce(round_funniest, state.funniest_votes_per_player || %{}, fn {player_id, count}, acc ->
        Map.update(acc, player_id, count, &(&1 + count))
      end)

    state_with_scores = %{
      state
      | game_state: :results,
        players: updated_players,
        last_round_score_reasons: score_reasons,
        funniest_votes_per_player: accumulated_funniest
    }

    # Check for winners (supports ties)
    final_state =
      if GameState.has_won?(state_with_scores) do
        winners = GameState.get_winners(state_with_scores)
        %{state_with_scores | game_state: :game_over, winners: winners}
      else
        # Set state back to playing for next round; keep current_round so get_next_roundmaster can rotate
        %{state_with_scores | game_state: :playing}
      end

    persist_state(final_state)
    broadcast_state(final_state)
    final_state
  end

  defp round_funniest_counts(state) do
    votes = state.current_round.votes_funniest || %{}
    Enum.map(state.players, fn p ->
      count = Enum.count(votes, fn {_voter, answer_id} -> answer_id == "answer_#{p.id}" end)
      {p.id, count}
    end)
    |> Map.new()
  end

  defp all_correct_votes_submitted?(state) do
    non_roundmaster_players = GameState.get_non_roundmaster_players(state)
    length(Map.keys(state.current_round.votes_correct)) >= length(non_roundmaster_players)
  end

  defp all_funniest_votes_submitted?(state) do
    non_roundmaster_players = GameState.get_non_roundmaster_players(state)
    length(Map.keys(state.current_round.votes_funniest)) >= length(non_roundmaster_players)
  end

  defp player_in_game?(state, player_id) do
    GameState.get_player(state, player_id) != nil
  end

  defp maybe_cancel_voting_timer(state) do
    if state.current_round && state.current_round[:voting_timer_ref] do
      Process.cancel_timer(state.current_round.voting_timer_ref)
      round_cleared = %{state.current_round | voting_timer_remaining: 0, voting_timer_ref: nil}
      %{state | current_round: round_cleared}
    else
      state
    end
  end

  def handle_info(:voting_timer_tick, state) do
    if state.game_state == :voting && state.current_round do
      remaining = (state.current_round[:voting_timer_remaining] || 0) - 1
      round_updated = %{state.current_round | voting_timer_remaining: max(0, remaining), voting_timer_ref: nil}
      if remaining <= 0 do
        state_cleared = %{state | current_round: round_updated}
        final_state = transition_to_results(state_cleared)
        {:noreply, final_state}
      else
        timer_ref = Process.send_after(self(), :voting_timer_tick, 1000)
        round_with_timer = %{round_updated | voting_timer_ref: timer_ref}
        state_ticked = %{state | current_round: round_with_timer}
        persist_state(state_ticked)
        broadcast_state(state_ticked)
        {:noreply, state_ticked}
      end
    else
      {:noreply, state}
    end
  end

  defp broadcast_state(state) do
    Phoenix.PubSub.broadcast(
      Balderdash.PubSub,
      "game:#{state.room_code}",
      {:game_state_updated, state}
    )
  end

  defp persist_state(state) do
    case GameRepo.save_state(state) do
      {:ok, _} -> 
        Logger.debug("Persisted game state for room: #{state.room_code}")
      {:error, changeset} -> 
        Logger.error("Failed to persist game state: #{inspect(changeset.errors)}")
    end
  end

  defp _cleanup_state(room_code) do
    case GameRepo.delete_state(room_code) do
      {:ok, _} -> 
        Logger.info("Cleaned up game state for room: #{room_code}")
      {:error, reason} -> 
        Logger.warning("Failed to cleanup game state: #{inspect(reason)}")
    end
  end

  defp schedule_checkpoint do
    Process.send_after(self(), :checkpoint, 30_000) # 30 seconds
  end
end
