// ./src/App.jsx
import React from 'react';
import AppRouter from '@/routes/AppRouter';
import { useResourcePreloader } from '@/hooks/useResourcePreloader';
import ErrorBoundary from '@/components/ErrorBoundary';

const App = () => {
  // Precargar recursos críticos
  useResourcePreloader();

  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
};

export default App;