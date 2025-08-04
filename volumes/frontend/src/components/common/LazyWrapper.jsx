
import React, { Suspense } from 'react';
import LoadingSpinner from './LoadingSpinner';

const LazyWrapper = ({ 
  children, 
  fallback = null, 
  errorFallback = null,
  minDelay = 200 // Evitar parpadeo en conexiones rápidas
}) => {
  const [showFallback, setShowFallback] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowFallback(true), minDelay);
    return () => clearTimeout(timer);
  }, [minDelay]);

  const defaultFallback = showFallback ? (
    fallback || <LoadingSpinner />
  ) : <div className="min-h-[200px]" />; // Placeholder sin contenido

  return (
    <Suspense fallback={defaultFallback}>
      {children}
    </Suspense>
  );
};

export default LazyWrapper;