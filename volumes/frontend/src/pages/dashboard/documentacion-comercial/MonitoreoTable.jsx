// MonitoreoTable.jsx
import React from 'react';

const MonitoreoTable = ({ estados }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Monitoreo Facturación Electrónica</div>
      {estados.map((estado, index) => (
        <div key={index} className="table-row">
          <span>
            <span className={`status-indicator status-${estado.status}`}></span>
            {estado.descripcion}
          </span>
          <span>{estado.detalle}</span>
        </div>
      ))}
    </div>
  );
};

export default MonitoreoTable;