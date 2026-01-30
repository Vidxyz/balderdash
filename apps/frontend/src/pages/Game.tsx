import { useEffect, useState, useMemo } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { Socket } from 'phoenix'
import { useGameStore } from '../store/gameStore'
import GameLobby from '../components/GameLobby'
import Scorecard from '../components/Scorecard'
import RoundActive from '../components/RoundActive'
import VotingPhase from '../components/VotingPhase'
import ResultsPhase from '../components/ResultsPhase'
import GameOver from '../components/GameOver'

const STORAGE_KEY_PREFIX = 'balderdash_'

function getStoredPlayer(roomCode: string): { playerId: string; playerName: string } | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${roomCode}`)
    if (!raw) return null
    const data = JSON.parse(raw) as { playerId?: string; playerName?: string }
    if (data?.playerId && data?.playerName) return { playerId: data.playerId, playerName: data.playerName }
    return null
  } catch {
    return null
  }
}

function setStoredPlayer(roomCode: string, playerId: string, playerName: string) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${roomCode}`, JSON.stringify({ playerId, playerName }))
  } catch {
    // ignore
  }
}

export default function Game() {
  const { code } = useParams<{ code: string }>()
  const location = useLocation()
  const [connected, setConnected] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const {
    gameState,
    channel,
    playerId,
    pointsGained,
    clearPointsGained,
    setGameState,
    setSocket,
    setChannel,
    setPlayerId,
    reset,
  } = useGameStore()

  // Clear points-gained notice after a few seconds
  useEffect(() => {
    if (pointsGained == null || pointsGained <= 0) return
    const t = setTimeout(() => clearPointsGained(), 3500)
    return () => clearTimeout(t)
  }, [pointsGained, clearPointsGained])

  // All state from backend: isHost and player name come from gameState.players
  const isHost = useMemo(() => {
    if (!gameState?.players || !playerId) return false
    const me = gameState.players.find((p) => p.id === playerId)
    return me?.role === 'host'
  }, [gameState?.players, playerId])

  // First round: first roundmaster (players[0]) starts. Between rounds: next roundmaster starts.
  const isFirstRoundmaster = useMemo(() => {
    if (!gameState?.players?.length || !playerId) return false
    return gameState.players[0].id === playerId
  }, [gameState?.players, playerId])

  const nextRoundmasterId = useMemo(() => {
    const players = gameState?.players
    if (!players?.length) return null
    const currentRound = gameState?.current_round
    const currentIndex = currentRound
      ? players.findIndex((p) => p.id === currentRound.roundmaster_id)
      : -1
    const nextIndex = (currentIndex + 1) % players.length
    return players[nextIndex]?.id ?? null
  }, [gameState?.players, gameState?.current_round])

  const isNextRoundmaster = useMemo(() => {
    return playerId != null && nextRoundmasterId === playerId
  }, [playerId, nextRoundmasterId])

  const isSpectator = connected && !!gameState && playerId == null && gameState.game_state !== 'lobby'
  const showJoinForm = connected && !!gameState && gameState.game_state === 'lobby' && playerId == null

  // Poll for fresh state when in lobby or between rounds so P1 sees P2/P3 join even if a push was missed
  useEffect(() => {
    if (!channel || !code) return
    const isLobby = gameState?.game_state === 'lobby'
    const isBetweenRounds = gameState?.game_state === 'playing' && gameState?.current_round != null
    if (!isLobby && !isBetweenRounds) return
    const interval = setInterval(() => {
      channel.push('get_state').receive('ok', (state: unknown) => {
        useGameStore.getState().setGameState(state as Parameters<typeof setGameState>[0])
      })
    }, 1500)
    return () => clearInterval(interval)
  }, [channel, code, gameState?.game_state, gameState?.current_round])

  useEffect(() => {
    if (!code) return

    const stored = getStoredPlayer(code)
    const nameFromState = (location.state as { playerName?: string } | null)?.playerName?.trim() || ''

    const socketUrl =
      import.meta.env.VITE_WS_URL ||
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/socket`
    const newSocket = new Socket(socketUrl, {
      params: {},
      timeout: 30000,
      heartbeatIntervalMs: 15000,
      reconnectAfterMs: (tries: number) => Math.min(1000 * Math.pow(2, tries), 10000),
    })

    newSocket.connect()
    setSocket(newSocket)

    const channelParams = stored?.playerId ? { player_id: stored.playerId } : {}
    const newChannel = newSocket.channel(`game:lobby:${code}`, channelParams)

    newChannel
      .join()
      .receive('ok', (resp?: unknown) => {
        setConnected(true)
        setChannel(newChannel)
        const payload = resp as { state?: Parameters<typeof setGameState>[0] } | undefined
        if (payload?.state) useGameStore.getState().setGameState(payload.state)

        if (stored?.playerId) {
          setPlayerId(stored.playerId)
          return
        }

        // No stored player but we have a name from Host/Join page: auto-join so host can start the game
        const state = payload?.state
        if (state?.game_state === 'lobby' && nameFromState) {
          setJoining(true)
          newChannel
            .push('join_room', { player_name: nameFromState })
            .receive('ok', (joinResp?: unknown) => {
              const r = joinResp as { player_id?: string } | undefined
              if (r?.player_id) {
                setPlayerId(r.player_id)
                setStoredPlayer(code, r.player_id, nameFromState)
              }
              setJoining(false)
            })
            .receive('error', () => {
              setJoining(false)
              // e.g. game already started; stay as spectator
            })
          return
        }

        // No stored player and no name from Host/Join: show join form (lobby) or stay spectator (game started/ended)
      })
      .receive('error', (resp: unknown) => {
        console.error('Unable to join', resp)
      })

    newChannel.on('state_update', (payload: unknown) => {
      useGameStore.getState().setGameState(payload as Parameters<typeof setGameState>[0])
    })

    return () => {
      newChannel.leave()
      newSocket.disconnect()
      reset()
    }
  }, [code])

  const handleJoinGame = (playerName: string) => {
    if (!channel || !code || !playerName.trim()) return
    setJoinError(null)
    setJoining(true)
    channel
      .push('join_room', { player_name: playerName.trim() })
      .receive('ok', (joinResp?: unknown) => {
        const r = joinResp as { player_id?: string } | undefined
        if (r?.player_id) {
          setPlayerId(r.player_id)
          setStoredPlayer(code, r.player_id, playerName.trim())
        }
        setJoining(false)
      })
      .receive('error', (resp: unknown) => {
        const reason =
          typeof resp === 'string'
            ? resp
            : typeof resp === 'object' && resp != null && 'reason' in resp
              ? String((resp as { reason?: string }).reason)
              : 'Failed to join'
        setJoinError(reason)
        setJoining(false)
      })
  }

  const handleStartGame = () => {
    if (channel) {
      channel.push('start_game')
        .receive('ok', () => {
          console.log('Game started')
        })
        .receive('error', (resp: unknown) => {
          console.error('Failed to start game', resp)
        })
    }
  }

  const handleStartRound = () => {
    if (channel) {
      channel.push('start_round')
        .receive('ok', () => {
          console.log('Round started')
        })
        .receive('error', (resp: unknown) => {
          console.error('Failed to start round', resp)
        })
    }
  }

  const handleSubmitAnswer = (answer: string) => {
    if (channel && playerId) {
      channel.push('submit_answer', { answer })
        .receive('ok', () => {
          console.log('Answer submitted')
        })
        .receive('error', (resp: unknown) => {
          console.error('Failed to submit answer', resp)
        })
    }
  }

  const handleVoteCorrect = (answerId: string) => {
    if (channel && playerId) {
      channel.push('vote_correct', { answer_id: answerId })
        .receive('ok', () => {
          console.log('Voted for correct answer')
        })
        .receive('error', (resp: unknown) => {
          console.error('Failed to vote', resp)
        })
    }
  }

  const handleVoteFunniest = (answerId: string) => {
    if (channel && playerId) {
      channel.push('vote_funniest', { answer_id: answerId })
        .receive('ok', () => {
          console.log('Voted for funniest answer')
        })
        .receive('error', (resp: unknown) => {
          console.error('Failed to vote', resp)
        })
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Connecting...</div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading game state...</div>
      </div>
    )
  }

  // Game over
  if (gameState.game_state === 'game_over') {
    return <GameOver />
  }

  // Lobby
  if (gameState.game_state === 'lobby') {
    const nameFromState = (location.state as { playerName?: string } | null)?.playerName ?? ''
    return (
      <GameLobby
        roomCode={code!}
        isHost={isHost}
        onStartGame={handleStartGame}
        showJoinForm={showJoinForm}
        onJoin={handleJoinGame}
        joining={joining}
        joinError={joinError}
        initialJoinName={nameFromState}
      />
    )
  }

  // Playing - show scorecard and current phase (or spectator view)
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 p-4 relative">
      {isSpectator && (
        <div className="bg-amber-500/90 text-white text-center py-2 px-4 rounded-b-lg shadow-lg max-w-4xl mx-auto mb-2">
          <span className="font-semibold">You're watching as a spectator.</span> You can see the game but cannot participate.
        </div>
      )}
      {/* Points gained toast with reason */}
      {pointsGained != null && pointsGained > 0 && (
        <div
          className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-points-pop pointer-events-none"
          role="alert"
          aria-live="polite"
        >
          <div className="bg-teal-500 text-white px-8 py-4 rounded-2xl shadow-2xl border-4 border-teal-300 text-center max-w-md">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-4xl">🎉</span>
              <span className="text-2xl font-bold">+{pointsGained} point{pointsGained !== 1 ? 's' : ''}!</span>
              <span className="text-4xl">🎉</span>
            </div>
            {playerId && gameState?.last_round_score_reasons?.[playerId]?.length ? (
              <div className="text-sm font-medium text-teal-100 border-t border-teal-400/50 pt-2 space-y-1">
                {gameState.last_round_score_reasons[playerId].map((reason, i) => (
                  <div key={i}>{reason}</div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        <Scorecard />

        {gameState.game_state === 'playing' && !gameState.current_round && (
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 animate-card-enter">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Started!</h2>
            {isFirstRoundmaster && (
              <button
                onClick={handleStartRound}
                className="w-full py-3 px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                Start First Round
              </button>
            )}
            {!isFirstRoundmaster && (
              <p className="text-gray-600">Waiting for the first roundmaster to start the round...</p>
            )}
          </div>
        )}

        {gameState.game_state === 'playing' && gameState.current_round && (
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 animate-card-enter">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Round complete</h2>
            {isNextRoundmaster && (
              <button
                onClick={handleStartRound}
                className="w-full py-3 px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                Start Next Round
              </button>
            )}
            {!isNextRoundmaster && (
              <p className="text-gray-600">Waiting for the next roundmaster to start the round...</p>
            )}
          </div>
        )}

        {gameState.game_state === 'round_active' && (
          <RoundActive onSubmitAnswer={handleSubmitAnswer} isSpectator={isSpectator} />
        )}

        {gameState.game_state === 'voting' && (
          <VotingPhase
            onVoteCorrect={handleVoteCorrect}
            onVoteFunniest={handleVoteFunniest}
            isSpectator={isSpectator}
          />
        )}

        {gameState.game_state === 'results' && (
          <div>
            <ResultsPhase />
            {isNextRoundmaster && (
              <button
                onClick={handleStartRound}
                className="mt-4 w-full py-3 px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                Start Next Round
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
