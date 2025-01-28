import React, { useState } from "react";

const RecoverPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage(
      "Se enviarán los pasos para recuperar tu contraseña a la casilla indicada."
    );
    console.log("Correo enviado a:", email);
    // Aquí puedes agregar la lógica para manejar el envío del correo de recuperación
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Recuperar Contraseña</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-primary-light dark:bg-primary-dark text-white font-semibold rounded-lg shadow-md hover:bg-primary dark:hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
          >
            Enviar Instrucciones
          </button>
        </form>
        {message && (
          <p className="mt-4 text-sm text-center text-success-light dark:text-success-dark">
            {message}
          </p>
        )}
        <p className="mt-4 text-sm text-center text-gray-600 dark:text-gray-400">
          <a href="/login" className="text-primary-light dark:text-primary-dark hover:underline">
            Volver al inicio de sesión
          </a>
        </p>
      </div>
    </div>
  );
};

export default RecoverPassword;
