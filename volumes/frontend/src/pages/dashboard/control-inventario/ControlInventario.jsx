// ControlInventario.jsx
import React, { useState } from 'react';
import MetricCard from './MetricCard';
import MovimientosTable from './MovimientosTable';
import ReabastecimientoTable from './ReabastecimientoTable';
import data from './data.json';
import './ControlInventario.css';

const ControlInventario = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="section">
      <div className="section-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>📊 CONTROL DE INVENTARIO</span>
        <span className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
      </div>
      <div className={`section-content ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="subsection">
          <div className="subsection-title">Estado General del Stock</div>
          <div className="grid grid-4">
            {data.estadoGeneral.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Movimientos en Tiempo Real</div>
          <MovimientosTable movimientos={data.movimientos} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Sugerencias de Reabastecimiento</div>
          <ReabastecimientoTable productos={data.reabastecimiento} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Control de Lotes y Vencimientos</div>
          <div className="grid grid-2">
            {data.lotes.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Análisis ABC y Rotación</div>
          <div className="grid grid-3">
            {data.analisisABC.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlInventario;