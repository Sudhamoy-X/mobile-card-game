import React, { useState } from 'react';
import { UserProfile } from '../types/game';
import { saveUserProfile } from '../utils/auth';

interface AuthModalProps {
  currentUser: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onUpdateUser,
  onClose,
}) => {
  const [mode, setMode] = useState<'profile' | 'google' | 'phone'>('profile');
  const [name, setName] = useState(currentUser.displayName);
  const [avatar, setAvatar] = useState(currentUser.avatar);

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');

  const avatarOptions = ['user', 'crown', 'ace', 'king', 'star'];

  const handleSaveProfile = () => {
    const updated: UserProfile = {
      ...currentUser,
      displayName: name.trim() || currentUser.displayName,
      avatar,
    };
    saveUserProfile(updated);
    onUpdateUser(updated);
    onClose();
  };

  const handleGoogleLogin = () => {
    // Simulated Google OAuth login
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const googleUser: UserProfile = {
      id: `MCG-G${randomSuffix}`,
      displayName: name.startsWith('Player') ? 'Sudhamoy Das' : name,
      avatar: 'crown',
      authProvider: 'google',
      email: 'player@gmail.com',
    };
    saveUserProfile(googleUser);
    onUpdateUser(googleUser);
    onClose();
  };

  const handleSendOtp = () => {
    if (phoneNumber.length < 8) {
      setOtpError('Please enter a valid phone number');
      return;
    }
    setOtpError('');
    setOtpSent(true);
  };

  const handleVerifyOtp = () => {
    if (otpCode.length < 4) {
      setOtpError('Please enter the 4-digit code (e.g. 1234)');
      return;
    }
    const phoneUser: UserProfile = {
      id: `MCG-P${phoneNumber.slice(-4)}`,
      displayName: name.startsWith('Player') ? `User ${phoneNumber.slice(-4)}` : name,
      avatar: 'star',
      authProvider: 'phone',
      phone: phoneNumber,
    };
    saveUserProfile(phoneUser);
    onUpdateUser(phoneUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#12151d] border border-[#d4af37]/50 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3 mb-4">
          <h2 className="text-base sm:text-lg font-bold font-serif gold-gradient-text">
            {mode === 'profile' ? 'PLAYER PROFILE & AUTH' : mode === 'google' ? 'GOOGLE LOGIN' : 'PHONE OTP LOGIN'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#161924] border border-slate-700 hover:border-[#d4af37] text-slate-300 flex items-center justify-center text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {mode === 'profile' && (
          <div className="space-y-4">
            {/* Player ID badge */}
            <div className="flex items-center justify-between bg-[#090a0f] p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block">UNIQUE PLAYER ID</span>
                <span className="font-mono text-xs font-bold text-[#f5cf68]">{currentUser.id}</span>
              </div>
              <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-[#161924] border border-slate-700 text-slate-300">
                {currentUser.authProvider}
              </span>
            </div>

            {/* Display Name Input */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={20}
                className="w-full px-3 py-2 bg-[#161924] border border-slate-700 focus:border-[#d4af37] rounded-xl text-white text-sm outline-none transition-colors"
                placeholder="Enter player name"
              />
            </div>

            {/* Avatar Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Select Avatar
              </label>
              <div className="flex items-center gap-2">
                {avatarOptions.map(av => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl border transition-all cursor-pointer ${
                      avatar === av
                        ? 'border-[#d4af37] bg-[#2a2310] ring-2 ring-[#d4af37]/50'
                        : 'border-slate-800 bg-[#161924] hover:border-slate-600'
                    }`}
                  >
                    {av === 'user' ? '👤' : av === 'crown' ? '👑' : av === 'ace' ? '♠' : av === 'king' ? '🦁' : '⭐'}
                  </button>
                ))}
              </div>
            </div>

            {/* Alternative Logins */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-2 font-semibold">
                Sign In Options:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('google')}
                  className="py-2 px-3 rounded-xl bg-[#161924] border border-slate-700 hover:border-blue-500 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="text-blue-400">G</span> Google Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode('phone')}
                  className="py-2 px-3 rounded-xl bg-[#161924] border border-slate-700 hover:border-emerald-500 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>📱</span> Phone OTP
                </button>
              </div>
            </div>

            {/* Save Profile Button */}
            <button
              type="button"
              onClick={handleSaveProfile}
              className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-[#d4af37] to-[#aa771c] hover:from-[#f5cf68] hover:to-[#d4af37] text-[#090a0f] shadow-lg cursor-pointer transition-all mt-2"
            >
              Save Profile
            </button>
          </div>
        )}

        {mode === 'google' && (
          <div className="space-y-4 py-2 text-center">
            <p className="text-xs text-slate-300">
              Link with your Google Account for cross-device authentication.
            </p>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-3 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
            >
              <span>Continue with Google</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('profile')}
              className="text-xs text-slate-400 hover:text-white"
            >
              ← Back to Profile
            </button>
          </div>
        )}

        {mode === 'phone' && (
          <div className="space-y-4 py-2">
            {!otpSent ? (
              <>
                <p className="text-xs text-slate-300">
                  Enter your phone number to receive a one-time SMS verification code.
                </p>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 bg-[#161924] border border-slate-700 focus:border-[#d4af37] rounded-xl text-white text-sm outline-none"
                />
                {otpError && <div className="text-xs text-rose-400">{otpError}</div>}
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa771c] text-[#090a0f] font-bold text-xs cursor-pointer"
                >
                  Send OTP Code
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-300">
                  Enter the 4-digit code sent to <span className="text-[#f5cf68]">{phoneNumber}</span>:
                </p>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  placeholder="1234"
                  className="w-full text-center tracking-widest text-lg px-3 py-2 bg-[#161924] border border-[#d4af37] rounded-xl text-white font-mono outline-none"
                />
                {otpError && <div className="text-xs text-rose-400">{otpError}</div>}
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa771c] text-[#090a0f] font-bold text-xs cursor-pointer"
                >
                  Verify & Sign In
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setMode('profile');
              }}
              className="text-xs text-slate-400 hover:text-white block mx-auto mt-2"
            >
              ← Back to Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
