// src/App.jsx
import React, { useEffect } from "react";
import { AppRouter } from "@/routes";
import ErrorBoundary from "@/components/ErrorBoundary";
import ToasterManager from "@/components/common/toast/ToasterManager";
import { startSessionAutoRefresh } from "@/services/sessionRefresher";

const App = () => {
  useEffect(() => {
    // Programa un refresh automático cerca del vencimiento del access token.
    // Ajusta los parámetros según tu política de expiración.
    const stop = startSessionAutoRefresh({
      leadPercent: 0.10,   // refrescar ~10% antes de expirar
      minLeadSeconds: 120, // al menos 120s antes (protege contra latencias)
      skewSeconds: 5,      // margen de seguridad
      minTTLSeconds: 120,  // si faltan <= 120s, forzar refresh en reconnectSessionSilent
      bindWindowListeners: true, // reprograma al volver a foco/online
    });

    return () => stop(); // cleanup al desmontar
  }, []);

  return (
    <ErrorBoundary>
      <AppRouter />
      <ToasterManager />
    </ErrorBoundary>
  );
};

export default App;
