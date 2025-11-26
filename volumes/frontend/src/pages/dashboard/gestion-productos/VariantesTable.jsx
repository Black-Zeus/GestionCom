// VariantesTable.jsx
import React from 'react';

const VariantesTable = ({ variantes }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Productos con Múltiples Variantes</div>
      {variantes.map((variante, index) => (
        <div key={index} className="table-row">
          <span>{variante.producto}</span>
          <span>{variante.accion}</span>
        </div>
      ))}
    </div>
  );
};

export default VariantesTable;