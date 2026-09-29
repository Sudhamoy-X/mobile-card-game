import React from 'react';
import { DismissalInfo } from '../types/game';

interface DismissedModalProps {
  dismissalInfo: DismissalInfo | null | undefined;
  onRedeal: () => void;
  isHost: boolean;
}

export const DismissedModal: React.FC<DismissedModalProps> = ({
  dismissalInfo,
  onRedeal,
  isHost,
}) => {
  if (!dismissalInfo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#12151d] border border-[#d4af37] rounded-3xl p-6 shadow-[0_0_50px_rgba(212,175,55,0.3)] text-center">
        {/* Warning Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-amber-500/60 bg-[#161924] shadow-lg mb-3">
          <span className="text-2xl">⚠️</span>
        </div>

        {/* Title */}
        <div className="text-xs uppercase tracking-widest text-[#f5cf68] font-bold font-sans">
          ROUND DISMISSED
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-wide my-1">
          {dismissalInfo.reason === 'NO_SPADES'
            ? 'Spades Condition Not Satisfied'
            : 'Honor Cards Condition Not Satisfied'}
        </h2>

        {/* Dismissal Reason Box */}
        <div className="my-4 p-3.5 bg-[#090a0f] border border-amber-900/40 rounded-2xl text-left">
          <div className="text-xs text-amber-200 font-medium leading-relaxed">
            {dismissalInfo.message}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 border-t border-slate-800 pt-2">
            Per Call Break official rules, all players must hold at least one Spade and at least one honor card (J, Q, K, A). This deal is null and void.
          </div>
        </div>

        {/* Action Button */}
        {isHost ? (
          <button
            type="button"
            onClick={onRedeal}
            className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#f5cf68] hover:to-[#d4af37] text-[#090a0f] shadow-lg cursor-pointer transition-all transform active:scale-98"
          >
            Redeal Cards (New Shuffle)
          </button>
        ) : (
          <div className="text-xs text-slate-400 animate-pulse bg-[#161924] py-2.5 rounded-xl border border-slate-800">
            Waiting for host to redeal round...
          </div>
        )}
      </div>
    </div>
  );
};
