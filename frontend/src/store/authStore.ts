import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const u = localStorage.getItem('cardiosense_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  })(),
  token: localStorage.getItem('cardiosense_token'),
  isAuthenticated: !!localStorage.getItem('cardiosense_token'),

  login: (user, token) => {
    localStorage.setItem('cardiosense_token', token);
    localStorage.setItem('cardiosense_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('cardiosense_token');
    localStorage.removeItem('cardiosense_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (userData) => {
    set((state) => {
      const updated = state.user ? { ...state.user, ...userData } : null;
      if (updated) localStorage.setItem('cardiosense_user', JSON.stringify(updated));
      return { user: updated };
    });
  },
}));
