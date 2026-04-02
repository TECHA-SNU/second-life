import React from 'react';
import { LucideIcon } from 'lucide-react';

interface NavButtonProps {
  label: string;
  onClick: () => void;
  icon: LucideIcon;
}

export const NavButton: React.FC<NavButtonProps> = ({ label, onClick, icon: Icon }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl 
                 glass-panel hover:bg-white/10 transition-all duration-300 group w-20 h-24 sm:w-24 sm:h-28"
    >
      <div className="p-2 rounded-full bg-purple-500/20 group-hover:bg-purple-500/40 transition-colors">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-200" />
      </div>
      <span className="text-xs sm:text-sm text-gray-200 font-medium tracking-wide">{label}</span>
    </button>
  );
};