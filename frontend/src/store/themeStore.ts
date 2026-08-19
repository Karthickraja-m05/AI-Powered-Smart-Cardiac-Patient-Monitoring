import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const STORAGE_KEY = 'cardiosense_theme';

const getInitialTheme = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Check system preference if no saved preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch (e) {
    // fallback
  }
  return 'dark'; // Default is Dark Theme (Neumorphic)
};

const applyThemeToDOM = (theme: ThemeMode) => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark', 'theme-dark', 'theme-neumorphic');
    root.classList.remove('light', 'theme-light', 'theme-glassmorphic');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.add('light', 'theme-light', 'theme-glassmorphic');
    root.classList.remove('dark', 'theme-dark', 'theme-neumorphic');
    root.setAttribute('data-theme', 'light');
  }
};

const initialTheme = getInitialTheme();
applyThemeToDOM(initialTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,

  toggleTheme: () => {
    set((state) => {
      const nextTheme: ThemeMode = state.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch (e) {}
      applyThemeToDOM(nextTheme);
      return { theme: nextTheme };
    });
  },

  setTheme: (theme: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
    applyThemeToDOM(theme);
    set({ theme });
  },
}));
