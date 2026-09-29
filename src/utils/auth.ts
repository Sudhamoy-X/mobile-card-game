import { UserProfile } from '../types/game';

const AUTH_STORAGE_KEY = 'mcg_user_profile';

export function getStoredUserProfile(): UserProfile {
  if (typeof window !== 'undefined') {
    try {
      const data = localStorage.getItem(AUTH_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Ignore
    }
  }

  // Default guest profile
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const defaultProfile: UserProfile = {
    id: `MCG-${randomSuffix}`,
    displayName: `Player ${randomSuffix}`,
    avatar: 'user',
    authProvider: 'guest',
  };

  saveUserProfile(defaultProfile);
  return defaultProfile;
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore
    }
  }
}
