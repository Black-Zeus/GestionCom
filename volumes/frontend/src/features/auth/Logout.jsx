// src/features/auth/Logout.js
import React from 'react';
import { useAuth } from './useAuth';

const Logout = () => {
  const { handleLogout } = useAuth();

  return (
    <div>
      <h2>Bienvenido</h2>
      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
};

export default Logout;
