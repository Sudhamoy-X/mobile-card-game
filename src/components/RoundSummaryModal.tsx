import React from 'react';
import { Player, RoundHistoryEntry } from '../types/game';
import { BUMPER_CALL } from '../game/rules';

interface RoundSummaryModalProps {
  roundNumber: number;
  targetScore: number;
  seats: (Player | null)[];
  latestHistory?: RoundHistoryEntry;
  onNextRound: () => void;
  isHost: boolean;
}

export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  roundNumber,
  targetScore,
  seats,
  latestHistory,
  onNextRound,
  isHost,
}) => {
  if (!latestHistory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#12151d] border border-[#d4af37]/60 rounded-2xl p-6 shadow-2xl text-center">
        {/* Header */}
        <div className="inline-block px-3 py-1 rounded-full border border-[#d4af37]/40 bg-[#161924] text-[#f5cf68] text-xs font-semibold uppercase tracking-wider mb-2">
          Round {roundNumber} Complete
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-serif gold-gradient-text tracking-wide mb-1">
          ROUND SCOREBOARD
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Target to win: <span className="font-bold text-[#f5cf68]">{targetScore}</span> points
        </p>

        {/* Scoreboard table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#d4af37]/30 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="pb-2 pl-2">Player</th>
                <th className="pb-2 text-center">Call</th>
                <th className="pb-2 text-center">Won</th>
                <th className="pb-2 text-center">Round</th>
                <th className="pb-2 pr-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {seats.map((seat, idx) => {
                if (!seat) return null;
                const call = latestHistory.calls[seat.id];
                const won = latestHistory.tricksWon[seat.id] ?? 0;
                const roundDelta = latestHistory.roundScores[seat.id] ?? 0;
                const total = latestHistory.totalScores[seat.id] ?? 0;
                const isWinnerPace = total >= targetScore;

                return (
                  <tr
                    key={seat.id}
                    className={`hover:bg-[#161924]/50 transition-colors ${
                      idx === 0 ? 'bg-[#161924]/30' : ''
                    }`}
                  >
                    <td className="py-2.5 pl-2 font-medium text-slate-200 flex items-center gap-1.5">
                      <span className="truncate max-w-[100px]">
                        {idx === 0 ? 'You' : seat.name}
                      </span>
                      {isWinnerPace && (
                        <span className="text-[10px] text-amber-300 font-bold">★ TARGET</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center text-slate-300 font-mono">
                      {call === BUMPER_CALL ? '8 (BMP)' : call}
                    </td>
                    <td className="py-2.5 text-center text-slate-200 font-mono font-semibold">
                      {won}
                    </td>
                    <td className="py-2.5 text-center font-mono font-bold">
                      <span
                        className={
                          roundDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {roundDelta >= 0 ? `+${roundDelta}` : roundDelta}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-right font-mono font-bold text-white text-base">
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Host action / waiting notice */}
        {isHost ? (
          <button
            type="button"
            onClick={onNextRound}
            className="w-full py-3 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#f5cf68] hover:to-[#d4af37] text-[#090a0f] shadow-lg cursor-pointer transition-all transform active:scale-98"
          >
            Start Next Round →
          </button>
        ) : (
          <div className="py-3 text-xs text-slate-400 animate-pulse bg-[#161924] rounded-xl border border-slate-800">
            Waiting for Host to start the next round...
          </div>
        )}
      </div>
    </div>
  );
};
