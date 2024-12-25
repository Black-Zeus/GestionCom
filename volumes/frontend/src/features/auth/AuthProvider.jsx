// src/features/auth/AuthProvider.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { login, logout, getAccount } from './msalService'; // Los servicios de autenticación

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = getAccount();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleLogin = async () => {
    try {
      await login();
      const currentUser = getAccount();
      setUser(currentUser);
    } catch (error) {
      console.error('Error en el login', error);
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
