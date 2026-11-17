
import React from 'react';

interface AnalyzeButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const AnalyzeButton: React.FC<AnalyzeButtonProps> = ({ onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-indigo-600 rounded-full shadow-lg transition-all duration-200 ease-in-out hover:scale-105 hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 disabled:bg-indigo-800/50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:hover:scale-100"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.636-6.364l.707.707M19.071 19.071l-.707-.707M4.929 4.929l.707.707" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Avvia Analisi
    </button>
  );
};

export default AnalyzeButton;
