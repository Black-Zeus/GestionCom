import React from "react";
import { Link } from "react-router-dom";

const Forbidden = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
      <h1 className="text-6xl font-bold mb-4">403</h1>
      <p className="text-xl mb-6">No tienes permiso para acceder a esta página.</p>
      <Link
        to="/"
        className="px-6 py-3 bg-primary-light dark:bg-primary-dark text-white font-semibold rounded-lg shadow-md hover:bg-primary dark:hover:bg-primary-light"
      >
        Volver al Inicio
      </Link>
    </div>
  );
};

export default Forbidden;