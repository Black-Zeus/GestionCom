// ControlCaja.jsx
import React, { useState } from 'react';
import MetricCard from './MetricCard';
import SesionesTable from './SesionesTable';
import MovimientosTable from './MovimientosTable';
import data from './data.json';
import './ControlCaja.css';

const ControlCaja = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="section">
      <div className="section-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>💵 CONTROL DE CAJA</span>
        <span className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
      </div>
      <div className={`section-content ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="subsection">
          <div className="subsection-title">Estado de Cajas</div>
          <div className="grid grid-4">
            {data.estadoCajas.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Sesiones Activas</div>
          <SesionesTable sesiones={data.sesiones} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Movimientos en Tiempo Real</div>
          <MovimientosTable movimientos={data.movimientos} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Caja Chica y Gastos</div>
          <div className="grid grid-3">
            {data.cajaChica.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Conciliación Diaria</div>
          <div className="grid grid-2">
            {data.conciliacion.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlCaja;