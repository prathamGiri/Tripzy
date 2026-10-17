import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { TripProvider } from './state/TripContext'
import { ToastProvider } from './components/Toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <TripProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </TripProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
