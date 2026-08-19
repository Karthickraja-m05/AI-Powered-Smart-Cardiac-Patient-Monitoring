import { motion } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <motion.button
      type="button"
      id="theme-toggle-btn"
      onClick={toggleTheme}
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      className={`
        relative flex items-center justify-between gap-2 px-3 py-1.5 rounded-full
        transition-all duration-500 cursor-pointer select-none group
        ${isDark
          ? 'bg-[#15181f] text-slate-300 border border-white/[0.08] shadow-[4px_4px_10px_rgba(0,0,0,0.5),-3px_-3px_8px_rgba(255,255,255,0.03)] hover:shadow-[0_0_15px_rgba(139,92,246,0.3)]'
          : 'bg-white/70 text-slate-800 border border-white/90 shadow-[0_8px_20px_rgba(31,38,135,0.1)] backdrop-blur-xl hover:bg-white/90 hover:shadow-[0_8px_25px_rgba(31,38,135,0.15)]'
        }
      `}
      title={`Current: ${isDark ? 'Dark (Neumorphic)' : 'Light (Glassmorphic)'} — Click to toggle`}
    >
      {/* Track Background Glow */}
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        {/* Animated Icon */}
        <motion.div
          key={theme}
          initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex items-center justify-center text-sm"
        >
          {isDark ? (
            <span className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">🌙</span>
          ) : (
            <span className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">☀️</span>
          )}
        </motion.div>

        {/* Theme Label */}
        <span className={`text-[11px] font-bold tracking-wide uppercase ${isDark ? 'text-purple-300' : 'text-sky-800'}`}>
          {isDark ? 'Dark' : 'Light'}
        </span>
      </div>

      {/* Animated Sliding Pill Indicator */}
      <div className={`
        w-5 h-5 rounded-full flex items-center justify-center text-[10px]
        transition-all duration-500
        ${isDark
          ? 'bg-gradient-to-tr from-purple-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]'
          : 'bg-gradient-to-tr from-amber-400 to-orange-400 text-white shadow-[0_2px_8px_rgba(251,146,60,0.4)]'
        }
      `}>
        <motion.span
          animate={{ rotate: isDark ? 0 : 180 }}
          transition={{ duration: 0.5 }}
        >
          ✦
        </motion.span>
      </div>
    </motion.button>
  );
}
