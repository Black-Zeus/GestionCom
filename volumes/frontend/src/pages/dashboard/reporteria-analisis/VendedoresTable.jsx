// VendedoresTable.jsx
import React from 'react';

const VendedoresTable = ({ vendedores }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Top 5 Vendedores del Mes</div>
      {vendedores.map((vendedor, index) => (
        <div key={index} className="table-row">
          <span>{vendedor.descripcion}</span>
          <span>{vendedor.meta}</span>
        </div>
      ))}
    </div>
  );
};

export default VendedoresTable;