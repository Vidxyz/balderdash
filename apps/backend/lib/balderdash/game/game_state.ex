defmodule Balderdash.GameState do
  @moduledoc """
  Defines the game state structure and helper functions.
  """

  defstruct [
    :room_code,
    :players,
    :game_state,  # :lobby, :playing, :round_active, :voting, :results, :game_over
    :current_round,
    :round_number,
    :winner,
    :max_players
  ]

  @type t :: %__MODULE__{
    room_code: String.t(),
    players: list(player()),
    game_state: atom(),
    current_round: round() | nil,
    round_number: integer(),
    winner: player() | nil,
    max_players: integer()
  }

  @type player :: %{
    id: String.t(),
    name: String.t(),
    role: :host | :guest,
    points: integer()
  }

  @type round :: %{
    roundmaster_id: String.t(),
    card_id: integer(),
    card_number: integer(),
    die_roll: integer(),
    category: category(),
    answers: map(),  # %{player_id => answer_text}
    votes_correct: map(),  # %{player_id => answer_id}
    votes_funniest: map(),  # %{player_id => answer_id}
    timer_remaining: integer(),
    timer_ref: reference() | nil,
    all_answers_submitted: boolean(),
    all_votes_submitted: boolean()
  }

  @type category :: %{
    id: integer(),
    name: String.t(),
    question: String.t(),
    answer: String.t()
  }

  def new(room_code, max_players \\ 10) do
    %__MODULE__{
      room_code: room_code,
      players: [],
      game_state: :lobby,
      current_round: nil,
      round_number: 0,
      winner: nil,
      max_players: max_players
    }
  end

  def add_player(state, player_id, player_name) do
    new_player = %{
      id: player_id,
      name: player_name,
      role: if(length(state.players) == 0, do: :host, else: :guest),
      points: 0
    }

    %{state | players: state.players ++ [new_player]}
  end

  def can_start?(state) do
    length(state.players) >= 2 && state.game_state == :lobby
  end

  def get_player(state, player_id) do
    Enum.find(state.players, fn p -> p.id == player_id end)
  end

  def get_roundmaster(state) do
    if state.current_round do
      get_player(state, state.current_round.roundmaster_id)
    else
      nil
    end
  end

  def get_next_roundmaster(state) do
    current_index = 
      if state.current_round do
        Enum.find_index(state.players, fn p -> p.id == state.current_round.roundmaster_id end)
      else
        -1
      end

    next_index = rem(current_index + 1, length(state.players))
    Enum.at(state.players, next_index)
  end

  def is_roundmaster?(state, player_id) do
    if state.current_round do
      state.current_round.roundmaster_id == player_id
    else
      false
    end
  end

  def get_non_roundmaster_players(state) do
    if state.current_round do
      Enum.reject(state.players, fn p -> p.id == state.current_round.roundmaster_id end)
    else
      []
    end
  end

  def has_won?(state) do
    Enum.any?(state.players, fn p -> p.points >= 25 end)
  end

  def get_winner(state) do
    Enum.find(state.players, fn p -> p.points >= 25 end)
  end
end
