// src/features/auth/Login.js
import React from 'react';
import { useAuth } from './useAuth';

const Login = () => {
  const { handleLogin } = useAuth();

  return (
    <div>
      <h1>Iniciar sesión</h1>
      <button onClick={handleLogin}>Iniciar sesión con Microsoft</button>
    </div>
  );
};

export default Login;
