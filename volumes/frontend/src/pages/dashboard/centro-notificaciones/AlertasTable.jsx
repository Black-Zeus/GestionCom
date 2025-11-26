// AlertasTable.jsx
import React from 'react';

const AlertasTable = ({ alertas, tipo }) => {
  const titulo = tipo === 'criticas' ? 'Requieren Acción Inmediata' : 'Requieren Atención Próxima';
  
  return (
    <div className="table-mockup">
      <div className="table-header">{titulo}</div>
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

export default AlertasTable;