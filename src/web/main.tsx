import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import App from './App';
import { HealthCheckProvider } from './contexts/HealthCheckContext';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <HealthCheckProvider>
      <App />
    </HealthCheckProvider>
  </React.StrictMode>
);
