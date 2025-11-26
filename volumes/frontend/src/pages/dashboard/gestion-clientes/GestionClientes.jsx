// GestionClientes.jsx
import React, { useState } from 'react';
import MetricCard from './MetricCard';
import CreditoTable from './CreditoTable';
import data from './data.json';
import './GestionClientes.css';

const GestionClientes = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="section">
      <div className="section-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>👥 GESTIÓN DE CLIENTES</span>
        <span className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
      </div>
      <div className={`section-content ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="subsection">
          <div className="subsection-title">Resumen de Clientes</div>
          <div className="grid grid-4">
            {data.resumen.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Segmentación de Clientes</div>
          <div className="grid grid-3">
            {data.segmentacion.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Límites de Crédito</div>
          <CreditoTable alertas={data.creditoAlertas} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Análisis de Comportamiento</div>
          <div className="grid grid-2">
            {data.comportamiento.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestionClientes;