// MetricCard.jsx
import React from 'react';

const MetricCard = ({ title, value, subtitle }) => {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="metric">{value}</div>
      {subtitle && <small>{subtitle}</small>}
    </div>
  );
};

export default MetricCard;