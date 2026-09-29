import React, { useState } from 'react';
import { Player, RoomState, UserProfile } from '../types/game';

interface LobbyModalProps {
  initialMode: 'local' | 'online';
  userProfile: UserProfile;
  onlineRoomState: RoomState | null;
  onStartLocalGame: (target: 200 | 300 | 500) => void;
  onCreateOnlineRoom: (target: 200 | 300 | 500) => void;
  onJoinOnlineRoom: (code: string) => void;
  onAddBotToRoom: () => void;
  onRemoveBotFromRoom: (seatIndex: number) => void;
  onStartOnlineGame: () => void;
  onClose: () => void;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  initialMode,
  userProfile,
  onlineRoomState,
  onStartLocalGame,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onAddBotToRoom,
  onRemoveBotFromRoom,
  onStartOnlineGame,
  onClose,
}) => {
  const [mode, setMode] = useState<'local' | 'online_choice' | 'online_room' | 'online_join'>(
    initialMode === 'local' ? 'local' : onlineRoomState ? 'online_room' : 'online_choice'
  );

  const [targetScore, setTargetScore] = useState<200 | 300 | 500>(300);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // Local play setup
  const handleStartLocal = () => {
    onStartLocalGame(targetScore);
  };

  const handleCreateRoom = () => {
    onCreateOnlineRoom(targetScore);
    setMode('online_room');
  };

  const handleJoinRoom = () => {
    if (joinCode.length !== 4) {
      setJoinError('Room code must be 4 digits');
      return;
    }
    setJoinError('');
    onJoinOnlineRoom(joinCode);
    setMode('online_room');
  };

  const isHost = onlineRoomState?.hostId === userProfile.id;
  const allSeatsFilled = onlineRoomState?.seats.every(s => s !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#12151d] border border-[#d4af37]/60 rounded-3xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-serif gold-gradient-text tracking-wide">
              {mode === 'local'
                ? 'LOCAL PLAY SETUP'
                : mode === 'online_choice'
                ? 'WITH FRIENDS'
                : mode === 'online_join'
                ? 'JOIN ROOM'
                : 'ONLINE MULTIPLAYER ROOM'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#161924] border border-slate-700 hover:border-[#d4af37] text-slate-300 flex items-center justify-center text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Mode 1: Local Play Setup */}
        {mode === 'local' && (
          <div className="space-y-5">
            {/* Target Selector */}
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                Select Target Score
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([200, 300, 500] as const).map(target => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => setTargetScore(target)}
                    className={`py-2.5 rounded-xl font-bold font-mono text-sm border transition-all cursor-pointer ${
                      targetScore === target
                        ? 'border-[#d4af37] bg-gradient-to-b from-[#2a2310] to-[#161924] text-[#f5cf68] shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                        : 'border-slate-800 bg-[#161924] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {target} Pts
                  </button>
                ))}
              </div>
            </div>

            {/* Seats Preview: You + Bot 2 + Bot 3 + Bot 4 */}
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                Seated Players (1 Human + 3 Bots)
              </label>
              <div className="grid grid-cols-2 gap-2 bg-[#090a0f] p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-[#161924] border border-[#d4af37]/40">
                  <div className="w-8 h-8 rounded-full bg-[#2a2310] border border-[#d4af37] flex items-center justify-center text-sm">
                    👑
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">You</span>
                    <span className="text-[10px] text-[#f5cf68]">Human Host</span>
                  </div>
                </div>

                {[2, 3, 4].map(botNum => (
                  <div
                    key={botNum}
                    className="flex items-center gap-2 p-2 rounded-xl bg-[#161924]/70 border border-slate-800"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm">
                      🤖
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-300 block">
                        Bot {botNum}
                      </span>
                      <span className="text-[10px] text-slate-500">Autonomous</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartLocal}
              className="w-full py-3 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#f5cf68] hover:to-[#d4af37] text-[#090a0f] shadow-lg cursor-pointer transition-all transform active:scale-98"
            >
              Start Game
            </button>
          </div>
        )}

        {/* Mode 2: Online Choice (Create vs Join) */}
        {mode === 'online_choice' && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-300 text-center mb-4">
              Play real-time multiplayer with up to 4 friends or add smart bots to empty seats.
            </p>

            <button
              type="button"
              onClick={handleCreateRoom}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#161924] to-[#1e2230] border border-[#d4af37]/50 hover:border-[#d4af37] text-left transition-all cursor-pointer flex items-center justify-between group shadow-md"
            >
              <div>
                <span className="font-bold text-base text-[#f5cf68] block">Create Room</span>
                <span className="text-xs text-slate-400">
                  Host a new 4-player room with 4-digit code and bot controls
                </span>
              </div>
              <span className="text-xl text-[#d4af37] group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode('online_join')}
              className="w-full py-4 px-5 rounded-2xl bg-[#161924] border border-slate-700 hover:border-slate-500 text-left transition-all cursor-pointer flex items-center justify-between group shadow-md"
            >
              <div>
                <span className="font-bold text-base text-white block">Join Room</span>
                <span className="text-xs text-slate-400">
                  Enter 4-digit code shared by your friend to take a seat
                </span>
              </div>
              <span className="text-xl text-slate-400 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>
          </div>
        )}

        {/* Mode 3: Online Join Code Entry */}
        {mode === 'online_join' && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-300 text-center">
              Enter the 4-digit code provided by the room host:
            </p>

            <div className="max-w-[200px] mx-auto">
              <input
                type="text"
                maxLength={4}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.replace(/\D/g, ''))}
                placeholder="4829"
                className="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold py-3 bg-[#090a0f] border border-[#d4af37] rounded-2xl text-[#f5cf68] outline-none"
              />
            </div>

            {joinError && (
              <div className="text-xs text-rose-400 text-center">{joinError}</div>
            )}

            <button
              type="button"
              onClick={handleJoinRoom}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#d4af37] to-[#aa771c] text-[#090a0f] shadow-lg cursor-pointer"
            >
              Join Seat
            </button>

            <button
              type="button"
              onClick={() => setMode('online_choice')}
              className="text-xs text-slate-400 hover:text-white block mx-auto mt-2"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Mode 4: Online Room View (Room Code + 4 Seats + Add Bot + Start) */}
        {mode === 'online_room' && onlineRoomState && (
          <div className="space-y-4">
            {/* 4-Digit Room Code Banner */}
            <div className="bg-[#090a0f] border border-[#d4af37]/40 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block">
                Room Code (Share with friends)
              </span>
              <span className="font-mono text-3xl font-extrabold tracking-widest text-[#f5cf68] block my-0.5">
                {onlineRoomState.roomId}
              </span>
              <span className="text-[10px] text-slate-400">
                Target: {onlineRoomState.targetScore} points
              </span>
            </div>

            {/* 4 Seats Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {onlineRoomState.seats.map((seat, idx) => {
                if (seat) {
                  return (
                    <div
                      key={seat.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#161924] border border-[#d4af37]/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#090a0f] border border-[#d4af37]/40 flex items-center justify-center text-sm">
                          {seat.isBot ? '🤖' : '👤'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white truncate max-w-[85px]">
                            {seat.name}
                          </div>
                          <span className="text-[9px] text-[#f5cf68]">
                            Seat {idx + 1} · {seat.isBot ? 'Bot' : 'Human'}
                          </span>
                        </div>
                      </div>

                      {/* Remove bot button if host and is bot */}
                      {isHost && seat.isBot && (
                        <button
                          type="button"
                          onClick={() => onRemoveBotFromRoom(idx)}
                          className="text-[10px] text-rose-400 hover:text-rose-300 p-1"
                          title="Remove Bot"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                }

                // Empty seat: Show Add Bot if Host
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-700 bg-[#090a0f]/40 min-h-[58px]"
                  >
                    <span className="text-[10px] text-slate-500 mb-1">
                      Seat {idx + 1} Empty
                    </span>
                    {isHost ? (
                      <button
                        type="button"
                        onClick={onAddBotToRoom}
                        className="text-[11px] font-semibold text-[#f5cf68] hover:text-white px-2 py-0.5 rounded bg-[#161924] border border-[#d4af37]/30 cursor-pointer"
                      >
                        + Add Bot
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-600 animate-pulse">
                        Waiting for player...
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Host Controls */}
            {isHost ? (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!allSeatsFilled}
                  onClick={onStartOnlineGame}
                  className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all ${
                    allSeatsFilled
                      ? 'bg-gradient-to-r from-[#d4af37] to-[#aa771c] text-[#090a0f] shadow-lg cursor-pointer hover:from-[#f5cf68]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  {allSeatsFilled
                    ? 'Start Multiplayer Game'
                    : 'Fill All 4 Seats to Start'}
                </button>
                {!allSeatsFilled && (
                  <span className="text-[10px] text-slate-400 text-center block mt-1">
                    Valid configs: 4 humans, 3+1 bot, 2+2 bots, 1+3 bots. Use "+ Add Bot" to fill empty seats!
                  </span>
                )}
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-slate-400 bg-[#090a0f] rounded-xl border border-slate-800">
                Waiting for the host ({onlineRoomState.seats[0]?.name || 'Host'}) to start the game...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
