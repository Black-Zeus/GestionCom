import React, { useState } from "react";

const ResetPassword = () => {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [message, setMessage] = useState("");

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (code === "123456") { // Simular código correcto
      setIsCodeValid(true);
      setMessage("");
    } else {
      setMessage("El código ingresado es incorrecto.");
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === confirmPassword) {
      console.log("Contraseña actualizada a:", password);
      setMessage("Tu contraseña ha sido actualizada correctamente.");
    } else {
      setMessage("Las contraseñas no coinciden. Por favor, inténtalo de nuevo.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Restablecer Contraseña</h1>
        {!isCodeValid ? (
          <form onSubmit={handleCodeSubmit}>
            <div className="mb-4">
              <label htmlFor="code" className="block text-sm font-medium mb-2">
                Código de Verificación
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-primary-light dark:bg-primary-dark text-white font-semibold rounded-lg shadow-md hover:bg-primary dark:hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
            >
              Verificar Código
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Nueva Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:outline-none"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirmar Contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-primary-light dark:bg-primary-dark text-white font-semibold rounded-lg shadow-md hover:bg-primary dark:hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
            >
              Actualizar Contraseña
            </button>
          </form>
        )}
        {message && (
          <p className="mt-4 text-sm text-center text-danger-light dark:text-danger-dark">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;