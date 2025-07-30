/**
 * components/ErrorBoundary.jsx
 * Error Boundary para capturar errores de React
 * UI de fallback simple y logging de errores
 */

import React from 'react';
import { shouldLog, isDevelopment, getAppInfo } from '@/utils/environment';

// ==========================================
// ERROR BOUNDARY CLASS COMPONENT
// ==========================================

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Actualizar state para mostrar UI de fallback
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  componentDidCatch(error, errorInfo) {
    // Capturar detalles del error
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log del error
    this.logError(error, errorInfo);

    // Callback opcional del parent
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  logError = (error, errorInfo) => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      appInfo: getAppInfo()
    };

    // Log en consola (desarrollo)
    if (shouldLog()) {
      console.group('🚨 React Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Full Details:', errorDetails);
      console.groupEnd();
    }

    // En producción, podrías enviar a un servicio de logging
    if (!isDevelopment()) {
      this.sendErrorToService(errorDetails);
    }
  };

  sendErrorToService = async (errorDetails) => {
    try {
      // Aquí podrías enviar a Sentry, LogRocket, etc.
      // Por ahora solo guardamos en localStorage como backup
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      errors.push({
        ...errorDetails,
        reported: false
      });
      
      // Mantener solo los últimos 10 errores
      if (errors.length > 10) {
        errors.splice(0, errors.length - 10);
      }
      
      localStorage.setItem('app_errors', JSON.stringify(errors));
    } catch (storageError) {
      console.warn('Failed to store error details:', storageError);
    }
  };

  handleRetry = () => {
    // Reset del error boundary
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  copyErrorDetails = () => {
    const errorText = `
Error ID: ${this.state.errorId}
Message: ${this.state.error?.message}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}

Stack Trace:
${this.state.error?.stack}

Component Stack:
${this.state.errorInfo?.componentStack}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      alert('Detalles del error copiados al portapapeles');
    }).catch(() => {
      // Fallback para navegadores antiguos
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Detalles del error copiados al portapapeles');
    });
  };

  render() {
    if (this.state.hasError) {
      // UI personalizada de error si se proporciona
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo,
          this.handleRetry
        );
      }

      // UI de fallback por defecto
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          onCopyDetails={this.copyErrorDetails}
          showDetails={isDevelopment()}
        />
      );
    }

    return this.props.children;
  }
}

// ==========================================
// UI DE FALLBACK POR DEFECTO
// ==========================================

const ErrorFallbackUI = ({ 
  error, 
  errorId, 
  onRetry, 
  onReload, 
  onCopyDetails, 
  showDetails 
}) => {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Icono de error */}
        <div style={styles.iconContainer}>
          <div style={styles.icon}>⚠️</div>
        </div>

        {/* Mensaje principal */}
        <h1 style={styles.title}>
          Algo salió mal
        </h1>
        
        <p style={styles.message}>
          Ha ocurrido un error inesperado en la aplicación. 
          Puedes intentar recargar la página o contactar soporte si el problema persiste.
        </p>

        {/* ID del error */}
        {errorId && (
          <p style={styles.errorId}>
            ID del error: <code style={styles.code}>{errorId}</code>
          </p>
        )}

        {/* Botones de acción */}
        <div style={styles.actions}>
          <button 
            onClick={onRetry}
            style={{...styles.button, ...styles.primaryButton}}
          >
            Intentar nuevamente
          </button>
          
          <button 
            onClick={onReload}
            style={{...styles.button, ...styles.secondaryButton}}
          >
            Recargar página
          </button>

          {showDetails && (
            <button 
              onClick={onCopyDetails}
              style={{...styles.button, ...styles.tertiaryButton}}
            >
              Copiar detalles
            </button>
          )}
        </div>

        {/* Detalles técnicos (solo en desarrollo) */}
        {showDetails && error && (
          <details style={styles.details}>
            <summary style={styles.detailsSummary}>
              Detalles técnicos
            </summary>
            <div style={styles.errorDetails}>
              <p><strong>Error:</strong> {error.message}</p>
              <pre style={styles.stack}>
                {error.stack}
              </pre>
            </div>
          </details>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Si el problema persiste, contacta al soporte técnico
          </p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// ESTILOS INLINE (para evitar dependencias)
// ==========================================

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  content: {
    maxWidth: '500px',
    textAlign: 'center',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0'
  },
  iconContainer: {
    marginBottom: '24px'
  },
  icon: {
    fontSize: '48px',
    display: 'inline-block'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '16px',
    margin: '0 0 16px 0'
  },
  message: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: 1.5,
    marginBottom: '24px',
    margin: '0 0 24px 0'
  },
  errorId: {
    fontSize: '14px',
    color: '#9ca3af',
    marginBottom: '32px',
    margin: '0 0 32px 0'
  },
  code: {
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '32px'
  },
  button: {
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s'
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    color: 'white'
  },
  secondaryButton: {
    backgroundColor: '#6b7280',
    color: 'white'
  },
  tertiaryButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db'
  },
  details: {
    textAlign: 'left',
    marginTop: '32px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  detailsSummary: {
    cursor: 'pointer',
    fontWeight: '500',
    marginBottom: '12px'
  },
  errorDetails: {
    fontSize: '14px'
  },
  stack: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '12px',
    overflow: 'auto',
    marginTop: '8px',
    fontFamily: 'monospace'
  },
  footer: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb'
  },
  footerText: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0
  }
};

// ==========================================
// HIGHER ORDER COMPONENT (HOC)
// ==========================================

/**
 * HOC para envolver componentes con Error Boundary
 * @param {React.Component} Component - Componente a proteger
 * @param {Object} options - Opciones adicionales
 */
export const withErrorBoundary = (Component, options = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// ==========================================
// HOOK PARA MANEJAR ERRORES
// ==========================================

/**
 * Hook para manejar errores manualmente
 */
export const useErrorHandler = () => {
  const handleError = React.useCallback((error, errorInfo = {}) => {
    // En desarrollo, lanzar el error para que lo capture Error Boundary
    if (isDevelopment()) {
      throw error;
    }

    // En producción, solo loggear
    console.error('Manual error handled:', error, errorInfo);
  }, []);

  return handleError;
};

// ==========================================
// EXPORT POR DEFECTO
// ==========================================

export default ErrorBoundary;