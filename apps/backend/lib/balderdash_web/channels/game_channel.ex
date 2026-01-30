defmodule BalderdashWeb.GameChannel do
  use BalderdashWeb, :channel
  require Logger

  alias Balderdash.GameProcess

  @impl true
  def join("game:lobby:" <> room_code, _payload, socket) do
    # Subscribe to PubSub topic for this game
    Phoenix.PubSub.subscribe(Balderdash.PubSub, "game:#{room_code}")

    # Load or create game process
    case Balderdash.GameRegistry.get_or_create(room_code) do
      {:ok, _pid} ->
        # Get current state and send it to the client
        state = GameProcess.get_state(room_code)
        {:ok, socket |> assign(:room_code, room_code)}

      {:error, reason} ->
        Logger.error("Failed to get or create game: #{inspect(reason)}")
        {:error, %{reason: "Failed to join game"}}
    end
  end

  @impl true
  def handle_info({:game_state_updated, state}, socket) do
    # Push update to connected clients
    push(socket, "state_update", state)
    {:noreply, socket}
  end

  @impl true
  def handle_in("join_room", %{"player_name" => player_name}, socket) do
    room_code = socket.assigns.room_code
    player_id = socket.assigns[:player_id] || UUID.uuid4()

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
        # Start first round
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
