import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: string;
  hasCompletedOnboarding: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage',
      // Only persist the user profile (email, role) for UI display.
      // The access token is NOT persisted — it lives in memory only.
      // The 401 interceptor in axios.ts silently refreshes it via the
      // HttpOnly refresh cookie, so the token survives page reloads.
      partialize: (state) => ({ user: state.user }),
    }
  )
);
