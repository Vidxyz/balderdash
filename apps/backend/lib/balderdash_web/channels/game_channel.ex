defmodule BalderdashWeb.GameChannel do
  use BalderdashWeb, :channel
  require Logger

  alias Balderdash.GameProcess

  @impl true
  def join("game:lobby:" <> room_code, payload, socket) do
    # Subscribe to PubSub topic for this game
    Phoenix.PubSub.subscribe(Balderdash.PubSub, "game:#{room_code}")

    # Load or create game process
    case Balderdash.GameRegistry.get_or_create(room_code) do
      {:ok, _pid} ->
        # Send current state in join reply so clients (e.g. on refresh) get state without re-joining room
        state = GameProcess.get_state(room_code)
        socket =
          socket
          |> assign(:room_code, room_code)
          |> maybe_assign_player_id(payload)

        {:ok, %{state: state}, socket}

      {:error, reason} ->
        Logger.error("Failed to get or create game: #{inspect(reason)}")
        {:error, %{reason: "Failed to join game"}}
    end
  end

  # Reconnecting clients send player_id in channel params so we don't require join_room again
  defp maybe_assign_player_id(socket, %{"player_id" => player_id}) when is_binary(player_id) and byte_size(player_id) > 0 do
    assign(socket, :player_id, player_id)
  end
  defp maybe_assign_player_id(socket, _payload), do: socket

  @impl true
  def handle_info({:game_state_updated, _state}, socket) do
    # Push same serializable shape as join reply (no timer_ref, etc.) so all clients receive it
    room_code = socket.assigns.room_code
    state = GameProcess.get_state(room_code)
    push(socket, "state_update", state)
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_state", _params, socket) do
    room_code = socket.assigns.room_code
    state = GameProcess.get_state(room_code)
    {:reply, {:ok, state}, socket}
  end

  @impl true
  def handle_in("join_room", %{"player_name" => player_name}, socket) do
    room_code = socket.assigns.room_code
    # Always generate a new id for join_room so we never reuse another client's id
    # (e.g. same browser with different tabs sharing localStorage would otherwise overwrite a player)
    player_id = UUID.uuid4()

    case GameProcess.join_room(room_code, player_id, player_name) do
      :ok ->
        socket = assign(socket, :player_id, player_id)
        {:reply, {:ok, %{player_id: player_id}}, socket}

      {:error, reason} ->
        {:reply, {:error, reason}, socket}
    end
  end

  @impl true
  def handle_in("start_game", _params, socket) do
    room_code = socket.assigns.room_code

    case GameProcess.start_game(room_code) do
      :ok ->
        GameProcess.start_round(room_code)
        {:reply, :ok, socket}
      {:error, reason} ->
        {:reply, {:error, reason}, socket}
    end
  end

  @impl true
  def handle_in("start_round", _params, socket) do
    room_code = socket.assigns.room_code

    case GameProcess.start_round(room_code) do
      :ok -> {:reply, :ok, socket}
      {:error, reason} -> {:reply, {:error, reason}, socket}
    end
  end

  @impl true
  def handle_in("submit_answer", %{"answer" => answer}, socket) do
    room_code = socket.assigns.room_code
    player_id = socket.assigns[:player_id]

    if player_id do
      case GameProcess.submit_answer(room_code, player_id, answer) do
        :ok -> {:reply, :ok, socket}
        {:error, reason} -> {:reply, {:error, reason}, socket}
      end
    else
      {:reply, {:error, "Not joined to room"}, socket}
    end
  end

  @impl true
  def handle_in("vote_correct", %{"answer_id" => answer_id}, socket) do
    room_code = socket.assigns.room_code
    player_id = socket.assigns[:player_id]

    if player_id do
      case GameProcess.vote_correct(room_code, player_id, answer_id) do
        :ok -> {:reply, :ok, socket}
        {:error, reason} -> {:reply, {:error, reason}, socket}
      end
    else
      {:reply, {:error, "Not joined to room"}, socket}
    end
  end

  @impl true
  def handle_in("vote_funniest", %{"answer_id" => answer_id}, socket) do
    room_code = socket.assigns.room_code
    player_id = socket.assigns[:player_id]

    if player_id do
      case GameProcess.vote_funniest(room_code, player_id, answer_id) do
        :ok -> {:reply, :ok, socket}
        {:error, reason} -> {:reply, {:error, reason}, socket}
      end
    else
      {:reply, {:error, "Not joined to room"}, socket}
    end
  end
end
