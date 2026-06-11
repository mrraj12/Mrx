import React from 'react';
import { Moon, Sun } from 'lucide-react';

interface DarkModeToggleProps {
  darkMode: boolean;
  onToggle?: () => void;
}

export default function DarkModeToggle({ darkMode, onToggle }: DarkModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!onToggle}
      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0 ${
        darkMode
          ? 'bg-white/10 border-white/10 text-yellow-300 hover:bg-white/20'
          : 'bg-black/5 border-black/10 text-purple-700 hover:bg-black/10'
      } ${!onToggle ? 'opacity-60 cursor-not-allowed' : ''}`}
      aria-label="Toggle dark mode"
    >
      {darkMode ? (
        <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
      ) : (
        <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
      )}
    </button>
  );
}