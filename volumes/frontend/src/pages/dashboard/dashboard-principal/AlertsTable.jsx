// AlertsTable.jsx
import React from 'react';

const AlertsTable = ({ alerts }) => {
  return (
    <div className="table-mockup">
      <div className="table-header">Alertas del Sistema</div>
      {alerts.map((alert, index) => (
        <div key={index} className="table-row">
          <span>
            <span className={`status-indicator status-${alert.status}`}></span>
            {alert.message}
          </span>
          <span>{alert.time}</span>
        </div>
      ))}
    </div>
  );
};

export default AlertsTable;