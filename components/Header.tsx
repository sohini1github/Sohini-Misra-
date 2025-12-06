import React from 'react';
import { Quote, CheckCircle, Moon, Sun } from 'lucide-react';
import { RATAN_TATA_IMAGE_URL } from '../constants';

interface HeaderProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ darkMode, toggleDarkMode }) => {
  return (
    <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-20 border-b border-slate-800 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative">
          
          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="absolute top-0 right-0 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Large Profile Photo */}
          <div className="relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-[3px] border-slate-200/20 shadow-2xl flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ring-4 ring-black/20">
               <img 
                 src={RATAN_TATA_IMAGE_URL} 
                 alt="Ratan Tata" 
                 className="w-full h-full object-cover object-top"
                 onError={(e) => {
                   (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=Ratan+Tata&background=random";
                 }}
               />
            </div>
            {/* Online/Verified Indicator */}
            <div className="absolute bottom-1 right-1 md:bottom-2 md:right-4 bg-green-500 border-4 border-slate-900 rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center shadow-sm z-10" title="Active">
            </div>
          </div>

          <div className="flex flex-col items-center md:items-start flex-grow text-center md:text-left pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-serif font-bold text-2xl md:text-3xl tracking-wide text-slate-100">Ratan Tata</h1>
              <CheckCircle size={22} className="text-blue-400 fill-blue-400/10" />
            </div>
            <p className="text-slate-400 font-medium text-base mb-4">Chairman Emeritus, Tata Sons</p>
            
            <div className="flex items-center gap-3 text-slate-300 bg-slate-800/60 px-5 py-3 rounded-xl text-sm border border-slate-700/50 italic max-w-xl shadow-inner backdrop-blur-sm">
              <Quote size={20} className="flex-shrink-0 text-blue-400/60" />
              <span className="leading-relaxed">"Ups and downs in life are very important to keep us going, because a straight line even in an ECG means we are not alive."</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};