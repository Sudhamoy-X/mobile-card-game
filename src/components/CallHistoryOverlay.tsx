import React from 'react';
import { Player, RoundHistoryEntry } from '../types/game';
import { BUMPER_CALL } from '../game/rules';

interface CallHistoryOverlayProps {
  history: RoundHistoryEntry[];
  seats: (Player | null)[];
  onClose: () => void;
}

export const CallHistoryOverlay: React.FC<CallHistoryOverlayProps> = ({
  history,
  seats,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl bg-[#12151d] border border-[#d4af37]/40 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3 mb-3">
          <h3 className="text-base font-bold font-serif gold-gradient-text">
            CALL & ROUND SCORE HISTORY
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#161924] border border-slate-700 hover:border-[#d4af37] text-slate-300 hover:text-white flex items-center justify-center text-sm cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No completed rounds yet. Call and score records will appear here after Round 1.
          </div>
        ) : (
          <div className="overflow-y-auto no-scrollbar space-y-3 pr-1">
            {history.map(entry => (
              <div
                key={entry.round}
                className="bg-[#090a0f] border border-[#d4af37]/20 rounded-xl p-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#f5cf68] border-b border-slate-800 pb-1.5 mb-2">
                  <span>Round {entry.round}</span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                  {seats.map((seat, idx) => {
                    if (!seat) return null;
                    const call = entry.calls[seat.id];
                    const won = entry.tricksWon[seat.id] ?? 0;
                    const delta = entry.roundScores[seat.id] ?? 0;
                    const total = entry.totalScores[seat.id] ?? 0;

                    return (
                      <div
                        key={seat.id}
                        className="bg-[#161924]/60 p-2 rounded-lg border border-slate-800 flex flex-col"
                      >
                        <span className="font-semibold text-slate-300 truncate mb-1">
                          {idx === 0 ? 'You' : seat.name}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Call: <span className="text-white font-bold">{call === BUMPER_CALL ? '8 (BMP)' : call}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Won: <span className="text-white font-bold">{won}</span>
                        </div>
                        <div className="mt-1 pt-1 border-t border-slate-800 text-[11px]">
                          <span
                            className={`font-mono font-bold ${
                              delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {delta >= 0 ? `+${delta}` : delta}
                          </span>
                          <span className="text-[9px] text-slate-500 block">Total: {total}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-800 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#161924] border border-[#d4af37]/40 text-[#f5cf68] hover:bg-[#d4af37] hover:text-black transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
