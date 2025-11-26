// AprobacionesTable.jsx
import React from 'react';

const AprobacionesTable = ({ aprobaciones }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Pendientes de Autorización</div>
      {aprobaciones.map((aprobacion, index) => (
        <div key={index} className="table-row">
          <span>{aprobacion.descripcion}</span>
          <span>{aprobacion.accion}</span>
        </div>
      ))}
    </div>
  );
};

export default AprobacionesTable;