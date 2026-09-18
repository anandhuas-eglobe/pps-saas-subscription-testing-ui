import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext'
import { ServerThemeProvider } from './theme/ServerThemeProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServerThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <App />
      </AuthProvider>
    </ServerThemeProvider>
  </StrictMode>,
)
