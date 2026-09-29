import React from 'react';
import { Player } from '../types/game';

interface PlayerPanelProps {
  player: Player | null;
  seatPosition: 'bottom' | 'left' | 'top' | 'right';
  isCurrentTurn: boolean;
  call: number | null;
  tricksWon: number;
  score: number;
  cardCount: number;
  reconnectTime?: number;
  isDealer?: boolean;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  seatPosition,
  isCurrentTurn,
  call,
  tricksWon,
  score,
  cardCount,
  reconnectTime,
  isDealer = false,
}) => {
  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center p-2 rounded-lg border border-dashed border-[#d4af37]/20 bg-[#12151d]/40 min-w-[110px] text-center">
        <span className="text-xs text-slate-500">Empty Seat</span>
      </div>
    );
  }

  const isBottom = seatPosition === 'bottom';

  return (
    <div
      className={`relative flex ${
        isBottom ? 'flex-row items-center gap-3' : 'flex-col items-center'
      } p-2 rounded-xl transition-all duration-200 border ${
        isCurrentTurn
          ? 'border-[#d4af37] bg-[#161924] shadow-[0_0_15px_rgba(212,175,55,0.25)] ring-1 ring-[#d4af37]/50'
          : 'border-[#d4af37]/25 bg-[#12151d]/90'
      } backdrop-blur-sm min-w-[120px] max-w-[210px]`}
    >
      {/* Dealer indicator token */}
      {isDealer && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-[#d4af37] to-[#aa771c] text-[#090a0f] text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md border border-[#f5cf68]">
          DEALER
        </div>
      )}

      {/* Disconnect / Reconnect countdown warning */}
      {!player.isConnected && reconnectTime !== undefined && reconnectTime > 0 && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-md whitespace-nowrap">
          Reconnecting: {reconnectTime}s
        </div>
      )}

      {/* Avatar & Turn Glow */}
      <div className="relative">
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm border ${
            isCurrentTurn
              ? 'border-[#d4af37] ring-2 ring-[#d4af37]/60 bg-gradient-to-br from-[#2a2310] to-[#12151d] text-[#f5cf68]'
              : 'border-[#d4af37]/30 bg-[#161924] text-slate-200'
          }`}
        >
          {player.avatar === 'user' ? '👑' : player.isBot ? '🤖' : '👤'}
        </div>

        {/* Turn indicator ring dot */}
        {isCurrentTurn && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#d4af37] rounded-full border border-[#090a0f] animate-ping" />
        )}
      </div>

      {/* Player Info Details */}
      <div className={`flex flex-col ${isBottom ? 'text-left' : 'text-center'} mt-1 sm:mt-0`}>
        {/* Name & Bot/Human tag */}
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-xs sm:text-sm font-semibold tracking-wide text-[#f5f5f0] truncate max-w-[90px]">
            {player.name}
          </span>
          <span
            className={`text-[9px] px-1 py-0.2 rounded font-mono ${
              player.isBot
                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                : 'bg-[#d4af37]/15 text-[#f5cf68] border border-[#d4af37]/30'
            }`}
          >
            {player.isBot ? 'BOT' : 'HUMAN'}
          </span>
        </div>

        {/* Stats: Call, Tricks Won, Score, Cards remaining */}
        <div className="flex items-center justify-center gap-2 mt-0.5 text-[10px] sm:text-[11px] text-slate-300">
          <div>
            <span className="text-slate-400">Call:</span>{' '}
            <span className="font-bold text-[#f5cf68]">
              {call === null ? '—' : call === 8 ? '8 (BMP)' : call}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Tricks:</span>{' '}
            <span className="font-bold text-white">{tricksWon}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px] sm:text-[11px] text-slate-400">
          <div>
            <span>Score:</span>{' '}
            <span
              className={`font-mono font-bold ${
                score >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {score}
            </span>
          </div>
          <div>
            <span>Cards:</span>{' '}
            <span className="font-mono text-slate-300">{cardCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
