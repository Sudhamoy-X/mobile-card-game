import React, { useState } from 'react';
import { UserProfile } from '../types/game';

interface HomeScreenProps {
  userProfile: UserProfile;
  hasSavedGame: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenProfile: () => void;
  onSelectLocalPlay: () => void;
  onSelectWithFriends: () => void;
  onContinueGame: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  userProfile,
  hasSavedGame,
  isDarkMode,
  onToggleTheme,
  onOpenProfile,
  onSelectLocalPlay,
  onSelectWithFriends,
  onContinueGame,
}) => {
  const [showStartSubmenu, setShowStartSubmenu] = useState(false);
  const [noSavedGameNotice, setNoSavedGameNotice] = useState(false);

  const handleContinueClick = () => {
    if (hasSavedGame) {
      onContinueGame();
    } else {
      setNoSavedGameNotice(true);
      setTimeout(() => setNoSavedGameNotice(false), 2500);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-between p-6 table-felt-pattern">
      {/* Top Bar: Profile & Dark/Light Switch */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        {/* User Profile Pill */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#12151d]/90 border border-[#d4af37]/40 hover:border-[#d4af37] text-slate-200 text-xs transition-all cursor-pointer shadow-md"
        >
          <span className="w-5 h-5 rounded-full bg-[#2a2310] border border-[#d4af37]/60 flex items-center justify-center text-[10px]">
            {userProfile.avatar === 'crown' ? '👑' : userProfile.avatar === 'star' ? '⭐' : '♠'}
          </span>
          <span className="font-semibold text-[#f5cf68] truncate max-w-[120px]">
            {userProfile.displayName}
          </span>
        </button>

        {/* Dark / Light Mode Switch */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#12151d]/90 border border-[#d4af37]/40 hover:border-[#d4af37] text-xs font-semibold text-[#f5cf68] transition-all cursor-pointer shadow-md"
        >
          <span>{isDarkMode ? '🌙 Dark' : '☀️ Light'}</span>
        </button>
      </div>

      {/* Center: Luxury Game Logo & Main Navigation */}
      <div className="flex flex-col items-center justify-center text-center z-10 -mt-6">
        {/* Heraldic Luxury Logo Insignia */}
        <div className="relative mb-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-2 border-[#d4af37] bg-gradient-to-br from-[#1c1f2b] via-[#090a0f] to-[#12151d] shadow-[0_0_35px_rgba(212,175,55,0.35)] flex items-center justify-center p-3 transform rotate-45 hover:rotate-0 transition-transform duration-500">
            <div className="transform -rotate-45 hover:rotate-0 transition-transform duration-500 flex flex-col items-center">
              <span className="text-4xl sm:text-5xl text-[#d4af37] drop-shadow-md">♠</span>
            </div>
          </div>
          <div className="absolute -inset-2 rounded-3xl border border-[#d4af37]/20 pointer-events-none transform rotate-45" />
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold font-serif gold-gradient-text tracking-wider uppercase mb-1 drop-shadow-lg">
          Mobile Card Game 2.0
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-sans tracking-wide max-w-md mb-8">
          Classic 4-Player Spades · Obsidian Gold Luxury Edition
        </p>

        {/* Main Action Buttons */}
        <div className="w-full max-w-xs space-y-3">
          {!showStartSubmenu ? (
            <>
              {/* START GAME */}
              <button
                type="button"
                onClick={() => setShowStartSubmenu(true)}
                className="w-full py-3.5 px-6 rounded-2xl font-bold font-sans text-sm tracking-wider uppercase bg-gradient-to-r from-[#d4af37] via-[#f5cf68] to-[#aa771c] hover:from-[#f5cf68] hover:to-[#d4af37] text-[#090a0f] shadow-[0_0_25px_rgba(212,175,55,0.4)] cursor-pointer transition-all transform active:scale-98"
              >
                Start Game
              </button>

              {/* CONTINUE GAME */}
              <button
                type="button"
                onClick={handleContinueClick}
                className={`w-full py-3.5 px-6 rounded-2xl font-semibold text-sm tracking-wide border transition-all cursor-pointer shadow-md ${
                  hasSavedGame
                    ? 'border-[#d4af37]/60 bg-[#161924] hover:bg-[#1e2230] text-[#f5cf68] hover:border-[#d4af37]'
                    : 'border-slate-800 bg-[#12151d]/60 text-slate-500 hover:border-slate-700'
                }`}
              >
                Continue Game
              </button>

              {noSavedGameNotice && (
                <div className="text-xs text-amber-300/90 animate-fade-in">
                  No active game found. Start a new game!
                </div>
              )}
            </>
          ) : (
            /* Submenu: WITH FRIENDS or LOCAL PLAY */
            <div className="space-y-2.5 animate-in fade-in zoom-in-95">
              <button
                type="button"
                onClick={onSelectWithFriends}
                className="w-full py-3 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#f5cf68] text-[#090a0f] shadow-lg cursor-pointer transition-all flex items-center justify-between"
              >
                <span>With Friends (Online)</span>
                <span>👥</span>
              </button>

              <button
                type="button"
                onClick={onSelectLocalPlay}
                className="w-full py-3 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider bg-[#161924] border border-[#d4af37]/60 hover:border-[#d4af37] text-[#f5cf68] shadow-md cursor-pointer transition-all flex items-center justify-between"
              >
                <span>Local Play (Offline)</span>
                <span>🤖</span>
              </button>

              <button
                type="button"
                onClick={() => setShowStartSubmenu(false)}
                className="text-xs text-slate-400 hover:text-white pt-1 block mx-auto cursor-pointer"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Powered by Sudhamoy */}
      <div className="text-center z-10 pb-2">
        <span className="text-xs font-serif text-[#d4af37]/70 tracking-widest uppercase">
          Powered by Sudhamoy
        </span>
      </div>
    </div>
  );
};
