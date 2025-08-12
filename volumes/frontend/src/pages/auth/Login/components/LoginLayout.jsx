// ====================================
// src/pages/auth/Login/components/LoginLayout.jsx
// ====================================
import React, { useState, useEffect } from 'react';
import LoginHeader from './LoginHeader';
import LoginFooter from './LoginFooter';

const LoginLayout = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load saved theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDarkMode;
    setIsDarkMode(newIsDark);
    
    if (newIsDark) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      
      {/* Background Image Simple */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(30, 41, 59, 0.2) 100%),
            url('/assets/backgroundLogin.webp')
          `,
          backgroundAttachment: window.innerWidth > 768 ? 'fixed' : 'scroll' // Fixed solo en desktop
        }}
      />
      
      {/* Dark mode overlay */}
      <div className="absolute inset-0 bg-slate-900/80 dark:bg-slate-900/90" />

      {/* Floating geometric elements */}
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-gradient-radial from-blue-500/10 to-transparent rounded-full animate-float" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[400px] h-[400px] bg-gradient-radial from-blue-500/8 to-transparent rounded-full animate-float-reverse" />

      {/* Layout Grid */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <LoginHeader isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
        
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        
        <LoginFooter />
      </div>
    </div>
  );
};

export default LoginLayout;