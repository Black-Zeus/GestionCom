import React from 'react';

function App() {
  const frontendName = import.meta.env.VITE_FRONTEND_NAME || 'X';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-purple-600 dark:from-primary-dark dark:to-purple-800 flex items-center justify-center">
      <div className="text-center text-white max-w-2xl px-8">
        <div className="text-6xl mb-8 animate-pulse">
          ✨
        </div>
        
        <h1 className="text-4xl md:text-5xl font-light mb-8 tracking-wide">
          Sistema {frontendName} - FrontEnd
        </h1>
        
        <div className="flex items-center justify-center gap-3 mt-8 px-6 py-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-subtle">
          <span className="text-xl">✅</span>
          <p className="text-lg font-light">
            FrontEnd limpio y listo para utilizarse
          </p>
        </div>
        
        <div className="mt-12 text-sm text-white/70 font-light">
          Desarrollado con React + Tailwind CSS
        </div>
      </div>
    </div>
  );
}

export default App;