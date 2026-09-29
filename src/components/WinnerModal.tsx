import React from 'react';
import { Player } from '../types/game';

interface WinnerModalProps {
  winner: Player | null;
  finalScore: number;
  allSeats: (Player | null)[];
  scores: Record<string, number>;
  onRestart: () => void;
  onHome: () => void;
  onExit: () => void;
  isHost: boolean;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  finalScore,
  allSeats,
  scores,
  onRestart,
  onHome,
  onExit,
  isHost,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#12151d] border border-[#d4af37] rounded-3xl p-6 shadow-[0_0_60px_rgba(212,175,55,0.35)] text-center overflow-hidden">
        {/* Subtle Gold Shimmer Inlay */}
        <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 w-48 h-48 bg-[#d4af37]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Crown Icon with subtle pulse */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-[#d4af37] bg-gradient-to-br from-[#2a2310] to-[#12151d] shadow-[0_0_25px_rgba(212,175,55,0.4)] mb-3 animate-pulse">
          <span className="text-3xl">👑</span>
        </div>

        {/* Winner Tag */}
        <div className="text-xs uppercase tracking-widest text-[#f5cf68] font-bold font-sans">
          TOURNAMENT CHAMPION
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-serif gold-gradient-text tracking-wide my-1">
          WINNER
        </h1>

        {/* Player name & score */}
        <div className="my-3 py-2 bg-[#161924] border border-[#d4af37]/30 rounded-2xl">
          <div className="text-lg sm:text-xl font-bold text-white">
            {winner?.name || 'Player'}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Final Score:{' '}
            <span className="font-mono text-base font-bold text-[#f5cf68]">
              {finalScore} pts
            </span>
          </div>
        </div>

        {/* Final Standings mini-list */}
        <div className="space-y-1.5 my-4 text-left bg-[#090a0f] p-3 rounded-xl border border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Final Standings
          </div>
          {allSeats
            .filter(Boolean)
            .sort((a, b) => (scores[b!.id] || 0) - (scores[a!.id] || 0))
            .map((player, rank) => (
              <div
                key={player!.id}
                className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0"
              >
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-[#f5cf68] font-mono font-bold w-4">
                    {rank === 0 ? '1st' : `${rank + 1}.`}
                  </span>
                  <span className="truncate max-w-[120px]">{player!.name}</span>
                </span>
                <span className="font-mono font-bold text-white">
                  {scores[player!.id] || 0} pts
                </span>
              </div>
            ))}
        </div>

        {/* Action Buttons: RESTART, HOME, EXIT */}
        <div className="flex flex-col gap-2 pt-2">
          {isHost && (
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#f5cf68] hover:to-[#d4af37] text-[#090a0f] shadow-lg cursor-pointer transition-all transform active:scale-98"
            >
              Restart Game
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onHome}
              className="py-2.5 rounded-xl font-semibold text-xs text-slate-200 bg-[#161924] border border-slate-700 hover:border-[#d4af37] hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={onExit}
              className="py-2.5 rounded-xl font-semibold text-xs text-rose-300 bg-[#161924] border border-rose-900/40 hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
