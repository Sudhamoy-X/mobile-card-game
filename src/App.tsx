/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, RoomState, UserProfile } from './types/game';
import { LocalGameManager } from './game/localGameManager';
import { getStoredUserProfile, saveUserProfile } from './utils/auth';
import { HomeScreen } from './components/HomeScreen';
import { GameScreen } from './components/GameScreen';
import { LobbyModal } from './components/LobbyModal';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'HOME' | 'LOCAL_GAME' | 'ONLINE_GAME'>('HOME');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile>(getStoredUserProfile());
  const [hasSavedGame, setHasSavedGame] = useState(false);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLobbyModal, setShowLobbyModal] = useState(false);
  const [lobbyInitialMode, setLobbyInitialMode] = useState<'local' | 'online'>('local');

  // Local Game State
  const localGameRef = useRef<LocalGameManager | null>(null);
  const [localGameState, setLocalGameState] = useState<RoomState | null>(null);

  // Online Multiplayer State
  const socketRef = useRef<Socket | null>(null);
  const [onlineRoomState, setOnlineRoomState] = useState<RoomState | null>(null);
  const [myOnlineSeatIndex, setMyOnlineSeatIndex] = useState<number>(0);

  // Initialize theme, saved game check, and landscape orientation
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    setHasSavedGame(LocalGameManager.hasSavedGame());

    // Theme toggle class
    if (isDarkMode) {
      document.documentElement.classList.remove('theme-light');
    } else {
      document.documentElement.classList.add('theme-light');
    }

    // Try locking orientation to landscape
    const lockLandscape = async () => {
      try {
        if (window.screen?.orientation && 'lock' in window.screen.orientation) {
          await (window.screen.orientation as any).lock('landscape');
        }
      } catch {
        // Ignored if user gesture required
      }
    };
    lockLandscape();

    // Trigger Android bridge fullscreen if inside Android APK WebView
    if (typeof window !== 'undefined' && window.AndroidInterface?.setFullscreen) {
      window.AndroidInterface.setFullscreen(true);
    }

    // Monitor portrait vs landscape
    const checkOrientation = () => {
      if (typeof window !== 'undefined') {
        const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 768;
        setIsPortrait(portrait);
      }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [isDarkMode]);

  // Connect to Socket.IO for online multiplayer
  useEffect(() => {
    const socket = io({
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Re-register player with socket
      socket.emit('player:register', {
        playerId: userProfile.id,
        name: userProfile.displayName,
        avatar: userProfile.avatar,
        roomCode: onlineRoomState?.roomId,
      });
    });

    socket.on('room:state', (updatedRoom: RoomState) => {
      setOnlineRoomState(updatedRoom);
      const mySeat = updatedRoom.seats.findIndex(s => s && s.id === userProfile.id);
      if (mySeat !== -1) {
        setMyOnlineSeatIndex(mySeat);
      }
      if (updatedRoom.phase !== 'IDLE') {
        setCurrentScreen('ONLINE_GAME');
        setShowLobbyModal(false);
      }
    });

    socket.on('room:updated', (summary: Partial<RoomState>) => {
      setOnlineRoomState(prev => (prev ? { ...prev, ...summary } : null));
    });

    return () => {
      socket.disconnect();
    };
  }, [userProfile.id, userProfile.displayName, userProfile.avatar]);

  // Handle local game initialization
  const startLocalGame = (target: 200 | 300 | 500) => {
    if (localGameRef.current) {
      localGameRef.current.cleanup();
    }

    const manager = new LocalGameManager(target, state => {
      setLocalGameState(state);
      setHasSavedGame(LocalGameManager.hasSavedGame());
    });

    manager.setHumanPlayerInfo(userProfile.displayName, userProfile.avatar);
    localGameRef.current = manager;
    setLocalGameState(manager.getState());
    setShowLobbyModal(false);
    setCurrentScreen('LOCAL_GAME');

    // 2-3s Opening animation when entering gameplay, followed by 4-5s shuffle & deal
    manager.enterGame();
  };

  const continueSavedGame = () => {
    if (!LocalGameManager.hasSavedGame()) return;

    if (localGameRef.current) {
      localGameRef.current.cleanup();
    }

    const manager = new LocalGameManager(300, state => {
      setLocalGameState(state);
      setHasSavedGame(LocalGameManager.hasSavedGame());
    });

    const loaded = manager.loadSavedGame();
    if (loaded) {
      localGameRef.current = manager;
      setLocalGameState(manager.getState());
      setCurrentScreen('LOCAL_GAME');
    }
  };

  // Online Room Handlers
  const createOnlineRoom = async (target: 200 | 300 | 500) => {
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: userProfile.id,
          hostName: userProfile.displayName,
          hostAvatar: userProfile.avatar,
          targetScore: target,
        }),
      });
      const data = await res.json();
      if (data.room) {
        setOnlineRoomState(data.room);
        setMyOnlineSeatIndex(0);
        socketRef.current?.emit('room:join_socket', {
          roomCode: data.room.roomId,
          playerId: userProfile.id,
          name: userProfile.displayName,
          avatar: userProfile.avatar,
        });
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  const joinOnlineRoom = async (code: string) => {
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          playerId: userProfile.id,
          name: userProfile.displayName,
          avatar: userProfile.avatar,
        }),
      });
      const data = await res.json();
      if (data.room) {
        setOnlineRoomState(data.room);
        const mySeat = data.room.seats.findIndex((s: { id: string } | null) => s && s.id === userProfile.id);
        setMyOnlineSeatIndex(mySeat !== -1 ? mySeat : 0);

        socketRef.current?.emit('room:join_socket', {
          roomCode: code,
          playerId: userProfile.id,
          name: userProfile.displayName,
          avatar: userProfile.avatar,
        });
      }
    } catch (err) {
      console.error('Failed to join room:', err);
    }
  };

  const addBotToOnlineRoom = () => {
    if (!onlineRoomState) return;
    socketRef.current?.emit('room:add_bot', {
      roomCode: onlineRoomState.roomId,
      requesterId: userProfile.id,
    });
  };

  const removeBotFromOnlineRoom = (seatIndex: number) => {
    if (!onlineRoomState) return;
    socketRef.current?.emit('room:remove_bot', {
      roomCode: onlineRoomState.roomId,
      requesterId: userProfile.id,
      seatIndex,
    });
  };

  const startOnlineGame = () => {
    if (!onlineRoomState) return;
    socketRef.current?.emit('room:start', {
      roomCode: onlineRoomState.roomId,
      requesterId: userProfile.id,
    });
  };

  // Card Play & Call Actions
  const handlePlayCard = (card: Card) => {
    if (currentScreen === 'LOCAL_GAME' && localGameRef.current) {
      localGameRef.current.playHumanCard(card);
    } else if (currentScreen === 'ONLINE_GAME' && onlineRoomState) {
      socketRef.current?.emit('game:play_card', {
        roomCode: onlineRoomState.roomId,
        playerId: userProfile.id,
        card,
      });
    }
  };

  const handleMakeCall = (callValue: number) => {
    if (currentScreen === 'LOCAL_GAME' && localGameRef.current) {
      localGameRef.current.makeHumanCall(callValue);
    } else if (currentScreen === 'ONLINE_GAME' && onlineRoomState) {
      socketRef.current?.emit('game:make_call', {
        roomCode: onlineRoomState.roomId,
        playerId: userProfile.id,
        callValue,
      });
    }
  };

  const handleEditCall = () => {
    if (currentScreen === 'LOCAL_GAME' && localGameRef.current) {
      localGameRef.current.editHumanCall();
    }
  };

  const handleNextRound = () => {
    if (currentScreen === 'LOCAL_GAME' && localGameRef.current) {
      localGameRef.current.nextRound();
    } else if (currentScreen === 'ONLINE_GAME' && onlineRoomState) {
      socketRef.current?.emit('game:next_round', {
        roomCode: onlineRoomState.roomId,
        requesterId: userProfile.id,
      });
    }
  };

  const handleRestartGame = () => {
    if (currentScreen === 'LOCAL_GAME' && localGameRef.current) {
      localGameRef.current.restartGame();
    } else if (currentScreen === 'ONLINE_GAME' && onlineRoomState) {
      socketRef.current?.emit('game:restart', {
        roomCode: onlineRoomState.roomId,
        requesterId: userProfile.id,
      });
    }
  };

  const handleExitGame = () => {
    if (localGameRef.current) {
      localGameRef.current.cleanup();
    }
    setCurrentScreen('HOME');
  };

  const handleRedealDismissed = () => {
    if (currentScreen === 'LOCAL_GAME' && localGameRef.current) {
      localGameRef.current.redealDismissedRound();
    } else if (currentScreen === 'ONLINE_GAME' && onlineRoomState) {
      socketRef.current?.emit('game:redeal_dismissed', {
        roomCode: onlineRoomState.roomId,
        requesterId: userProfile.id,
      });
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-[#090a0f] text-[#f5f5f0]">
      {currentScreen === 'HOME' && (
        <HomeScreen
          userProfile={userProfile}
          hasSavedGame={hasSavedGame}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          onOpenProfile={() => setShowAuthModal(true)}
          onSelectLocalPlay={() => {
            setLobbyInitialMode('local');
            setShowLobbyModal(true);
          }}
          onSelectWithFriends={() => {
            setLobbyInitialMode('online');
            setShowLobbyModal(true);
          }}
          onContinueGame={continueSavedGame}
        />
      )}

      {currentScreen === 'LOCAL_GAME' && localGameState && (
        <GameScreen
          roomState={localGameState}
          userProfile={userProfile}
          mySeatIndex={0}
          onPlayCard={handlePlayCard}
          onMakeCall={handleMakeCall}
          onEditCall={handleEditCall}
          onNextRound={handleNextRound}
          onRestartGame={handleRestartGame}
          onExitGame={handleExitGame}
          onRedealDismissed={handleRedealDismissed}
        />
      )}

      {currentScreen === 'ONLINE_GAME' && onlineRoomState && (
        <GameScreen
          roomState={onlineRoomState}
          userProfile={userProfile}
          mySeatIndex={myOnlineSeatIndex}
          onPlayCard={handlePlayCard}
          onMakeCall={handleMakeCall}
          onEditCall={handleEditCall}
          onNextRound={handleNextRound}
          onRestartGame={handleRestartGame}
          onExitGame={handleExitGame}
          onRedealDismissed={handleRedealDismissed}
        />
      )}

      {/* Lobby Modal (Local setup or Online Room) */}
      {showLobbyModal && (
        <LobbyModal
          initialMode={lobbyInitialMode}
          userProfile={userProfile}
          onlineRoomState={onlineRoomState}
          onStartLocalGame={startLocalGame}
          onCreateOnlineRoom={createOnlineRoom}
          onJoinOnlineRoom={joinOnlineRoom}
          onAddBotToRoom={addBotToOnlineRoom}
          onRemoveBotFromRoom={removeBotFromOnlineRoom}
          onStartOnlineGame={startOnlineGame}
          onClose={() => setShowLobbyModal(false)}
        />
      )}

      {/* Auth / Profile Modal */}
      {showAuthModal && (
        <AuthModal
          currentUser={userProfile}
          onUpdateUser={updated => {
            setUserProfile(updated);
            saveUserProfile(updated);
            if (localGameRef.current) {
              localGameRef.current.setHumanPlayerInfo(updated.displayName, updated.avatar);
            }
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Landscape Orientation Prompt on Mobile */}
      {isPortrait && (
        <div className="fixed inset-0 z-50 bg-[#090a0f]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl border-2 border-[#d4af37] bg-[#12151d] flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(212,175,55,0.4)] animate-pulse">
            <span className="text-3xl text-[#d4af37]">🔄</span>
          </div>
          <h2 className="text-xl font-bold font-serif text-[#f5cf68] tracking-wider mb-2">
            Rotate to Landscape
          </h2>
          <p className="text-xs text-slate-300 max-w-xs mb-5">
            Mobile Card Game 2.0 is designed exclusively for landscape gameplay. Please turn your phone sideways.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                (window.screen?.orientation as any)?.lock('landscape').catch(() => {});
              } catch {}
              setIsPortrait(false);
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#d4af37] to-[#aa771c] text-[#090a0f] hover:from-[#f5cf68] cursor-pointer shadow-lg"
          >
            Continue in Landscape
          </button>
        </div>
      )}
    </div>
  );
}
