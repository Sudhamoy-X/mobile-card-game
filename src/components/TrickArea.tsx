import React from 'react';
import { GamePhase, PlayedCard } from '../types/game';
import { CardView } from './CardView';

interface TrickAreaProps {
  currentTrick: PlayedCard[];
  phase: GamePhase;
  lastWinnerSeat?: number | null;
  playerNames: (string | undefined)[];
  redealingNotice?: string | null;
  dealingIndex?: number;
  dealingSeat?: number;
}

export const TrickArea: React.FC<TrickAreaProps> = ({
  currentTrick,
  phase,
  lastWinnerSeat,
  playerNames,
  redealingNotice,
  dealingIndex = 0,
  dealingSeat = 0,
}) => {
  // Mapping seat index to visual position on table
  // 0: Bottom, 1: Left, 2: Top, 3: Right
  const getCardForSeat = (seat: number) => {
    return currentTrick.find(p => p.seatIndex === seat)?.card;
  };

  const bottomCard = getCardForSeat(0);
  const leftCard = getCardForSeat(1);
  const topCard = getCardForSeat(2);
  const rightCard = getCardForSeat(3);

  // Directional translation for flying card during dealing animation:
  // 0 -> Bottom (translateY +140px)
  // 1 -> Left (translateX -140px)
  // 2 -> Top (translateY -140px)
  // 3 -> Right (translateX +140px)
  const getDealTransform = (seat: number) => {
    switch (seat) {
      case 0:
        return 'translate(0px, 120px) scale(0.85)';
      case 1:
        return 'translate(-120px, 0px) scale(0.85)';
      case 2:
        return 'translate(0px, -120px) scale(0.85)';
      case 3:
        return 'translate(120px, 0px) scale(0.85)';
      default:
        return 'translate(0px, 0px)';
    }
  };

  return (
    <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#0d1017]/85 backdrop-blur-md shadow-2xl p-4">
      {/* Central luxury table felt insignia */}
      <div className="absolute inset-4 rounded-full border border-dashed border-[#d4af37]/15 pointer-events-none flex items-center justify-center">
        <span className="text-[#d4af37]/10 text-6xl font-serif select-none">♠</span>
      </div>

      {/* Opening 2-3s Table Reveal Animation */}
      {phase === 'ENTERING' && (
        <div className="z-20 flex flex-col items-center justify-center text-center animate-in zoom-in-75 duration-700">
          <div className="w-16 h-16 rounded-2xl border-2 border-[#d4af37] bg-gradient-to-br from-[#2a2310] to-[#12151d] shadow-[0_0_30px_rgba(212,175,55,0.5)] flex items-center justify-center animate-pulse">
            <span className="text-3xl text-[#d4af37]">♠</span>
          </div>
          <span className="text-xs uppercase tracking-widest text-[#f5cf68] font-bold font-serif mt-3">
            Entering Table...
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">Classic 4-Player Spades</span>
        </div>
      )}

      {/* Realistic 4-5s Shuffle Animation */}
      {phase === 'SHUFFLING' && (
        <div className="z-20 flex flex-col items-center justify-center text-center animate-fade-in">
          {/* Visual Riffle Shuffling Deck Animation */}
          <div className="relative w-28 h-20 flex items-center justify-center">
            {/* Left deck split */}
            <div className="absolute left-1 w-12 h-16 rounded-md border border-[#d4af37]/60 bg-gradient-to-br from-[#161924] to-[#090a0f] shadow-lg transform -rotate-12 animate-pulse" />
            {/* Right deck split */}
            <div className="absolute right-1 w-12 h-16 rounded-md border border-[#d4af37]/60 bg-gradient-to-br from-[#161924] to-[#090a0f] shadow-lg transform rotate-12 animate-pulse" />
            {/* Center interleaving flutter */}
            <div className="z-10 w-10 h-14 rounded-md border border-[#f5cf68] bg-[#2a2310] flex items-center justify-center text-xs text-[#f5cf68] font-serif shadow-[0_0_15px_rgba(212,175,55,0.4)]">
              ♠
            </div>
          </div>
          <span className="text-xs uppercase tracking-widest text-[#f5cf68] mt-3 font-bold font-sans">
            Shuffling 52 Cards...
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">Randomizing standard deck</span>
        </div>
      )}

      {/* 0.5-1s Pause after Shuffle */}
      {phase === 'POST_SHUFFLE_PAUSE' && (
        <div className="z-20 flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="w-14 h-20 rounded-lg border-2 border-[#d4af37] bg-gradient-to-br from-[#161924] to-[#090a0f] shadow-xl flex items-center justify-center">
            <span className="text-xl text-[#d4af37]">♠</span>
          </div>
          <span className="text-xs uppercase tracking-widest text-[#f5cf68] mt-2 font-semibold">
            Cut & Ready
          </span>
        </div>
      )}

      {/* Sequential 52-Card Dealing Animation (P1 -> P2 -> P3 -> P4) */}
      {phase === 'DEALING' && (
        <div className="z-20 relative flex flex-col items-center justify-center text-center">
          {/* Center Deck Stack */}
          <div className="relative w-14 h-20 rounded-lg border border-[#d4af37] bg-[#161924] shadow-xl flex items-center justify-center">
            <span className="text-xs text-[#d4af37]/70 font-mono">♠</span>
            <div className="absolute -bottom-1 -right-1 w-full h-full rounded-lg border border-[#d4af37]/30 bg-[#090a0f] -z-10" />

            {/* Flying Card traveling to dealingSeat */}
            <div
              key={dealingIndex}
              className="absolute inset-0 rounded-lg border border-[#f5cf68] bg-[#fafaf7] shadow-[0_0_15px_rgba(212,175,55,0.6)] flex items-center justify-center text-black text-xs font-bold transition-all duration-300 ease-out"
              style={{
                transform: getDealTransform(dealingSeat),
                opacity: 0.95,
              }}
            >
              ♠
            </div>
          </div>

          {/* Deal Progress Indicator */}
          <div className="mt-3">
            <span className="text-xs font-bold text-[#f5cf68] uppercase tracking-wider block">
              Dealing Card {dealingIndex + 1} / 52
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              → {['P1 (You)', 'P2 (Left)', 'P3 (Top)', 'P4 (Right)'][dealingSeat]}
            </span>
          </div>
        </div>
      )}

      {/* Short Hand Settling Animation */}
      {phase === 'HAND_SETTLING' && (
        <div className="z-20 flex flex-col items-center justify-center text-center animate-fade-in px-4">
          <div className="w-12 h-12 rounded-full border border-[#d4af37] bg-[#161924] flex items-center justify-center text-xl shadow-lg mb-2 ring-2 ring-[#d4af37]/40 animate-pulse">
            🎴
          </div>
          <span className="text-xs uppercase tracking-widest text-[#f5cf68] font-bold font-sans">
            52 Cards Dealt
          </span>
          <span className="text-[11px] text-slate-300 mt-0.5 leading-snug">
            Hand settling · Validating deal conditions...
          </span>
        </div>
      )}

      {/* Redealing notice */}
      {redealingNotice && (
        <div className="z-20 bg-[#161924]/95 border border-[#d4af37] px-4 py-2.5 rounded-xl shadow-2xl text-center max-w-[240px]">
          <span className="text-xs font-semibold text-[#f5cf68] block">Redeal Required</span>
          <span className="text-[11px] text-slate-300 block mt-1 leading-snug">
            {redealingNotice}
          </span>
        </div>
      )}

      {/* Active Trick cards layout during PLAYING */}
      {phase !== 'ENTERING' &&
        phase !== 'SHUFFLING' &&
        phase !== 'POST_SHUFFLE_PAUSE' &&
        phase !== 'DEALING' &&
        phase !== 'HAND_SETTLING' &&
        !redealingNotice && (
          <>
            {/* Top seat (Seat 2) card */}
            {topCard && (
              <div className="absolute top-4 transition-all duration-300 transform scale-95 sm:scale-100 animate-in fade-in zoom-in-95">
                <CardView card={topCard} size="md" />
              </div>
            )}

            {/* Left seat (Seat 1) card */}
            {leftCard && (
              <div className="absolute left-4 transition-all duration-300 transform scale-95 sm:scale-100 animate-in fade-in zoom-in-95">
                <CardView card={leftCard} size="md" />
              </div>
            )}

            {/* Right seat (Seat 3) card */}
            {rightCard && (
              <div className="absolute right-4 transition-all duration-300 transform scale-95 sm:scale-100 animate-in fade-in zoom-in-95">
                <CardView card={rightCard} size="md" />
              </div>
            )}

            {/* Bottom seat (Seat 0 - You) card */}
            {bottomCard && (
              <div className="absolute bottom-4 transition-all duration-300 transform scale-95 sm:scale-100 animate-in fade-in zoom-in-95">
                <CardView card={bottomCard} size="md" />
              </div>
            )}

            {/* Winner announcement flash */}
            {lastWinnerSeat !== null && lastWinnerSeat !== undefined && (
              <div className="z-30 absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-full animate-in fade-in duration-200">
                <div className="text-center bg-[#161924] border border-[#d4af37] px-3.5 py-1.5 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                  <span className="text-xs sm:text-sm font-bold text-[#f5cf68]">
                    👑 {playerNames[lastWinnerSeat] || `Seat ${lastWinnerSeat + 1}`} Wins Trick!
                  </span>
                </div>
              </div>
            )}
          </>
        )}
    </div>
  );
};
