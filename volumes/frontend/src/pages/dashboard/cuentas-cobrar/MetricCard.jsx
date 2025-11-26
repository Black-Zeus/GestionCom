// MetricCard.jsx
import React from 'react';

const MetricCard = ({ title, value, subtitle, status }) => {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="metric">{value}</div>
      {subtitle && <small>{subtitle}</small>}
      {status && <small className={`status-indicator status-${status}`}></small>}
    </div>
  );
};

export default MetricCard;