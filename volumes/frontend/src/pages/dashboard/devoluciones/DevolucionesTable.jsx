// DevolucionesTable.jsx
import React from 'react';

const DevolucionesTable = ({ devoluciones }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Pendientes de Autorización</div>
      {devoluciones.map((devolucion, index) => (
        <div key={index} className="table-row">
          <span>{devolucion.descripcion}</span>
          <span>{devolucion.estado}</span>
        </div>
      ))}
    </div>
  );
};

export default DevolucionesTable;