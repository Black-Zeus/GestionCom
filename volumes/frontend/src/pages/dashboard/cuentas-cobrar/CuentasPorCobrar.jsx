// CuentasPorCobrar.jsx
import React, { useState } from 'react';
import MetricCard from './MetricCard';
import CobranzaTable from './CobranzaTable';
import PagosTable from './PagosTable';
import data from './data.json';
import './CuentasPorCobrar.css';

const CuentasPorCobrar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="section">
      <div className="section-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>💳 CUENTAS POR COBRAR</span>
        <span className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
      </div>
      <div className={`section-content ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="subsection">
          <div className="subsection-title">Estado General de Cartera</div>
          <div className="grid grid-4">
            {data.estadoCartera.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Antigüedad de Saldos (Aging)</div>
          <div className="grid grid-4">
            {data.aging.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Cobranza y Seguimiento</div>
          <CobranzaTable clientes={data.cobranza} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Pagos Recibidos Hoy</div>
          <PagosTable pagos={data.pagos} />
        </div>
      </div>
    </div>
  );
};

export default CuentasPorCobrar;