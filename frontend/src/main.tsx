import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installCspProbe } from './security/cspProbe'
import config from './config/config'
import { installBrowserLogger } from './logging/browserLogger'

installCspProbe()
installBrowserLogger({
  endpoint: `${config.API_URL}browser-logs`,
})

createRoot(document.getElementById('root')!).render(
  <App />
)
