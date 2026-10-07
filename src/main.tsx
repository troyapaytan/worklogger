import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './minecraft_textures.css'
import './generated_textures.css'
import App from './App'
import { ToastProvider } from './components/Toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
