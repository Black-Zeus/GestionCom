// TransaccionesTable.jsx
import React from 'react';

const TransaccionesTable = ({ transacciones }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Transacciones Activas</div>
      {transacciones.map((transaccion, index) => (
        <div key={index} className="table-row">
          <span>{transaccion.descripcion}</span>
          <span>{transaccion.estado}</span>
        </div>
      ))}
    </div>
  );
};

export default TransaccionesTable;