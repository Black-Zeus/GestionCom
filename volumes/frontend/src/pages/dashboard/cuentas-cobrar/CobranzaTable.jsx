// CobranzaTable.jsx
import React from 'react';

const CobranzaTable = ({ clientes }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Clientes Prioritarios para Cobranza</div>
      {clientes.map((cliente, index) => (
        <div key={index} className="table-row">
          <span>{cliente.descripcion}</span>
          <span>{cliente.accion}</span>
        </div>
      ))}
    </div>
  );
};

export default CobranzaTable;