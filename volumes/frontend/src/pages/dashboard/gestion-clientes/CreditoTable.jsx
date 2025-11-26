// CreditoTable.jsx
import React from 'react';

const CreditoTable = ({ alertas }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Alertas de Crédito</div>
      {alertas.map((alerta, index) => (
        <div key={index} className="table-row">
          <span>
            <span className={`status-indicator status-${alerta.status}`}></span>
            {alerta.mensaje}
          </span>
          <span>{alerta.accion}</span>
        </div>
      ))}
    </div>
  );
};

export default CreditoTable;