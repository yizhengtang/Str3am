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
      <WalletProvider>
        <App />
        <ToastContainer position="bottom-right" />
      </WalletProvider>
    </BrowserRouter>
  </React.StrictMode>
); 