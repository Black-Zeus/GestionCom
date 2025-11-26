// PendientesTable.jsx
import React from 'react';

const PendientesTable = ({ pendientes }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Requieren Atención</div>
      {pendientes.map((pendiente, index) => (
        <div key={index} className="table-row">
          <span>{pendiente.descripcion}</span>
          <span>{pendiente.accion}</span>
        </div>
      ))}
    </div>
  );
};

export default PendientesTable;