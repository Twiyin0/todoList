import { createApp } from './app'
import { runMigrations } from './database/migrations'
import { config } from './config'

runMigrations()

const app = createApp()
const isProduction = process.env.NODE_ENV === 'production'
const port = isProduction ? config.port : config.devPort

app.listen(port, config.host, () => {
  console.log(`Server running at http://${config.host}:${port}`)
})
