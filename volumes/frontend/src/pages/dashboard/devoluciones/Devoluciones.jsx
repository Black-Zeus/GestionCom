// Devoluciones.jsx
import React, { useState } from 'react';
import MetricCard from './MetricCard';
import DevolucionesTable from './DevolucionesTable';
import NotasCreditoTable from './NotasCreditoTable';
import data from './data.json';
import './Devoluciones.css';

const Devoluciones = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="section">
      <div className="section-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>🔄 DEVOLUCIONES</span>
        <span className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
      </div>
      <div className={`section-content ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="subsection">
          <div className="subsection-title">Resumen de Devoluciones</div>
          <div className="grid grid-4">
            {data.resumen.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Motivos de Devolución</div>
          <div className="grid grid-3">
            {data.motivos.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Devoluciones en Proceso</div>
          <DevolucionesTable devoluciones={data.proceso} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Notas de Crédito Generadas</div>
          <NotasCreditoTable notas={data.notasCredito} />
        </div>
      </div>
    </div>
  );
};

export default Devoluciones;