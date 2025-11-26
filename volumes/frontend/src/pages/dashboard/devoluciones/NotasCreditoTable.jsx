// NotasCreditoTable.jsx
import React from 'react';

const NotasCreditoTable = ({ notas }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Últimas Notas de Crédito</div>
      {notas.map((nota, index) => (
        <div key={index} className="table-row">
          <span>{nota.descripcion}</span>
          <span>{nota.estado}</span>
        </div>
      ))}
    </div>
  );
};

export default NotasCreditoTable;