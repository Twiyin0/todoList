import 'dotenv/config'
import http from 'http'
import { createApp } from './app'
import { runMigrations } from './database/migrations'
import { config } from './config'
import { setupWebSocket } from './collab/websocket'

async function main() {
  await runMigrations()

  const app = createApp()
  const isProduction = process.env.NODE_ENV === 'production'
  const port = isProduction ? config.port : config.devPort

  const server = http.createServer(app)

  if (config.collabMode === 'websocket') {
    setupWebSocket(server)
    console.log('WebSocket collab enabled')
  }

  server.listen(port, config.host, () => {
    console.log(`Server running at http://${config.host}:${port}`)
  })
}

main().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
