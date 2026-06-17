import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Disable ApexCharts animations globally to prevent "Cannot read properties of null"
// race condition when lazy-loaded chart components unmount before animation frame runs.
window.Apex = { chart: { animations: { enabled: false } } };

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
