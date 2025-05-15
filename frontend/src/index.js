import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { Buffer } from 'buffer';
import { WalletProvider } from './contexts/WalletContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Required for Solana
window.Buffer = Buffer;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <div data-theme="cinema" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-base-content">
        <WalletProvider>
          <App />
          <ToastContainer position="bottom-right" />
        </WalletProvider>
      </div>
    </BrowserRouter>
  </React.StrictMode>
); 