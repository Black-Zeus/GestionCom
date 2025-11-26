// PagosTable.jsx
import React from 'react';

const PagosTable = ({ pagos }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Últimos Pagos Procesados</div>
      {pagos.map((pago, index) => (
        <div key={index} className="table-row">
          <span>{pago.descripcion}</span>
          <span>{pago.estado}</span>
        </div>
      ))}
    </div>
  );
};

export default PagosTable;