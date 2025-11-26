// ReporteriaAnalisis.jsx
import React, { useState } from 'react';
import MetricCard from './MetricCard';
import VendedoresTable from './VendedoresTable';
import ProductosCards from './ProductosCards';
import data from './data.json';
import './ReporteriaAnalisis.css';

const ReporteriaAnalisis = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="section">
      <div className="section-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>📈 REPORTERÍA Y ANÁLISIS</span>
        <span className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
      </div>
      <div className={`section-content ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="subsection">
          <div className="subsection-title">Reportes de Ventas</div>
          <div className="grid grid-4">
            {data.ventas.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Análisis de Inventario</div>
          <div className="grid grid-3">
            {data.inventario.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Rendimiento por Vendedor</div>
          <VendedoresTable vendedores={data.vendedores} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Productos Más/Menos Vendidos</div>
          <ProductosCards topProductos={data.topProductos} rezagados={data.rezagados} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Análisis Financiero</div>
          <div className="grid grid-4">
            {data.financiero.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Exportación de Reportes</div>
          <div className="grid grid-3">
            {data.exportacion.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReporteriaAnalisis;