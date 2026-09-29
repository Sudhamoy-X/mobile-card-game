import React, { useState } from 'react';
import { Card, RoomState, UserProfile } from '../types/game';
import { isCardPlayable } from '../game/rules';
import { isSoundEnabled, setSoundEnabled } from '../utils/audio';
import { CardView } from './CardView';
import { PlayerPanel } from './PlayerPanel';
import { TrickArea } from './TrickArea';
import { CallModal } from './CallModal';
import { CallHistoryOverlay } from './CallHistoryOverlay';
import { RoundSummaryModal } from './RoundSummaryModal';
import { WinnerModal } from './WinnerModal';
import { DismissedModal } from './DismissedModal';

interface GameScreenProps {
  roomState: RoomState;
  userProfile: UserProfile;
  mySeatIndex: number;
  onPlayCard: (card: Card) => void;
  onMakeCall: (call: number) => void;
  onEditCall: () => void;
  onNextRound: () => void;
  onRestartGame: () => void;
  onExitGame: () => void;
  onRedealDismissed: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  roomState,
  userProfile,
  mySeatIndex,
  onPlayCard,
  onMakeCall,
  onEditCall,
  onNextRound,
  onRestartGame,
  onExitGame,
  onRedealDismissed,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Fullscreen landscape behavior during gameplay
  React.useEffect(() => {
    if (typeof document !== 'undefined' && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
    return () => {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  const handleExit = () => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    onExitGame();
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const myPlayer = roomState.seats[mySeatIndex];
  const myHand = myPlayer ? roomState.playerHands[myPlayer.id] || [] : [];
  const isMyTurn = roomState.turnSeat === mySeatIndex && roomState.phase === 'PLAYING';

  // Seat rotation relative to current player:
  // Position 0 = Bottom (Me)
  // Position 1 = Left
  // Position 2 = Top
  // Position 3 = Right
  const getRelativeSeat = (relativeOffset: number) => {
    const absoluteSeat = (mySeatIndex + relativeOffset) % 4;
    return roomState.seats[absoluteSeat];
  };

  const bottomPlayer = getRelativeSeat(0);
  const leftPlayer = getRelativeSeat(1);
  const topPlayer = getRelativeSeat(2);
  const rightPlayer = getRelativeSeat(3);

  const getCardCount = (player: typeof myPlayer) => {
    if (!player) return 0;
    if (player.id === myPlayer?.id) return myHand.length;
    return roomState.playerHands[player.id]?.length ?? (13 - (roomState.tricksWon[player.id] || 0));
  };

  const handleCardClick = (card: Card) => {
    if (!isMyTurn) return;
    if (!isCardPlayable(card, myHand, roomState.currentTrick)) return;

    setSelectedCardId(card.id);
    onPlayCard(card);
  };

  const isHost = roomState.hostId === userProfile.id;

  // Determine game winner
  let winner = null;
  let highestScore = -9999;
  if (roomState.phase === 'GAME_OVER') {
    for (const seat of roomState.seats) {
      if (seat) {
        const score = roomState.scores[seat.id] || 0;
        if (score > highestScore) {
          highestScore = score;
          winner = seat;
        }
      }
    }
  }

  const latestHistory =
    roomState.history.length > 0
      ? roomState.history[roomState.history.length - 1]
      : undefined;

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col justify-between table-felt-pattern select-none">
      {/* Top HUD Bar: Exit, Round, Target, Sound, History */}
      <div className="w-full flex items-center justify-between px-3 py-2 z-20 bg-[#090a0f]/80 backdrop-blur-md border-b border-[#d4af37]/25">
        <div className="flex items-center gap-2">
          {/* Exit */}
          <button
            type="button"
            onClick={handleExit}
            className="px-2.5 py-1 rounded-lg bg-[#161924] border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-rose-300 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
          >
            ← Exit
          </button>

          {/* Round Tag */}
          <div className="px-2.5 py-1 rounded-lg bg-[#161924] border border-[#d4af37]/30 text-xs font-semibold text-[#f5cf68]">
            Round {roomState.roundNumber}
          </div>

          {/* Target Score */}
          <div className="hidden sm:flex items-center px-2.5 py-1 rounded-lg bg-[#161924] border border-slate-800 text-xs text-slate-300">
            Target: <span className="ml-1 font-bold text-[#f5cf68]">{roomState.targetScore}</span>
          </div>
        </div>

        {/* Center: Trump & Status Banner */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1 rounded-full bg-[#161924] border border-[#d4af37]/50 text-[#f5cf68] font-bold flex items-center gap-1.5 shadow-sm">
            <span>Trump:</span>
            <span className="text-white text-sm">♠ Spades</span>
          </div>

          {roomState.phase === 'HAND_SETTLING' && (
            <div className="flex items-center px-3 py-1 rounded-full bg-[#161924] border border-[#d4af37] text-[11px] text-[#f5cf68] font-bold shadow-md animate-pulse">
              <span>Inspect All 13 Cards Below</span>
            </div>
          )}

          {roomState.phase === 'PLAYING' && (
            <div className="hidden md:flex items-center px-2.5 py-1 rounded-lg bg-[#090a0f] text-[11px] text-slate-300 border border-slate-800">
              {isMyTurn ? (
                <span className="text-[#f5cf68] font-bold animate-pulse">Your Turn to Play!</span>
              ) : (
                <span>Waiting for {roomState.seats[roomState.turnSeat]?.name || 'player'}...</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className="w-8 h-8 rounded-lg bg-[#161924] border border-slate-700 hover:border-[#d4af37] text-slate-300 flex items-center justify-center text-sm cursor-pointer transition-colors"
            title={soundOn ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>

          {/* Call History */}
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="px-2.5 py-1 rounded-lg bg-[#161924] border border-[#d4af37]/40 text-[#f5cf68] hover:text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            History
          </button>
        </div>
      </div>

      {/* Main Table Area: 4 Player Panels & Central Trick Area */}
      <div className="relative flex-1 flex items-center justify-center p-2">
        {/* Top Player (Seat 2 relative) */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
          <PlayerPanel
            player={topPlayer}
            seatPosition="top"
            isCurrentTurn={topPlayer ? roomState.turnSeat === topPlayer.seatIndex : false}
            call={topPlayer ? roomState.calls[topPlayer.id] : null}
            tricksWon={topPlayer ? roomState.tricksWon[topPlayer.id] || 0 : 0}
            score={topPlayer ? roomState.scores[topPlayer.id] || 0 : 0}
            cardCount={getCardCount(topPlayer)}
            reconnectTime={topPlayer ? roomState.reconnectTimers[topPlayer.id] : undefined}
            isDealer={topPlayer ? roomState.dealerSeat === topPlayer.seatIndex : false}
          />
        </div>

        {/* Left Player (Seat 1 relative) */}
        <div className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 z-10">
          <PlayerPanel
            player={leftPlayer}
            seatPosition="left"
            isCurrentTurn={leftPlayer ? roomState.turnSeat === leftPlayer.seatIndex : false}
            call={leftPlayer ? roomState.calls[leftPlayer.id] : null}
            tricksWon={leftPlayer ? roomState.tricksWon[leftPlayer.id] || 0 : 0}
            score={leftPlayer ? roomState.scores[leftPlayer.id] || 0 : 0}
            cardCount={getCardCount(leftPlayer)}
            reconnectTime={leftPlayer ? roomState.reconnectTimers[leftPlayer.id] : undefined}
            isDealer={leftPlayer ? roomState.dealerSeat === leftPlayer.seatIndex : false}
          />
        </div>

        {/* Center: Trick / Shuffling / Redeal Area */}
        <div className="z-0">
          <TrickArea
            currentTrick={roomState.currentTrick}
            phase={roomState.phase}
            lastWinnerSeat={roomState.lastTrickWinnerSeat}
            playerNames={roomState.seats.map(s => s?.name)}
            redealingNotice={roomState.redealingNotice}
            dealingIndex={roomState.dealingIndex}
            dealingSeat={roomState.dealingSeat}
          />
        </div>

        {/* Right Player (Seat 3 relative) */}
        <div className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 z-10">
          <PlayerPanel
            player={rightPlayer}
            seatPosition="right"
            isCurrentTurn={rightPlayer ? roomState.turnSeat === rightPlayer.seatIndex : false}
            call={rightPlayer ? roomState.calls[rightPlayer.id] : null}
            tricksWon={rightPlayer ? roomState.tricksWon[rightPlayer.id] || 0 : 0}
            score={rightPlayer ? roomState.scores[rightPlayer.id] || 0 : 0}
            cardCount={getCardCount(rightPlayer)}
            reconnectTime={rightPlayer ? roomState.reconnectTimers[rightPlayer.id] : undefined}
            isDealer={rightPlayer ? roomState.dealerSeat === rightPlayer.seatIndex : false}
          />
        </div>
      </div>

      {/* Bottom Area: Your Player Panel & Your 13 Cards */}
      <div className="relative w-full flex flex-col items-center justify-end pb-2 pt-1 px-2 z-30 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/90 to-transparent">
        {/* Your Player Info Row with Swipe Helper during inspection / calling */}
        <div className="mb-1.5 flex items-center justify-between w-full max-w-4xl px-2">
          <PlayerPanel
            player={bottomPlayer}
            seatPosition="bottom"
            isCurrentTurn={bottomPlayer ? roomState.turnSeat === bottomPlayer.seatIndex : false}
            call={bottomPlayer ? roomState.calls[bottomPlayer.id] : null}
            tricksWon={bottomPlayer ? roomState.tricksWon[bottomPlayer.id] || 0 : 0}
            score={bottomPlayer ? roomState.scores[bottomPlayer.id] || 0 : 0}
            cardCount={myHand.length}
            isDealer={bottomPlayer ? roomState.dealerSeat === bottomPlayer.seatIndex : false}
          />

          {(roomState.phase === 'HAND_SETTLING' || roomState.phase === 'CALLING') && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161924]/90 border border-[#d4af37]/40 text-[11px] text-[#f5cf68] shadow-sm">
              <span className="font-semibold">↔ Swipe to inspect all 13 cards</span>
            </div>
          )}
        </div>

        {/* Player's 13 Cards (Horizontally swipeable and inspectable) */}
        <div className="w-full max-w-5xl flex items-center justify-center overflow-x-auto no-scrollbar py-1 touch-pan-x cursor-grab active:cursor-grabbing select-none">
          <div className="flex items-center -space-x-4 sm:-space-x-5 hover:-space-x-3 transition-all duration-200 px-4 min-w-max">
            {myHand.map((card, idx) => {
              const playable = isMyTurn && isCardPlayable(card, myHand, roomState.currentTrick);

              return (
                <div
                  key={card.id}
                  style={{
                    zIndex: idx + (selectedCardId === card.id ? 50 : 10),
                  }}
                  className="transition-transform duration-150 hover:-translate-y-2"
                >
                  <CardView
                    card={card}
                    isPlayable={playable || roomState.phase === 'HAND_SETTLING' || roomState.phase === 'CALLING'}
                    isSelected={selectedCardId === card.id}
                    onClick={() => handleCardClick(card)}
                    size="md"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Call Modal when in CALLING phase */}
      {roomState.phase === 'CALLING' && myPlayer && (
        <CallModal
          myCall={roomState.calls[myPlayer.id]}
          seats={roomState.seats}
          calls={roomState.calls}
          onConfirmCall={onMakeCall}
          onEditCall={onEditCall}
          onOpenHistory={() => setShowHistory(true)}
        />
      )}

      {/* Call History Overlay */}
      {showHistory && (
        <CallHistoryOverlay
          history={roomState.history}
          seats={roomState.seats}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Round Summary Modal when round ends */}
      {roomState.phase === 'ROUND_SUMMARY' && (
        <RoundSummaryModal
          roundNumber={roomState.roundNumber}
          targetScore={roomState.targetScore}
          seats={roomState.seats}
          latestHistory={latestHistory}
          onNextRound={onNextRound}
          isHost={isHost}
        />
      )}

      {/* Dismissed Modal when dealing conditions are not met */}
      {roomState.phase === 'DISMISSED' && (
        <DismissedModal
          dismissalInfo={roomState.dismissalInfo}
          onRedeal={onRedealDismissed}
          isHost={isHost}
        />
      )}

      {/* Winner Modal when game target is reached */}
      {roomState.phase === 'GAME_OVER' && (
        <WinnerModal
          winner={winner}
          finalScore={highestScore}
          allSeats={roomState.seats}
          scores={roomState.scores}
          onRestart={onRestartGame}
          onHome={onExitGame}
          onExit={onExitGame}
          isHost={isHost}
        />
      )}
    </div>
  );
};
