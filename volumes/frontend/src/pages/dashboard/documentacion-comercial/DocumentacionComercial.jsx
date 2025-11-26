// DocumentacionComercial.jsx
import React, { useState } from 'react';
import MetricCard from './MetricCard';
import MonitoreoTable from './MonitoreoTable';
import PendientesTable from './PendientesTable';
import data from './data.json';
import './DocumentacionComercial.css';

const DocumentacionComercial = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="section">
      <div className="section-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>📋 DOCUMENTACIÓN COMERCIAL</span>
        <span className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
      </div>
      <div className={`section-content ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="subsection">
          <div className="subsection-title">Estado de Series y Folios</div>
          <div className="grid grid-4">
            {data.seriesFolios.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Documentos Emitidos Hoy</div>
          <div className="grid grid-3">
            {data.emitidos.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Estado SII y Contingencia</div>
          <MonitoreoTable estados={data.monitoreo} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Documentos Pendientes</div>
          <PendientesTable pendientes={data.pendientes} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Trazabilidad de Documentos</div>
          <div className="grid grid-2">
            {data.trazabilidad.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentacionComercial;