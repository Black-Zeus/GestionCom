// GestionProductos.jsx
import React, { useState } from 'react';
import MetricCard from './MetricCard';
import VariantesTable from './VariantesTable';
import RentabilidadTable from './RentabilidadTable';
import data from './data.json';
import './GestionProductos.css';

const GestionProductos = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="section">
      <div className="section-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>📦 GESTIÓN DE PRODUCTOS</span>
        <span className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
      </div>
      <div className={`section-content ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="subsection">
          <div className="subsection-title">Catálogo y Búsqueda</div>
          <div className="grid grid-3">
            {data.catalogo.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Gestión de Variantes</div>
          <VariantesTable variantes={data.variantes} />
        </div>

        <div className="subsection">
          <div className="subsection-title">Códigos de Barras y Precios</div>
          <div className="grid grid-2">
            {data.codigosPrecios.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Análisis de Rentabilidad</div>
          <RentabilidadTable productos={data.rentabilidad} />
        </div>
      </div>
    </div>
  );
};

export default GestionProductos;