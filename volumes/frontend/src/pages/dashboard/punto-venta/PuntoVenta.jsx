// PuntoVenta.jsx
import React, { useState } from 'react';
import MetricCard from './MetricCard';
import TransaccionesTable from './TransaccionesTable';
import data from './data.json';
import './PuntoVenta.css';

const PuntoVenta = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="section">
      <div className="section-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>💰 PUNTO DE VENTA</span>
        <span className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
      </div>
      <div className={`section-content ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="subsection">
          <div className="subsection-title">Terminales Activos</div>
          <div className="grid grid-4">
            {data.terminales.map((terminal, index) => (
              <MetricCard key={index} {...terminal} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Facturación Electrónica (DTE)</div>
          <div className="grid grid-3">
            {data.facturacion.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Ventas en Proceso</div>
          <TransaccionesTable transacciones={data.transacciones} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Métodos de Pago del Día</div>
          <div className="grid grid-4">
            {data.metodosPago.map((metodo, index) => (
              <MetricCard key={index} {...metodo} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PuntoVenta;