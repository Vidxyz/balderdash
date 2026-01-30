import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Socket } from 'phoenix'
import { useGameStore } from '../store/gameStore'
import GameLobby from '../components/GameLobby'
import Scorecard from '../components/Scorecard'
import RoundActive from '../components/RoundActive'
import VotingPhase from '../components/VotingPhase'
import ResultsPhase from '../components/ResultsPhase'
import GameOver from '../components/GameOver'

export default function Game() {
  const { code } = useParams<{ code: string }>()
  const [searchParams] = useSearchParams()
  const [connected, setConnected] = useState(false)
  const [joining, setJoining] = useState(false)

  const {
    gameState,
    channel,
    playerId,
    setGameState,
    setSocket,
    setChannel,
    setPlayerId,
    reset,
  } = useGameStore()

  const isHost = searchParams.get('host') === 'true'
  const playerName = searchParams.get('name') || 'Player'

  useEffect(() => {
    if (!code) return

    const socketUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/socket'
    const newSocket = new Socket(socketUrl, {
      params: {},
    })

    newSocket.connect()
    setSocket(newSocket)

    const newChannel = newSocket.channel(`game:lobby:${code}`, {})

    newChannel
      .join()
      .receive('ok', () => {
        setConnected(true)
        setChannel(newChannel)
        console.log('Joined game channel')

        // Auto-join room if not already joined
        if (!playerId && !joining) {
          setJoining(true)
          newChannel.push('join_room', { player_name: playerName })
            .receive('ok', (resp?: unknown) => {
              const r = resp as { player_id?: string } | undefined
              if (r?.player_id) setPlayerId(r.player_id)
              setJoining(false)
            })
            .receive('error', (resp: unknown) => {
              console.error('Failed to join room', resp)
              setJoining(false)
            })
        }
      })
      .receive('error', (resp: unknown) => {
        console.error('Unable to join', resp)
      })

    newChannel.on('state_update', (payload: unknown) => {
      setGameState(payload as Parameters<typeof setGameState>[0])
    })

    return () => {
      newChannel.leave()
      newSocket.disconnect()
      reset()
    }
  }, [code])

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
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Connecting...</div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading game state...</div>
      </div>
    )
  }

  // Game over
  if (gameState.game_state === 'game_over') {
    return <GameOver />
  }

  // Lobby
  if (gameState.game_state === 'lobby') {
    return (
      <GameLobby
        roomCode={code!}
        isHost={isHost}
        onStartGame={handleStartGame}
      />
    )
  }

  // Playing - show scorecard and current phase
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 p-4">
      <div className="max-w-4xl mx-auto">
        <Scorecard />

        {gameState.game_state === 'playing' && !gameState.current_round && (
          <div className="bg-white rounded-lg shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Started!</h2>
            {isHost && (
              <button
                onClick={handleStartRound}
                className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
              >
                Start First Round
              </button>
            )}
            {!isHost && (
              <p className="text-gray-600">Waiting for host to start the first round...</p>
            )}
          </div>
        )}

        {gameState.game_state === 'round_active' && (
          <RoundActive onSubmitAnswer={handleSubmitAnswer} />
        )}

        {gameState.game_state === 'voting' && (
          <VotingPhase
            onVoteCorrect={handleVoteCorrect}
            onVoteFunniest={handleVoteFunniest}
          />
        )}

        {gameState.game_state === 'results' && (
          <div>
            <ResultsPhase />
            {isHost && (
              <button
                onClick={handleStartRound}
                className="mt-4 w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
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
