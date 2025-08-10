import React from 'react';
import { AppRouter } from '@/routes';
import ErrorBoundary from '@/components/ErrorBoundary';

const App = () => {
  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
};

export default App;