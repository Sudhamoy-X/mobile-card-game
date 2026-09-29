import React from 'react';
import { Card, Suit } from '../types/game';
import { SUIT_SYMBOLS } from '../game/rules';

interface CardViewProps {
  card?: Card;
  faceDown?: boolean;
  isPlayable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  faceDown = false,
  isPlayable = false,
  isSelected = false,
  onClick,
  className = '',
  size = 'md',
}) => {
  // Dimension presets (width x height)
  const sizeClasses = {
    sm: 'w-10 h-14 text-xs rounded-md',
    md: 'w-14 h-20 sm:w-16 sm:h-24 text-sm rounded-lg',
    lg: 'w-18 h-26 sm:w-20 sm:h-30 text-base rounded-xl',
  }[size];

  if (faceDown || !card) {
    // Luxury Obsidian Gold card back
    return (
      <div
        className={`relative select-none border border-[#d4af37]/40 bg-gradient-to-br from-[#12151d] via-[#090a0f] to-[#1c1f2b] card-shadow flex items-center justify-center overflow-hidden transition-all duration-200 ${sizeClasses} ${className}`}
      >
        {/* Subtle patterned gold inlay */}
        <div className="absolute inset-1 border border-[#d4af37]/25 rounded-[4px] flex items-center justify-center bg-[#090a0f]/60">
          <div className="w-5 h-5 rounded-full border border-[#d4af37]/40 flex items-center justify-center">
            <span className="text-[#d4af37] text-xs font-serif">♠</span>
          </div>
        </div>
      </div>
    );
  }

  const isRed = card.suit === 'H' || card.suit === 'D';
  const suitSymbol = SUIT_SYMBOLS[card.suit];

  return (
    <button
      type="button"
      onClick={isPlayable ? onClick : undefined}
      disabled={!isPlayable && !onClick}
      className={`relative select-none text-left transition-all duration-150 transform cursor-pointer ${sizeClasses} ${className} ${
        isSelected ? '-translate-y-4 ring-2 ring-[#d4af37] shadow-xl' : ''
      } ${
        isPlayable
          ? 'hover:-translate-y-2 card-playable-glow ring-1 ring-[#d4af37]/70 cursor-pointer opacity-100'
          : onClick
          ? 'opacity-85'
          : 'opacity-50 cursor-not-allowed filter grayscale-[30%]'
      } bg-[#fafaf7] text-slate-900 border border-slate-300 card-shadow flex flex-col justify-between p-1`}
      style={{
        boxShadow: isPlayable
          ? '0 0 14px rgba(212, 175, 55, 0.4), 0 4px 8px rgba(0,0,0,0.3)'
          : undefined,
      }}
    >
      {/* Top Left Rank & Suit */}
      <div className="flex flex-col items-center leading-none">
        <span
          className={`font-bold font-sans tracking-tighter text-[11px] sm:text-xs ${
            isRed ? 'text-[#c92a2a]' : 'text-[#111827]'
          }`}
        >
          {card.rank}
        </span>
        <span
          className={`text-[10px] sm:text-xs leading-none ${
            isRed ? 'text-[#c92a2a]' : 'text-[#111827]'
          }`}
        >
          {suitSymbol}
        </span>
      </div>

      {/* Center Center Symbol / Artwork */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {card.rank === 'A' ? (
          <span
            className={`text-xl sm:text-2xl font-serif ${
              isRed ? 'text-[#c92a2a]' : 'text-[#111827]'
            }`}
          >
            {suitSymbol}
          </span>
        ) : ['K', 'Q', 'J'].includes(card.rank) ? (
          <div
            className={`flex flex-col items-center justify-center border border-current/20 rounded px-1 py-0.5 ${
              isRed ? 'text-[#c92a2a]' : 'text-[#111827]'
            }`}
          >
            <span className="text-[10px] sm:text-xs font-serif font-bold">{card.rank}</span>
            <span className="text-[9px] leading-none">{suitSymbol}</span>
          </div>
        ) : (
          <span
            className={`text-sm sm:text-base opacity-90 ${
              isRed ? 'text-[#c92a2a]' : 'text-[#111827]'
            }`}
          >
            {suitSymbol}
          </span>
        )}
      </div>

      {/* Bottom Right Rank & Suit (upside down) */}
      <div className="flex flex-col items-center leading-none transform rotate-180 self-end">
        <span
          className={`font-bold font-sans tracking-tighter text-[11px] sm:text-xs ${
            isRed ? 'text-[#c92a2a]' : 'text-[#111827]'
          }`}
        >
          {card.rank}
        </span>
        <span
          className={`text-[10px] sm:text-xs leading-none ${
            isRed ? 'text-[#c92a2a]' : 'text-[#111827]'
          }`}
        >
          {suitSymbol}
        </span>
      </div>
    </button>
  );
};
