// MovimientosTable.jsx
import React from 'react';

const MovimientosTable = ({ movimientos }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Últimos Movimientos de Efectivo</div>
      {movimientos.map((movimiento, index) => (
        <div key={index} className="table-row">
          <span>{movimiento.descripcion}</span>
          <span data-timestamp>{movimiento.hora}</span>
        </div>
      ))}
    </div>
  );
};

export default MovimientosTable;