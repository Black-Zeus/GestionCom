// ====================================
// src/pages/auth/Login/index.jsx
// ====================================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/authStore";
import { login as authLogin } from "@/services/authService";
import { ROUTES } from "@/constants";
import LoginLayout from "./components/LoginLayout";
import LoginForm from "./components/LoginForm";
import { isDevelopment } from "@/utils/environment";

const Login = () => {
  const navigate = useNavigate();

  // 🔧 CORRECCIÓN: Usar la función correcta del store
  const {
    login: setAuthCredentials,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [credentials, setCredentialsState] = useState({
    username: isDevelopment ? "admin.demo" : "",
    password: isDevelopment ? "admin123" : "",
    remember: false,
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleLogin = async (formData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Llamar al servicio de autenticación
      const response = await authLogin({
        username: formData.username,
        password: formData.password,
        remember_me: formData.remember,
      });

      if (response.success && response.data) {
        // 🔧 CORRECCIÓN: Usar setAuthCredentials en lugar de setCredentials
        setAuthCredentials(response);

        // Navigate to dashboard
        navigate(ROUTES.DASHBOARD, { replace: true });
      }
    } catch (error) {
      console.error("Login failed:", error);
      setError(error.message || "Error de acceso. Verifica tus credenciales.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCredentialsState((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  return (
    <LoginLayout>
      <LoginForm
        credentials={credentials}
        isLoading={isLoading}
        error={error}
        onInputChange={handleInputChange}
        onSubmit={handleLogin}
      />
    </LoginLayout>
  );
};

export default Login;
