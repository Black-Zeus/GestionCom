// ReabastecimientoTable.jsx
import React from 'react';

const ReabastecimientoTable = ({ productos }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Productos para Reordenar</div>
      {productos.map((producto, index) => (
        <div key={index} className="table-row">
          <span>{producto.descripcion}</span>
          <span>{producto.accion}</span>
        </div>
      ))}
    </div>
  );
};

export default ReabastecimientoTable;