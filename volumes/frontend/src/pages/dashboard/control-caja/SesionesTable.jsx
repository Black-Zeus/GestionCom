// SesionesTable.jsx
import React from 'react';

const SesionesTable = ({ sesiones }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Cajeros en Turno</div>
      {sesiones.map((sesion, index) => (
        <div key={index} className="table-row">
          <span>{sesion.cajero}</span>
          <span>{sesion.estado}</span>
        </div>
      ))}
    </div>
  );
};

export default SesionesTable;