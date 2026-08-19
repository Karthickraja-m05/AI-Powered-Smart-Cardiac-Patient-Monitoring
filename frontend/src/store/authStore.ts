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
      const u = localStorage.getItem('carebridge_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  })(),
  token: localStorage.getItem('carebridge_token'),
  isAuthenticated: !!localStorage.getItem('carebridge_token'),

  login: (user, token) => {
    localStorage.setItem('carebridge_token', token);
    localStorage.setItem('carebridge_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('carebridge_token');
    localStorage.removeItem('carebridge_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (userData) => {
    set((state) => {
      const updated = state.user ? { ...state.user, ...userData } : null;
      if (updated) localStorage.setItem('carebridge_user', JSON.stringify(updated));
      return { user: updated };
    });
  },
}));
