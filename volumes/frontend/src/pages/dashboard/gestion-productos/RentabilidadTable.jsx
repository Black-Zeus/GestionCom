// RentabilidadTable.jsx
import React from 'react';

const RentabilidadTable = ({ productos }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Top 5 Productos Más Rentables</div>
      {productos.map((producto, index) => (
        <div key={index} className="table-row">
          <span>{producto.nombre}</span>
          <span>{producto.valor}</span>
        </div>
      ))}
    </div>
  );
};

export default RentabilidadTable;