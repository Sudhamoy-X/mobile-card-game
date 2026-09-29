import React, { useState } from 'react';
import { Player } from '../types/game';
import { BUMPER_CALL } from '../game/rules';
import { playBumperCallFestiveSound, playCallConfirmSound } from '../utils/audio';

interface CallModalProps {
  myCall: number | null;
  seats: (Player | null)[];
  calls: Record<string, number | null>;
  onConfirmCall: (call: number) => void;
  onEditCall: () => void;
  onOpenHistory: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  myCall,
  seats,
  calls,
  onConfirmCall,
  onEditCall,
  onOpenHistory,
}) => {
  const [selectedCall, setSelectedCall] = useState<number>(myCall || 3);
  const normalCalls = [1, 2, 3, 4, 5, 6, 7];

  const handleSelectCall = (val: number) => {
    setSelectedCall(val);
    if (val === BUMPER_CALL) {
      playBumperCallFestiveSound();
    }
  };

  const handleConfirm = () => {
    if (selectedCall === BUMPER_CALL) {
      playBumperCallFestiveSound();
    } else {
      playCallConfirmSound();
    }
    onConfirmCall(selectedCall);
  };

  const isConfirmed = myCall !== null;

  return (
    /* Non-blocking overlay container: pointer-events-none so player's cards at the bottom remain 100% visible, touchable, and swipeable */
    <div className="fixed inset-x-0 top-11 bottom-32 sm:bottom-36 z-40 flex items-center justify-center pointer-events-none p-2 animate-in fade-in">
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#12151d]/95 backdrop-blur-md border border-[#d4af37]/80 rounded-2xl p-3.5 sm:p-4 shadow-[0_12px_45px_rgba(0,0,0,0.9)] text-center pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-2 mb-2">
          <button
            type="button"
            onClick={onOpenHistory}
            className="text-[10px] sm:text-[11px] font-semibold text-[#f5cf68] hover:text-white transition-colors flex items-center gap-1 cursor-pointer bg-[#161924] px-2 py-0.5 rounded-lg border border-[#d4af37]/30"
          >
            📋 History
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-bold font-serif gold-gradient-text tracking-wide">
              ROUND CALL PHASE
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Min Combined 9</span>
        </div>

        {/* Players Call Status Overview (Sequential Display) */}
        <div className="grid grid-cols-4 gap-1.5 mb-2.5 bg-[#090a0f]/90 p-2 rounded-xl border border-[#d4af37]/25">
          {seats.map((seat, idx) => {
            if (!seat) return null;
            const callVal = calls[seat.id];
            const isMe = idx === 0;

            return (
              <div key={seat.id} className="flex flex-col items-center">
                <span className="text-[9px] sm:text-[10px] text-slate-400 truncate max-w-[65px]">
                  {isMe ? 'You' : seat.name}
                </span>
                <div
                  className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border transition-all ${
                    callVal !== null && callVal !== undefined
                      ? 'border-[#d4af37] bg-[#161924] text-[#f5cf68]'
                      : 'border-slate-700 bg-slate-800/40 text-slate-500 animate-pulse'
                  }`}
                >
                  {callVal !== null && callVal !== undefined
                    ? callVal === BUMPER_CALL
                      ? '8 BMP'
                      : callVal
                    : '...'}
                </div>
              </div>
            );
          })}
        </div>

        {/* If call already locked/confirmed by user */}
        {isConfirmed ? (
          <div className="flex flex-col items-center py-2 bg-[#161924]/90 rounded-xl border border-[#d4af37]/40">
            <div className="text-[11px] text-slate-400">Locked Call:</div>
            <div className="text-xl sm:text-2xl font-bold font-serif text-[#f5cf68] my-0.5 flex items-center gap-2">
              {myCall === BUMPER_CALL ? '8 (BUMPER)' : `${myCall} Tricks`}
              {/* Emergency edit pencil icon while legally allowed */}
              <button
                type="button"
                onClick={onEditCall}
                title="Emergency Edit Call"
                className="text-slate-400 hover:text-[#f5cf68] transition-colors p-1 rounded-md hover:bg-black/30 cursor-pointer text-sm"
              >
                ✏️
              </button>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 animate-pulse mt-0.5">
              Inspecting hand · Other players calling in sequence...
            </div>
          </div>
        ) : (
          <>
            {/* Call Values 1 to 8 (1-7 normal, 8 Bumper) */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1 px-0.5">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Select Call (1–7 Normal, 8 Bumper)
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2">
                {normalCalls.map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSelectCall(num)}
                    className={`h-9 sm:h-10 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer border ${
                      selectedCall === num
                        ? 'border-[#d4af37] bg-gradient-to-b from-[#2a2310] to-[#161924] text-[#f5cf68] shadow-[0_0_10px_rgba(212,175,55,0.4)] scale-105 ring-1 ring-[#d4af37]'
                        : 'border-slate-700 bg-[#161924] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* 8 is the Bumper Call */}
              <button
                type="button"
                onClick={() => handleSelectCall(BUMPER_CALL)}
                className={`w-full py-1.5 px-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedCall === BUMPER_CALL
                    ? 'border-[#d4af37] bg-gradient-to-r from-[#2a2310] via-[#1c1910] to-[#2a2310] text-[#f5cf68] shadow-[0_0_12px_rgba(212,175,55,0.4)] ring-1 ring-[#d4af37]'
                    : 'border-amber-900/40 bg-[#161924]/60 text-amber-200 hover:border-[#d4af37]/40'
                }`}
              >
                <div className="text-left flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#2a2310] border border-[#d4af37] flex items-center justify-center font-bold text-sm text-[#f5cf68]">
                    8
                  </span>
                  <div>
                    <span className="font-bold text-[11px] sm:text-xs font-serif block">
                      👑 8 - BUMPER CALL
                    </span>
                    <span className="text-[9px] text-slate-400 block leading-tight">
                      Win ≥8 tricks = +160 pts, Fail = -80 pts
                    </span>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] ${
                    selectedCall === BUMPER_CALL
                      ? 'border-[#d4af37] bg-[#d4af37] text-black font-bold'
                      : 'border-slate-600'
                  }`}
                >
                  {selectedCall === BUMPER_CALL && '✓'}
                </div>
              </button>
            </div>

            {/* CALL button */}
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#f5cf68] hover:to-[#d4af37] text-[#090a0f] shadow-lg cursor-pointer transition-all transform active:scale-98"
            >
              CALL ({selectedCall === BUMPER_CALL ? '8 - BUMPER' : selectedCall})
            </button>
          </>
        )}
      </div>
    </div>
  );
};
