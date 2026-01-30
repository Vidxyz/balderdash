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
          # If we loaded a state that was in the middle of a round, reset to playing
          # (can't restore active timers)
          if loaded_state.game_state == :round_active do
            reset_state = %{loaded_state | game_state: :playing, current_round: nil}
            persist_state(reset_state)
            reset_state
          else
            loaded_state
          end
      end

    # Schedule periodic checkpointing (every 30 seconds)
    schedule_checkpoint()

    {:ok, state}
  end

  def handle_call(:get_state, _from, state) do
    # Convert state to map for JSON serialization
    # Remove timer_ref from round as it's not serializable
    current_round = 
      if state.current_round do
        Map.drop(state.current_round, [:timer_ref])
      else
        nil
      end

    state_map = %{
      room_code: state.room_code,
      players: state.players,
      game_state: state.game_state,
      current_round: current_round,
      round_number: state.round_number,
      winner: state.winner,
      max_players: state.max_players
    }
    {:reply, state_map, state}
  end

  def handle_call({:join_room, player_id, player_name}, _from, state) do
    if length(state.players) >= state.max_players do
      {:reply, {:error, "Room is full"}, state}
    else
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
      
      # Start first round
      {:reply, :ok, updated_state}
    else
      {:reply, {:error, "Need at least 2 players"}, state}
    end
  end

  def handle_call(:start_round, _from, state) do
    if state.game_state != :playing && state.game_state != :results do
      {:reply, {:error, "Game not in correct state"}, state}
    else
      # Get next roundmaster
      roundmaster = GameState.get_next_roundmaster(state)
      
      # Roll die and select card/category
      die_roll = Cards.roll_die()
      card_data = Cards.select_card_and_category(die_roll)
      
      # Create new round
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
          round_number: state.round_number + 1
      }

      # Start timer
      timer_ref = Process.send_after(self(), :timer_tick, 1000)
      updated_round = %{round | timer_ref: timer_ref}
      updated_state = %{updated_state | current_round: updated_round}

      persist_state(updated_state)
      broadcast_state(updated_state)
      {:reply, :ok, updated_state}
    end
  end

  def handle_call({:submit_answer, player_id, answer}, _from, state) do
    if state.game_state != :round_active do
      {:reply, {:error, "Not in answer submission phase"}, state}
    else
      # Check if player is roundmaster
      if GameState.is_roundmaster?(state, player_id) do
        {:reply, {:error, "Roundmaster cannot submit answers"}, state}
      else
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
  end

  def handle_call({:vote_correct, player_id, answer_id}, _from, state) do
    if state.game_state != :voting do
      {:reply, {:error, "Not in voting phase"}, state}
    else
      # Add vote
      updated_votes = Map.put(state.current_round.votes_correct, player_id, answer_id)
      updated_round = %{state.current_round | votes_correct: updated_votes}

      # Check if all non-roundmaster players have voted
      non_roundmaster_players = GameState.get_non_roundmaster_players(state)
      all_voted = length(Map.keys(updated_votes)) >= length(non_roundmaster_players)

      round_with_votes = %{updated_round | all_votes_submitted: all_voted}

      state_with_round = %{state | current_round: round_with_votes}

      # If all voted (and funniest votes are done), transition to results
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
    if state.game_state != :voting do
      {:reply, {:error, "Not in voting phase"}, state}
    else
      # Add vote
      updated_votes = Map.put(state.current_round.votes_funniest, player_id, answer_id)
      round_with_funniest = %{state.current_round | votes_funniest: updated_votes}

      state_with_round = %{state | current_round: round_with_funniest}

      # Check if all votes are in
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
    updated_state = %{state | game_state: :voting}
    persist_state(updated_state)
    broadcast_state(updated_state)
    updated_state
  end

  defp transition_to_results(state) do
    # Calculate scores
    {updated_players, _score_changes} = Scoring.calculate_scores(state.players, state.current_round)

    state_with_scores = %{
      state
      | game_state: :results,
        players: updated_players
    }

    # Check for winner
    final_state =
      if GameState.has_won?(state_with_scores) do
        winner = GameState.get_winner(state_with_scores)
        %{state_with_scores | game_state: :game_over, winner: winner}
      else
        # Set state back to playing for next round
        %{state_with_scores | game_state: :playing, current_round: nil}
      end

    persist_state(final_state)
    broadcast_state(final_state)
    final_state
  end

  defp all_correct_votes_submitted?(state) do
    non_roundmaster_players = GameState.get_non_roundmaster_players(state)
    length(Map.keys(state.current_round.votes_correct)) >= length(non_roundmaster_players)
  end

  defp all_funniest_votes_submitted?(state) do
    non_roundmaster_players = GameState.get_non_roundmaster_players(state)
    length(Map.keys(state.current_round.votes_funniest)) >= length(non_roundmaster_players)
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
