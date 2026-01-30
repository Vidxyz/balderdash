defmodule Balderdash.GameRegistry do
  @moduledoc """
  Registry for managing game processes.
  """

  def child_spec(opts) do
    %{
      id: __MODULE__,
      start: {__MODULE__, :start_link, [opts]},
      type: :worker,
      restart: :permanent,
      shutdown: 500
    }
  end

  def start_link(opts \\ []) do
    Registry.start_link(keys: :unique, name: __MODULE__)
  end

  def get_or_create(room_code) do
    case get_game(room_code) do
      {:ok, pid} -> {:ok, pid}
      {:error, :not_found} -> create_game(room_code)
    end
  end

  def get_game(room_code) do
    case Registry.lookup(Balderdash.GameRegistry, room_code) do
      [{pid, _}] -> {:ok, pid}
      [] -> {:error, :not_found}
    end
  end

  defp create_game(room_code) do
    # GameProcess registers itself with the Registry via name: via_tuple(room_code)
    case Balderdash.GameProcess.start_link(room_code) do
      {:ok, pid} -> {:ok, pid}
      {:error, reason} -> {:error, reason}
    end
  end
end
