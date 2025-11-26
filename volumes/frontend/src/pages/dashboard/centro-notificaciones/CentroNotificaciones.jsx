// CentroNotificaciones.jsx
import React, { useState } from 'react';
import MetricCard from './MetricCard';
import AlertasTable from './AlertasTable';
import TareasTable from './TareasTable';
import AprobacionesTable from './AprobacionesTable';
import data from './data.json';
import './CentroNotificaciones.css';

const CentroNotificaciones = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="section">
      <div className="section-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>🔔 CENTRO DE NOTIFICACIONES</span>
        <span className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
      </div>
      <div className={`section-content ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="subsection">
          <div className="subsection-title">Alertas Críticas</div>
          <AlertasTable alertas={data.criticas} tipo="criticas" />
        </div>

        <div className="subsection">
          <div className="subsection-title">Alertas de Advertencia</div>
          <AlertasTable alertas={data.advertencias} tipo="advertencias" />
        </div>

        <div className="subsection">
          <div className="subsection-title">Tareas Pendientes</div>
          <TareasTable tareas={data.tareas} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Aprobaciones Requeridas</div>
          <AprobacionesTable aprobaciones={data.aprobaciones} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Configuración de Alertas</div>
          <div className="grid grid-4">
            {data.configuracion.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CentroNotificaciones;