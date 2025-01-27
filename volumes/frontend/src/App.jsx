import React from 'react';

export function App({ pca }) {
  const environment = import.meta.env.VITE_FRONTEND_ENV || "Ambiente no especificado";

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Frontend React</h1>
        <h2 style={styles.subtitle}>{environment}</h2>
        <p style={styles.message}>Página de pruebas</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#000', // Fondo negro
    color: '#fff',           // Texto blanco
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    textAlign: 'center',
    padding: '20px',
    borderRadius: '10px',
    backgroundColor: '#222', // Fondo del card gris oscuro
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '1.5rem',
    marginBottom: '10px',
    color: '#4CAF50', // Verde para resaltar el ambiente
  },
  message: {
    fontSize: '1rem',
    marginTop: '10px',
  },
};
