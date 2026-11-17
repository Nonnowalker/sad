import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500 tracking-tight">
        Report Violazioni WCAG 2.2
      </h1>
      <p className="mt-4 text-lg text-slate-400">
        Riepilogo automatico dei problemi di accessibilità secondo le ultime linee guida.
      </p>
    </header>
  );
};

export default Header;
