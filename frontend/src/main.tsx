import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installCspProbe } from './lib/cspProbe.ts'
import config from './config/config'
import { installBrowserLogger } from './lib/browserLogger.ts'

installCspProbe()
installBrowserLogger({
  endpoint: `${config.API_URL}browser-logs`,
})

createRoot(document.getElementById('root')!).render(
  <App />
)
