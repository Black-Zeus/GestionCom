// DashboardPrincipal.jsx
import React, { useState } from 'react';
import MetricCard from './MetricCard';
import AlertsTable from './AlertsTable';
import data from './data.json';
import './DashboardPrincipal.css';

const DashboardPrincipal = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="section">
      <div className="section-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>📊 DASHBOARD PRINCIPAL</span>
        <span className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
      </div>
      <div className={`section-content ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="grid grid-4">
          {data.metrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>
        
        <div className="subsection">
          <div className="subsection-title">Alertas Críticas</div>
          <AlertsTable alerts={data.alerts} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPrincipal;